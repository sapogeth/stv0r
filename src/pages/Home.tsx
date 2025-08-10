import React, { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useNavigate } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton';
import KioskComponent from '../components/KioskComponent';
import UserProfile from '../components/UserProfile';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { useUserNickname } from '../hooks/useUserNickname';
import '../base.css';
import '../styles/nickname.css';

// Import SetupPassword if it's still in a separate file
import { SetupPassword } from '../components/SetupPassword'; 

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

const Home = () => {
  const currentAccount = useCurrentAccount();
  const navigate = useNavigate();
  const [suiBalance, setSuiBalance] = useState<string>('Loading...');
  const [walBalance, setWalBalance] = useState<string>('Loading...');
  const [activeTab, setActiveTab] = useState<'profile' | 'kiosk'>('profile');
  const address = currentAccount?.address;

  // Use the hook for automatic nickname management
  const { nickname, loading: nicknameLoading } = useUserNickname();

  useEffect(() => {
    const fetchBalances = async () => {
      if (!currentAccount || !address) return;
      try {
        const suiBalanceData = await client.getBalance({ owner: address, coinType: '0x2::sui::SUI' });
        setSuiBalance(`${(parseInt(suiBalanceData.totalBalance) / 1_000_000_000).toFixed(2)} SUI`);

        const walBalanceData = await client.getBalance({ owner: address, coinType: '0x8190b04::wal::WAL' }).catch(() => null);
        setWalBalance(walBalanceData ? `${(parseInt(walBalanceData.totalBalance) / 1_000_000_000).toFixed(2)} WAL` : '0 WAL');
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
      if (!address) return;
      try {
        const suiBalanceData = await client.getBalance({ owner: address, coinType: '0x2::sui::SUI' });
        setSuiBalance(`${(parseInt(suiBalanceData.totalBalance) / 1_000_000_000).toFixed(2)} SUI`);

        const walBalanceData = await client.getBalance({ owner: address, coinType: '0x8190b04::wal::WAL' }).catch(() => null);
        setWalBalance(walBalanceData ? `${(parseInt(walBalanceData.totalBalance) / 1_000_000_000).toFixed(2)} WAL` : '0 WAL');
      } catch (error) {
        console.error('Error fetching balances:', error);
        setSuiBalance('Error');
        setWalBalance('Error');
      }
    };
    fetchBalances();
  };

  // If the user is not logged in, Home displays nothing,
  // as App.tsx will redirect to /login
  if (!currentAccount) {
    return null; 
  }

  return (
    <div className="chat-container">
      <div className="chat-sidebar">
        <h1 className="chat-header">STVOR</h1>
        
        {/* Display user's nickname */}
        <div className="user-info">
          <div className="user-greeting">
            <h3>👋 Hello, @{nicknameLoading ? 'loading...' : (nickname || 'user')}!</h3>
            {!nicknameLoading && nickname && (
              <p className="nickname-status">Your unique nickname</p>
            )}
          </div>
          <div className="user-status">
            🔒 Securely connected via wallet
          </div>
          {!nicknameLoading && !nickname && (
            <div className="nickname-warning">
              ⚠️ Nickname not found. Please refresh the page.
            </div>
          )}
        </div>

        <div className="chat-sidebar-account">
          <p>Wallet:</p>
          <p>
            <strong>{currentAccount.address.slice(0, 8)}...{currentAccount.address.slice(-6)}</strong>
          </p>
        </div>

        <div className="sidebar-tabs">
          <button 
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            Profile
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
          {/* ✅ Here we include the SetupPassword component */}
          <SetupPassword /> 

          <div className="balance-info">
            <p>SUI Balance: {suiBalance}</p>
            <p>WAL Balance: {walBalance}</p>
            <button onClick={refreshBalances} className="refresh-btn">
              Refresh Balances
            </button>
          </div>
          
          <button onClick={goToMarketplace} className="marketplace-btn" disabled={!currentAccount}>
            Go to Marketplace
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