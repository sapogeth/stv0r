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
import '../styles/Marketplace.css';

// Инициализация SuiClient для testnet
const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });

const Marketplace: React.FC = () => {
  const [listings, setListings] = useState<MarketplaceListing[]>([]);
  const [userNFTs, setUserNFTs] = useState<NicknameNFT[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'buy' | 'sell' | 'my-nfts'>('buy');
  const [sellPrice, setSellPrice] = useState<string>('');
  const [selectedNFT, setSelectedNFT] = useState<NicknameNFT | null>(null);
  const [loading, setLoading] = useState(false);
  const [newNickname, setNewNickname] = useState('');
  
  const account = useCurrentAccount();
  const { mutateAsync: signAndExecute } = useSignAndExecuteTransaction();

  useEffect(() => {
    loadMarketplaceData();
  }, [account]);

  const loadMarketplaceData = async () => {
    try {
      // Здесь ваша реальная логика загрузки данных
      // const activeListings = await getActiveListings();
      // const marketStats = await getMarketplaceStats();
      // setListings(activeListings);
      // setStats(marketStats);

      // Временные заглушки
      setListings([
        {
          id: 'mock-listing-1',
          nickname: 'SuiMaster',
          seller: '0x123...',
          price: 10,
          createdAt: new Date(),
          isActive: true,
          kioskId: '0x456...',
        },
        {
          id: 'mock-listing-2',
          nickname: 'SuiFan',
          seller: '0x789...',
          price: 5.5,
          createdAt: new Date(),
          isActive: true,
          kioskId: '0xabc...',
        },
      ]);
      setStats({ totalListings: 2, totalSales: 0 });
      
      if (account?.address) {
        // const nfts = await getUserNFTs(account.address);
        // setUserNFTs(nfts);
        setUserNFTs([
          {
            tokenId: 'mock-nft-1',
            nickname: 'MyCoolNFT',
            owner: account.address,
            isForSale: false,
            createdAt: new Date(),
            saleHistory: [],
          },
        ]);
      }
    } catch (error) {
      console.error('Ошибка загрузки данных маркетплейса:', error);
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
    // Эта функция должна находить монету у пользователя для оплаты.
    // Реализация зависит от вашего проекта.
    return '0x...'; 
  };

  const handleBuyNickname = async (listing: MarketplaceListing) => {
    if (!account?.address) {
      alert('Подключите кошелек');
      return;
    }
    
    setLoading(true);
    try {
      const paymentCoinId = await getPaymentCoinId(listing.price);
      if (!paymentCoinId) {
        alert('Недостаточно SUI для покупки. Запросите тестовые SUI.');
        return;
      }

      const { success, tx } = await buyNicknameWithKiosk(listing.id, account.address, paymentCoinId);
      
      if (success && tx) {
        await signAndExecute(
          {
            transaction: serializeTransaction(tx),
            chain: 'sui:testnet',
          }
        ).then(() => {
          alert(`Никнейм "${listing.nickname}" успешно куплен!`);
          loadMarketplaceData();
        }).catch((error) => {
          console.error('Ошибка подписи транзакции:', error);
          alert('Ошибка при покупке никнейма: ' + (error.message || 'Неизвестная ошибка'));
        });
      } else {
        alert('Ошибка при покупке никнейма');
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
        await signAndExecute(
          {
            transaction: serializeTransaction(tx),
            chain: 'sui:testnet',
          }
        ).then(() => {
          alert(`Никнейм "${nickname}" выставлен на продажу за ${price} SUI`);
          setSelectedNFT(null);
          setSellPrice('');
          loadMarketplaceData();
        }).catch((error) => {
          console.error('Ошибка подписи транзакции:', error);
          alert('Ошибка при выставлении на продажу: ' + (error.message || 'Неизвестная ошибка'));
        });
      }
    } catch (error) {
      console.error('Ошибка продажи:', error);
      alert('Ошибка при выставлении на продажу: ' + (error.message || 'Неизвестная ошибка'));
    } finally {
      setLoading(false);
    }
  };

  // Эта функция объединяет минт и продажу
  const handleMintAndSell = async () => {
    if (!account?.address || !newNickname || !sellPrice) {
      alert('Подключите кошелек, введите никнейм и укажите цену');
      return;
    }
    
    setLoading(true);
    try {
      // 1. Создаем транзакцию для минта
      const mintTx = await createSecureNicknameNFT(newNickname, account.address);
      
      // 2. Подписываем и выполняем транзакцию минта
      const mintResult = await signAndExecute(
        {
          transaction: serializeTransaction(mintTx),
          chain: 'sui:testnet',
        }
      );
      
      const createdObject = mintResult.objectChanges?.find(
        (change) => change.type === 'created' && change.objectType.includes('nickname_nft::NicknameNFT')
      );
      
      if (!createdObject) {
        throw new Error('Не удалось получить ID созданного NFT.');
      }
      
      const realTokenId = createdObject.objectId;
      
      // 3. После успешного минта, вызываем функцию продажи с реальным ID
      await handleSellNickname(realTokenId, newNickname, parseFloat(sellPrice));

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
      const { success, tx } = await cancelListingWithKiosk(listing.id, account.address);

      if (success && tx) {
        await signAndExecute(
          {
            transaction: serializeTransaction(tx),
            chain: 'sui:testnet',
          }
        ).then(() => {
          alert(`Листинг для "${listing.nickname}" успешно отменен.`);
          loadMarketplaceData();
        }).catch((error) => {
          console.error('Ошибка отмены листинга:', error);
          alert('Ошибка при отмене листинга: ' + (error.message || 'Неизвестная ошибка'));
        });
      } else {
        alert('Ошибка при отмене листинга');
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
      <h1 className="marketplace-title">Marketplace</h1>
      <div className="marketplace-header">
        <button className="sui-faucet-button" onClick={requestTestnetSui} disabled={!account}>
          Запросить тестовые SUI
        </button>
      </div>

      <div className="tab-buttons">
        <button onClick={() => setActiveTab('buy')} className={activeTab === 'buy' ? 'active' : ''}>
          Купить
        </button>
        <button onClick={() => setActiveTab('sell')} className={activeTab === 'sell' ? 'active' : ''}>
          Продать
        </button>
        <button onClick={() => setActiveTab('my-nfts')} className={activeTab === 'my-nfts' ? 'active' : ''}>
          Мои NFT
        </button>
      </div>

      {activeTab === 'buy' && (
        <div className="tab-content">
          <h2>Доступные никнеймы</h2>
          <div className="listings-grid">
            {listings.length > 0 ? (
              listings.map((listing) => (
                <div key={listing.id} className="listing-card">
                  <h3>{listing.nickname}</h3>
                  <p>Цена: {listing.price ? listing.price.toFixed(2) : 'N/A'} SUI</p>
                  <p>Продавец: {listing.seller.slice(0, 6)}...</p>
                  <button onClick={() => handleBuyNickname(listing)} disabled={loading}>
                    Купить
                  </button>
                </div>
              ))
            ) : (
              <p>Нет доступных никнеймов на продажу.</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'sell' && (
        <div className="tab-content">
          <h2>Выставить никнейм на продажу</h2>
          <div className="sell-form">
            <input
              type="text"
              placeholder="Введите новый никнейм"
              value={newNickname}
              onChange={(e) => setNewNickname(e.target.value)}
              disabled={loading}
            />
            <input
              type="number"
              placeholder="Цена в SUI"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              disabled={loading}
            />
            <button 
              className="sell-button"
              onClick={handleMintAndSell} 
              disabled={loading || !newNickname || !sellPrice}
            >
              Создать и выставить на продажу
            </button>
          </div>
        </div>
      )}

      {activeTab === 'my-nfts' && (
        <div className="tab-content">
          <h2>Мои никнеймы</h2>
          <div className="listings-grid">
            {userNFTs.length > 0 ? (
              userNFTs.map((nft) => (
                <div key={nft.tokenId} className="listing-card">
                  <h3>{nft.nickname}</h3>
                  <p>ID: {nft.tokenId.slice(0, 6)}...</p>
                  {nft.isForSale ? (
                    <>
                      <p>Цена: {nft.price ? nft.price.toFixed(2) : 'N/A'} SUI</p>
                      <button onClick={() => handleCancelListing(nft as MarketplaceListing)} disabled={loading}>
                        Отменить листинг
                      </button>
                    </>
                  ) : (
                    <button onClick={() => setSelectedNFT(nft)} disabled={loading}>
                      Продать
                    </button>
                  )}
                </div>
              ))
            ) : (
              <p>У вас нет никнеймов.</p>
            )}
          </div>
          {selectedNFT && (
            <div className="sell-form">
              <h3>Выставить "{selectedNFT.nickname}" на продажу</h3>
              <input
                type="number"
                placeholder="Цена в SUI"
                value={sellPrice}
                onChange={(e) => setSellPrice(e.target.value)}
                disabled={loading}
              />
              <button 
                className="sell-button"
                onClick={() => handleSellNickname(selectedNFT.tokenId, selectedNFT.nickname, parseFloat(sellPrice))}
                disabled={loading || !sellPrice}
              >
                Выставить
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Marketplace;