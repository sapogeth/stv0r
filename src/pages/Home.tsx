import React, { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useNavigate } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton';
import KioskComponent from '../components/KioskComponent';
import UserProfile from '../components/UserProfile';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { useUserNickname } from '../hooks/useUserNickname';
import '../stvor.css';
import '../styles/nickname.css';

// Импортируем SetupPassword, если он все еще в отдельном файле
import { SetupPassword } from '../components/SetupPassword'; 

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

const Home = () => {
  const currentAccount = useCurrentAccount();
  const navigate = useNavigate();
  const [suiBalance, setSuiBalance] = useState<string>('Loading...');
  const [walBalance, setWalBalance] = useState<string>('Loading...');
  const [activeTab, setActiveTab] = useState<'profile' | 'kiosk'>('profile');
  const address = currentAccount?.address;

  // Используем хук для автоматического управления никнеймами
  const { nickname, loading: nicknameLoading } = useUserNickname();

  useEffect(() => {
    const fetchBalances = async () => {
      if (!currentAccount) return;
      try {
        const suiBalanceData = await client.getBalance({ owner: address, coinType: '0x2::sui::SUI' });
        setSuiBalance(`${(suiBalanceData.totalBalance / 1_000_000_000).toFixed(2)} SUI`);

        const walBalanceData = await client.getBalance({ owner: address, coinType: '0x8190b04::wal::WAL' }).catch(() => null);
        setWalBalance(walBalanceData ? `${(walBalanceData.totalBalance / 1_000_000_000).toFixed(2)} WAL` : '0 WAL');
      } catch (error) {
        console.error('Error fetching balances:', error);
        setSuiBalance('Error');
        setWalBalance('Error');
      }
    };
    fetchBalances();
  }, [currentAccount, address]);

  const goToMarketplace = () => {
    navigate('/marketplace');
  };

  const refreshBalances = () => {
    setSuiBalance('Loading...');
    setWalBalance('Loading...');
    const fetchBalances = async () => {
      try {
        const suiBalanceData = await client.getBalance({ owner: address, coinType: '0x2::sui::SUI' });
        setSuiBalance(`${(suiBalanceData.totalBalance / 1_000_000_000).toFixed(2)} SUI`);

        const walBalanceData = await client.getBalance({ owner: address, coinType: '0x8190b04::wal::WAL' }).catch(() => null);
        setWalBalance(walBalanceData ? `${(walBalanceData.totalBalance / 1_000_000_000).toFixed(2)} WAL` : '0 WAL');
      } catch (error) {
        console.error('Error fetching balances:', error);
        setSuiBalance('Error');
        setWalBalance('Error');
      }
    };
    fetchBalances();
  };

  if (!currentAccount) {
    // Если пользователь не залогинен, Home ничего не отображает,
    // так как App.tsx перенаправит на /login
    return null; 
  }

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <h1 className="chat-header">STVOR</h1>
        
        {/* Отображение никнейма пользователя */}
        <div className="user-info">
          <div className="user-greeting">
            <h3>👋 Привет, @{nicknameLoading ? 'загрузка...' : (nickname || 'пользователь')}!</h3>
            {!nicknameLoading && nickname && (
              <p className="nickname-status">Ваш уникальный никнейм</p>
            )}
          </div>
          <div className="user-status">
            🔒 Подключен безопасно через кошелек
          </div>
          {!nicknameLoading && !nickname && (
            <div className="nickname-warning">
              ⚠️ Никнейм не найден. Обновите страницу.
            </div>
          )}
        </div>

        <div className="chat-sidebar-account">
          <p>Кошелек:</p>
          <p>
            <strong>{currentAccount.address.slice(0, 8)}...{currentAccount.address.slice(-6)}</strong>
          </p>
        </div>

        <div className="sidebar-tabs">
          <button 
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Профиль
          </button>
          <button 
            className={`tab-btn ${activeTab === 'kiosk' ? 'active' : ''}`}
            onClick={() => setActiveTab('kiosk')}
          >
            Kiosk
          </button>
        </div>

        <LogoutButton />
        
        <div className="sidebar-actions">
          {/* ✅ Здесь мы включаем компонент SetupPassword */}
          <SetupPassword /> 

          <div className="balance-info">
            <p>Баланс SUI: {suiBalance}</p>
            <p>Баланс WAL: {walBalance}</p>
            <button onClick={refreshBalances} className="refresh-btn">
              Обновить балансы
            </button>
          </div>
          
          <button onClick={goToMarketplace} className="marketplace-btn" disabled={!currentAccount}>
            Перейти в маркетплейс
          </button>
        </div>
      </div>
      
      <div className="chat-main">
        {activeTab === 'profile' && (
          <div className="profile-section">
            <UserProfile />
          </div>
        )}
        
        {activeTab === 'kiosk' && (
          <div className="kiosk-section">
            <h2>Sui Kiosk</h2>
            <KioskComponent />
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;