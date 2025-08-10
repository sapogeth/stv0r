import React, { useState, useEffect } from 'react';
import { useCurrentAccount, useSignAndExecuteTransaction } from '@mysten/dapp-kit';
import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { MarketplaceListing, NicknameNFT } from '../types/user';
import {
    getActiveListings,
    getMarketplaceStats,
    buyNicknameWithKiosk,
    getUserNFTs,
    createListingWithKiosk,
    cancelListingWithKiosk,
    createSecureNicknameNFT,
} from '../services/marketplaceService';
import {
    getMockMarketplaceListings,
    getMockUserNFTs,
    getMockMarketplaceStats,
    simulateBuyNFT,
    simulateListNFT,
    createMockNFT
} from '../services/mockNFTService';
import { CONTRACTS } from '../config/contracts';
import '../styles/Marketplace.css';
import { WALRUS_AGGREGATOR_URL } from '../services/walrus';
import { decryptData } from '../utils/crypto';

// Initialize SuiClient for testnet
const client = new SuiClient({ url: CONTRACTS.RPC_URL });

const Marketplace: React.FC = () => {
    const [listings, setListings] = useState<MarketplaceListing[]>([]);
    const [userNFTs, setUserNFTs] = useState<NicknameNFT[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'my-nfts'>('buy');
    const [sellPrice, setSellPrice] = useState<string>('');
    const [selectedNFT, setSelectedNFT] = useState<NicknameNFT | null>(null);
    const [loading, setLoading] = useState(false);
    const [newNickname, setNewNickname] = useState('');
    const [useMockData, setUseMockData] = useState(true); // Switch for test data
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    const account = useCurrentAccount();
    const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

    useEffect(() => {
        loadMarketplaceData();
    }, [account, useMockData]);
    

    const checkPassword = async () => {
        const blobId = localStorage.getItem('blobId');
        if (!blobId) {
            setError('Password not set. Go to the settings page.');
            return;
        }
        try {
            const response = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`);
            if (response.status === 200) {
                const storageData = await response.json();
                const decryptedData = await decryptData(
                    new Uint8Array(storageData.encryptedData),
                    password,
                    new Uint8Array(storageData.salt),
                    new Uint8Array(storageData.iv)
                );
                if (decryptedData === 'access_granted') {
                    setIsAuthorized(true);
                    setError(null);
                } else {
                    setError('Incorrect password');
                }
            } else {
                setError('Error downloading blob');
            }
        } catch (error) {
            setError('Error loading or decrypting data');
        }
    };

    const loadMarketplaceData = async () => {
        setLoading(true);
        try {
            if (useMockData) {
                // Load mock data
                const mockListings = await getMockMarketplaceListings();
                const mockStats = await getMockMarketplaceStats();

                setListings(mockListings);
                setStats(mockStats);

                if (account?.address) {
                    const mockUserNFTs = await getMockUserNFTs(account.address);
                    setUserNFTs(mockUserNFTs);
                }
            } else {
                // Load real data (when contracts are deployed)
                if (CONTRACTS.areContractsDeployed()) {
                    const activeListings = await getActiveListings();
                    const marketStats = await getMarketplaceStats();
                    setListings(activeListings);
                    setStats(marketStats);

                    if (account?.address) {
                        const nfts = await getUserNFTs(account.address);
                        setUserNFTs(nfts);
                    }
                } else {
                    // Fallback to mock data if contracts are not deployed
                    setUseMockData(true);
                    return;
                }
            }
        } catch (error) {
            console.error('Error loading marketplace data:', error);
            // Switch to mock data on error
            if (!useMockData) {
                setUseMockData(true);
            }
        } finally {
            setLoading(false);
        }
    };

    const requestTestnetSui = async () => {
        if (!account?.address) {
            alert('Connect your wallet');
            return;
        }
        try {
            await client.requestSuiFromFaucet({ recipient: account.address });
            alert('Testnet SUI successfully requested');
        } catch (error) {
            console.error('Error requesting testnet SUI:', error);
            alert('Failed to request testnet SUI');
        }
    };

    const serializeTransaction = (tx: TransactionBlock): Uint8Array => {
        return tx.serialize();
    };

    const getPaymentCoinId = async (price: number): Promise<string | null> => {
        if (!account?.address) return null;

        try {
            const balance = await client.getBalance({
                owner: account.address,
                coinType: '0x2::sui::SUI'
            });

            const requiredAmount = price * 1_000_000_000; // Convert SUI to MIST

            if (parseInt(balance.totalBalance) >= requiredAmount) {
                // In a real application, you would need to find a specific coin object here
                return 'mock_coin_id';
            }

            return null;
        } catch (error) {
            console.error('Error checking balance:', error);
            return null;
        }
    };

    const handleBuyNickname = async (listing: MarketplaceListing) => {
        if (!account?.address) {
            alert('Connect your wallet');
            return;
        }

        setLoading(true);
        try {
            if (useMockData) {
                // Simulate purchase with mock data
                const success = await simulateBuyNFT(listing.tokenId, account.address);

                if (success) {
                    alert(`Nickname "${listing.nickname}" purchased successfully!`);
                    loadMarketplaceData();
                } else {
                    alert('Error purchasing nickname');
                }
            } else {
                // Real purchase via blockchain
                const paymentCoinId = await getPaymentCoinId(listing.price);
                if (!paymentCoinId) {
                    alert('Insufficient SUI for purchase. Request testnet SUI.');
                    return;
                }

                const { success, tx } = await buyNicknameWithKiosk(listing.id, account.address, paymentCoinId);

                if (success && tx) {
                    await signAndExecute({
                        transaction: serializeTransaction(tx),
                        chain: 'sui:testnet',
                    });

                    alert(`Nickname "${listing.nickname}" purchased successfully!`);
                    loadMarketplaceData();
                } else {
                    alert('Error purchasing nickname');
                }
            }
        } catch (error: any) {
            console.error('Purchase error:', error);
            alert('Error purchasing nickname: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleSellNickname = async (realTokenId: string, nickname: string, price: number) => {
        if (!account?.address) {
            alert('Connect your wallet');
            return;
        }

        setLoading(true);
        try {
            if (useMockData) {
                // Simulate sale with mock data
                const success = await simulateListNFT(realTokenId, price);

                if (success) {
                    alert(`Nickname "${nickname}" listed for sale for ${price} SUI`);
                    setSelectedNFT(null);
                    setSellPrice('');
                    loadMarketplaceData();
                } else {
                    alert('Error listing for sale');
                }
            } else {
                // Real sale via blockchain
                if (!realTokenId) {
                    alert('Error: Token ID is not defined.');
                    return;
                }

                const { listing, tx } = await createListingWithKiosk(
                    realTokenId,
                    nickname,
                    account.address,
                    price
                );

                if (tx) {
                    await signAndExecute({
                        transaction: serializeTransaction(tx),
                        chain: 'sui:testnet',
                    });

                    alert(`Nickname "${nickname}" listed for sale for ${price} SUI`);
                    setSelectedNFT(null);
                    setSellPrice('');
                    loadMarketplaceData();
                }
            }
        } catch (error: any) {
            console.error('Sale error:', error);
            alert('Error listing for sale: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleMintAndSell = async () => {
        if (!account?.address || !newNickname || !sellPrice) {
            alert('Connect wallet, enter a nickname, and specify a price');
            return;
        }

        setLoading(true);
        try {
            if (useMockData) {
                // Create a mock NFT
                const newNFT = await createMockNFT(newNickname, account.address);

                // Immediately list it for sale
                const success = await simulateListNFT(newNFT.tokenId, parseFloat(sellPrice));

                if (success) {
                    alert(`Nickname "${newNickname}" created and listed for sale for ${sellPrice} SUI`);
                    setNewNickname('');
                    setSellPrice('');
                    loadMarketplaceData();
                } else {
                    alert('Error listing for sale');
                }
            } else {
                // Real mint and sale via blockchain
                const mintTx = await createSecureNicknameNFT(newNickname, account.address);

                const mintResult = await signAndExecute({
                    transaction: serializeTransaction(mintTx),
                    chain: 'sui:testnet',
                });

                const createdObject = mintResult.objectChanges?.find(
                    (change: any) => change.type === 'created' && change.objectType.includes('nickname_nft::NicknameNFT')
                );

                if (!createdObject) {
                    throw new Error('Failed to get the ID of the created NFT.');
                }

                const realTokenId = (createdObject as any).objectId;
                await handleSellNickname(realTokenId, newNickname, parseFloat(sellPrice));
            }
        } catch (error: any) {
            console.error('Error in mint and sell process:', error);
            alert('Error in mint and sell process: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };

    const handleCancelListing = async (listing: MarketplaceListing) => {
        if (!account?.address) {
            alert('Connect your wallet');
            return;
        }

        setLoading(true);
        try {
            if (useMockData) {
                // Simulate listing cancellation
                const nftIndex = userNFTs.findIndex(nft => nft.tokenId === listing.tokenId);
                if (nftIndex !== -1) {
                    userNFTs[nftIndex].isForSale = false;
                    userNFTs[nftIndex].price = undefined;
                    alert(`Listing for "${listing.nickname}" successfully canceled.`);
                    loadMarketplaceData();
                }
            } else {
                // Real cancellation via blockchain
                const { success, tx } = await cancelListingWithKiosk(listing.id, account.address);

                if (success && tx) {
                    await signAndExecute({
                        transaction: serializeTransaction(tx),
                        chain: 'sui:testnet',
                    });

                    alert(`Listing for "${listing.nickname}" successfully canceled.`);
                    loadMarketplaceData();
                } else {
                    alert('Error canceling listing');
                }
            }
        } catch (error: any) {
            console.error('Error canceling listing:', error);
            alert('Error canceling listing: ' + (error.message || 'Unknown error'));
        } finally {
            setLoading(false);
        }
    };


    if (isAuthorized) {
    return (
        <div className="marketplace-container">
            <div className="marketplace-header">
                <h1 className="marketplace-title">NFT Nickname Marketplace</h1>

                <div className="marketplace-controls">
                    <div className="data-mode-toggle">
                        <label>
                            <input
                                type="checkbox"
                                checked={useMockData}
                                onChange={(e) => setUseMockData(e.target.checked)}
                            />
                            Test Data
                        </label>
                    </div>

                    <button className="sui-faucet-button" onClick={requestTestnetSui} disabled={!account}>
                        Request Testnet SUI
                    </button>
                </div>

                {stats && (
                    <div className="marketplace-stats">
                        <div className="stat-item">
                            <span className="stat-label">Total NFTs:</span>
                            <span className="stat-value">{stats.totalNFTs}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">For Sale:</span>
                            <span className="stat-value">{stats.nftsForSale}</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Floor Price:</span>
                            <span className="stat-value">{stats.floorPrice} SUI</span>
                        </div>
                        <div className="stat-item">
                            <span className="stat-label">Total Volume:</span>
                            <span className="stat-value">{stats.totalVolume} SUI</span>
                        </div>
                    </div>
                )}
            </div>

            <div className="tab-buttons">
                <button onClick={() => setActiveTab('buy')} className={activeTab === 'buy' ? 'active' : ''}>
                    Buy ({listings.length})
                </button>
                <button onClick={() => setActiveTab('sell')} className={activeTab === 'sell' ? 'active' : ''}>
                    Sell
                </button>
                <button onClick={() => setActiveTab('my-nfts')} className={activeTab === 'my-nfts' ? 'active' : ''}>
                    My NFTs ({userNFTs.length})
                </button>
            </div>

            {loading && (
                <div className="loading-overlay">
                    <div className="loading-spinner">Loading...</div>
                </div>
            )}

            {activeTab === 'buy' && (
                <div className="tab-content">
                    <h2>Available Nicknames for Purchase</h2>
                    <div className="listings-grid">
                        {listings.length > 0 ? (
                            listings.map((listing) => (
                                <div key={listing.id} className="listing-card">
                                    <div className="nft-avatar">@{listing.nickname}</div>
                                    <h3>{listing.nickname}</h3>
                                    <div className="listing-details">
                                        <p className="price">💰 {listing.price ? listing.price.toFixed(2) : 'N/A'} SUI</p>
                                        <p className="seller">👤 {listing.seller.slice(0, 6)}...{listing.seller.slice(-4)}</p>
                                        <p className="date">📅 {listing.createdAt.toLocaleDateString()}</p>
                                    </div>
                                    <button
                                        className="buy-button"
                                        onClick={() => handleBuyNickname(listing)}
                                        disabled={loading || listing.seller.toLowerCase() === account?.address?.toLowerCase()}
                                    >
                                        {listing.seller.toLowerCase() === account?.address?.toLowerCase() ? 'Your NFT' : 'Buy'}
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                <p>🛒 No available nicknames for sale</p>
                                <p>Create your own NFT nickname in the "Sell" tab!</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'sell' && (
                <div className="tab-content">
                    <h2>Create and Sell an NFT Nickname</h2>
                    <div className="sell-form">
                        <div className="form-group">
                            <label>Nickname:</label>
                            <input
                                type="text"
                                placeholder="Enter a unique nickname"
                                value={newNickname}
                                onChange={(e) => setNewNickname(e.target.value)}
                                disabled={loading}
                                maxLength={20}
                            />
                            <small>From 3 to 20 characters</small>
                        </div>

                        <div className="form-group">
                            <label>Price in SUI:</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={sellPrice}
                                onChange={(e) => setSellPrice(e.target.value)}
                                disabled={loading}
                                min="0.01"
                                step="0.01"
                            />
                            <small>Minimum price: 0.01 SUI</small>
                        </div>

                        <button
                            className="sell-button primary"
                            onClick={handleMintAndSell}
                            disabled={loading || !newNickname || !sellPrice || newNickname.length < 3}
                        >
                            {loading ? 'Creating...' : 'Create NFT and List for Sale'}
                        </button>
                    </div>
                </div>
            )}

            {activeTab === 'my-nfts' && (
                <div className="tab-content">
                    <h2>My NFT Nicknames</h2>
                    <div className="listings-grid">
                        {userNFTs.length > 0 ? (
                            userNFTs.map((nft) => (
                                <div key={nft.tokenId} className="listing-card my-nft">
                                    <div className="nft-avatar">@{nft.nickname}</div>
                                    <h3>{nft.nickname}</h3>
                                    <div className="listing-details">
                                        <p className="token-id">🆔 {nft.tokenId.slice(0, 8)}...{nft.tokenId.slice(-4)}</p>
                                        <p className="date">📅 {nft.createdAt.toLocaleDateString()}</p>
                                        {nft.lastSalePrice && (
                                            <p className="last-sale">💸 Last sale: {nft.lastSalePrice} SUI</p>
                                        )}
                                    </div>

                                    {nft.isForSale ? (
                                        <div className="sale-info">
                                            <p className="current-price">💰 For sale at {nft.price?.toFixed(2)} SUI</p>
                                            <button
                                                className="cancel-button"
                                                onClick={() => handleCancelListing(nft as MarketplaceListing)}
                                                disabled={loading}
                                            >
                                                Cancel Listing
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            className="sell-button"
                                            onClick={() => setSelectedNFT(nft)}
                                            disabled={loading}
                                        >
                                            List for Sale
                                        </button>
                                    )}
                                </div>
                            ))
                        ) : (
                            <div className="empty-state">
                                <p>🎭 You don't have any NFT nicknames yet</p>
                                <p>Create your first NFT in the "Sell" tab!</p>
                            </div>
                        )}
                    </div>

                    {selectedNFT && (
                        <div className="sell-modal">
                            <div className="modal-content">
                                <h3>List "{selectedNFT.nickname}" for Sale</h3>
                                <div className="form-group">
                                    <label>Price in SUI:</label>
                                    <input
                                        type="number"
                                        placeholder="0.00"
                                        value={sellPrice}
                                        onChange={(e) => setSellPrice(e.target.value)}
                                        disabled={loading}
                                        min="0.01"
                                        step="0.01"
                                    />
                                </div>
                                <div className="modal-actions">
                                    <button
                                        className="sell-button primary"
                                        onClick={() => handleSellNickname(selectedNFT.tokenId, selectedNFT.nickname, parseFloat(sellPrice))}
                                        disabled={loading || !sellPrice || parseFloat(sellPrice) < 0.01}
                                    >
                                        List for Sale
                                    </button>
                                    <button
                                        className="cancel-button"
                                        onClick={() => {
                                            setSelectedNFT(null);
                                            setSellPrice('');
                                        }}
                                        disabled={loading}
                                    >
                                        Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
  }

  return (
    <div>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
      />
      <button onClick={checkPassword}>Verify password</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );


};

export default Marketplace;