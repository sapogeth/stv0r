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

// Инициализация SuiClient для testnet
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
  const [useMockData, setUseMockData] = useState(true); // Переключатель для тестовых данных
  
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  useEffect(() => {
    loadMarketplaceData();
  }, [account, useMockData]);

  const loadMarketplaceData = async () => {
    setLoading(true);
    try {
      if (useMockData) {
        // Загружаем тестовые данные
        const mockListings = await getMockMarketplaceListings();
        const mockStats = await getMockMarketplaceStats();
        
        setListings(mockListings);
        setStats(mockStats);
        
        if (account?.address) {
          const mockUserNFTs = await getMockUserNFTs(account.address);
          setUserNFTs(mockUserNFTs);
        }
      } else {
        // Загружаем реальные данные (когда контракты будут развернуты)
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
          // Fallback на тестовые данные если контракты не развернуты
          setUseMockData(true);
          return;
        }
      }
    } catch (error) {
      console.error('Ошибка загрузки данных маркетплейса:', error);
      // При ошибке переключаемся на тестовые данные
      if (!useMockData) {
        setUseMockData(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const requestTestnetSui = async () => {
    if (!account?.address) {
      alert('Подключите кошелек');
      return;
    }
    try {
      await client.requestSuiFromFaucet({ recipient: account.address });
      alert('Тестовые SUI успешно запрошены');
    } catch (error) {
      console.error('Ошибка запроса тестовых SUI:', error);
      alert('Не удалось запросить тестовые SUI');
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
      
      const requiredAmount = price * 1_000_000_000; // Конвертируем SUI в MIST
      
      if (parseInt(balance.totalBalance) >= requiredAmount) {
        // В реальном приложении здесь нужно найти конкретную монету
        return 'mock_coin_id';
      }
      
      return null;
    } catch (error) {
      console.error('Ошибка проверки баланса:', error);
      return null;
    }
  };

  const handleBuyNickname = async (listing: MarketplaceListing) => {
    if (!account?.address) {
      alert('Подключите кошелек');
      return;
    }
    
    setLoading(true);
    try {
      if (useMockData) {
        // Симулируем покупку с тестовыми данными
        const success = await simulateBuyNFT(listing.tokenId, account.address);
        
        if (success) {
          alert(`Никнейм "${listing.nickname}" успешно куплен!`);
          loadMarketplaceData();
        } else {
          alert('Ошибка при покупке никнейма');
        }
      } else {
        // Реальная покупка через блокчейн
        const paymentCoinId = await getPaymentCoinId(listing.price);
        if (!paymentCoinId) {
          alert('Недостаточно SUI для покупки. Запросите тестовые SUI.');
          return;
        }

        const { success, tx } = await buyNicknameWithKiosk(listing.id, account.address, paymentCoinId);
        
        if (success && tx) {
          await signAndExecute({
            transaction: serializeTransaction(tx),
            chain: 'sui:testnet',
          });
          
          alert(`Никнейм "${listing.nickname}" успешно куплен!`);
          loadMarketplaceData();
        } else {
          alert('Ошибка при покупке никнейма');
        }
      }
    } catch (error) {
      console.error('Ошибка покупки:', error);
      alert('Ошибка при покупке никнейма: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const handleSellNickname = async (realTokenId: string, nickname: string, price: number) => {
    if (!account?.address) {
      alert('Подключите кошелек');
      return;
    }
    
    setLoading(true);
    try {
      if (useMockData) {
        // Симулируем продажу с тестовыми данными
        const success = await simulateListNFT(realTokenId, price);
        
        if (success) {
          alert(`Никнейм "${nickname}" выставлен на продажу за ${price} SUI`);
          setSelectedNFT(null);
          setSellPrice('');
          loadMarketplaceData();
        } else {
          alert('Ошибка при выставлении на продажу');
        }
      } else {
        // Реальная продажа через блокчейн
        if (!realTokenId) {
          alert('Ошибка: ID токена не определен.');
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
          
          alert(`Никнейм "${nickname}" выставлен на продажу за ${price} SUI`);
          setSelectedNFT(null);
          setSellPrice('');
          loadMarketplaceData();
        }
      }
    } catch (error) {
      console.error('Ошибка продажи:', error);
      alert('Ошибка при выставлении на продажу: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const handleMintAndSell = async () => {
    if (!account?.address || !newNickname || !sellPrice) {
      alert('Подключите кошелек, введите никнейм и укажите цену');
      return;
    }
    
    setLoading(true);
    try {
      if (useMockData) {
        // Создаем тестовый NFT
        const newNFT = await createMockNFT(newNickname, account.address);
        
        // Сразу выставляем на продажу
        const success = await simulateListNFT(newNFT.tokenId, parseFloat(sellPrice));
        
        if (success) {
          alert(`Никнейм "${newNickname}" создан и выставлен на продажу за ${sellPrice} SUI`);
          setNewNickname('');
          setSellPrice('');
          loadMarketplaceData();
        } else {
          alert('Ошибка при выставлении на продажу');
        }
      } else {
        // Реальный минт и продажа через блокчейн
        const mintTx = await createSecureNicknameNFT(newNickname, account.address);
        
        const mintResult = await signAndExecute({
          transaction: serializeTransaction(mintTx),
          chain: 'sui:testnet',
        });
        
        const createdObject = mintResult.objectChanges?.find(
          (change) => change.type === 'created' && change.objectType.includes('nickname_nft::NicknameNFT')
        );
        
        if (!createdObject) {
          throw new Error('Не удалось получить ID созданного NFT.');
        }
        
        const realTokenId = createdObject.objectId;
        await handleSellNickname(realTokenId, newNickname, parseFloat(sellPrice));
      }
    } catch (error) {
      console.error('Ошибка в процессе минта и продажи:', error);
      alert('Ошибка в процессе минта и продажи: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelListing = async (listing: MarketplaceListing) => {
    if (!account?.address) {
      alert('Подключите кошелек');
      return;
    }

    setLoading(true);
    try {
      if (useMockData) {
        // Симулируем отмену листинга
        const nftIndex = userNFTs.findIndex(nft => nft.tokenId === listing.tokenId);
        if (nftIndex !== -1) {
          userNFTs[nftIndex].isForSale = false;
          userNFTs[nftIndex].price = undefined;
          alert(`Листинг для "${listing.nickname}" успешно отменен.`);
          loadMarketplaceData();
        }
      } else {
        // Реальная отмена через блокчейн
        const { success, tx } = await cancelListingWithKiosk(listing.id, account.address);

        if (success && tx) {
          await signAndExecute({
            transaction: serializeTransaction(tx),
            chain: 'sui:testnet',
          });
          
          alert(`Листинг для "${listing.nickname}" успешно отменен.`);
          loadMarketplaceData();
        } else {
          alert('Ошибка при отмене листинга');
        }
      }
    } catch (error) {
      console.error('Ошибка отмены листинга:', error);
      alert('Ошибка при отмене листинга: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="marketplace-container">
      <div className="marketplace-header">
        <h1 className="marketplace-title">Marketplace NFT Никнеймов</h1>
        
        <div className="marketplace-controls">
          <div className="data-mode-toggle">
            <label>
              <input
                type="checkbox"
                checked={useMockData}
                onChange={(e) => setUseMockData(e.target.checked)}
              />
              Тестовые данные
            </label>
          </div>
          
          <button className="sui-faucet-button" onClick={requestTestnetSui} disabled={!account}>
            Запросить тестовые SUI
          </button>
        </div>
        
        {stats && (
          <div className="marketplace-stats">
            <div className="stat-item">
              <span className="stat-label">Всего NFT:</span>
              <span className="stat-value">{stats.totalNFTs}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">На продаже:</span>
              <span className="stat-value">{stats.nftsForSale}</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Минимальная цена:</span>
              <span className="stat-value">{stats.floorPrice} SUI</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Общий объем:</span>
              <span className="stat-value">{stats.totalVolume} SUI</span>
            </div>
          </div>
        )}
      </div>

      <div className="tab-buttons">
        <button onClick={() => setActiveTab('buy')} className={activeTab === 'buy' ? 'active' : ''}>
          Купить ({listings.length})
        </button>
        <button onClick={() => setActiveTab('sell')} className={activeTab === 'sell' ? 'active' : ''}>
          Продать
        </button>
        <button onClick={() => setActiveTab('my-nfts')} className={activeTab === 'my-nfts' ? 'active' : ''}>
          Мои NFT ({userNFTs.length})
        </button>
      </div>

      {loading && (
        <div className="loading-overlay">
          <div className="loading-spinner">Загрузка...</div>
        </div>
      )}

      {activeTab === 'buy' && (
        <div className="tab-content">
          <h2>Доступные никнеймы для покупки</h2>
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
                    {listing.seller.toLowerCase() === account?.address?.toLowerCase() ? 'Ваш NFT' : 'Купить'}
                  </button>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>🛒 Нет доступных никнеймов на продажу</p>
                <p>Создайте свой NFT никнейм во вкладке "Продать"!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sell' && (
        <div className="tab-content">
          <h2>Создать и продать NFT никнейм</h2>
          <div className="sell-form">
            <div className="form-group">
              <label>Никнейм:</label>
              <input
                type="text"
                placeholder="Введите уникальный никнейм"
                value={newNickname}
                onChange={(e) => setNewNickname(e.target.value)}
                disabled={loading}
                maxLength={20}
              />
              <small>От 3 до 20 символов</small>
            </div>
            
            <div className="form-group">
              <label>Цена в SUI:</label>
              <input
                type="number"
                placeholder="0.00"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                disabled={loading}
                min="0.01"
                step="0.01"
              />
              <small>Минимальная цена: 0.01 SUI</small>
            </div>
            
            <button 
              className="sell-button primary"
              onClick={handleMintAndSell} 
              disabled={loading || !newNickname || !sellPrice || newNickname.length < 3}
            >
              {loading ? 'Создание...' : 'Создать NFT и выставить на продажу'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'my-nfts' && (
        <div className="tab-content">
          <h2>Мои NFT никнеймы</h2>
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
                      <p className="last-sale">💸 Последняя продажа: {nft.lastSalePrice} SUI</p>
                    )}
                  </div>
                  
                  {nft.isForSale ? (
                    <div className="sale-info">
                      <p className="current-price">💰 На продаже за {nft.price?.toFixed(2)} SUI</p>
                      <button 
                        className="cancel-button"
                        onClick={() => handleCancelListing(nft as MarketplaceListing)} 
                        disabled={loading}
                      >
                        Снять с продажи
                      </button>
                    </div>
                  ) : (
                    <button 
                      className="sell-button"
                      onClick={() => setSelectedNFT(nft)} 
                      disabled={loading}
                    >
                      Выставить на продажу
                    </button>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>🎭 У вас пока нет NFT никнеймов</p>
                <p>Создайте свой первый NFT во вкладке "Продать"!</p>
              </div>
            )}
          </div>
          
          {selectedNFT && (
            <div className="sell-modal">
              <div className="modal-content">
                <h3>Выставить "{selectedNFT.nickname}" на продажу</h3>
                <div className="form-group">
                  <label>Цена в SUI:</label>
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
                    Выставить на продажу
                  </button>
                  <button 
                    className="cancel-button"
                    onClick={() => {
                      setSelectedNFT(null);
                      setSellPrice('');
                    }}
                    disabled={loading}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Marketplace;