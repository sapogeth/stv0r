import React, { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useNavigate } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton';
import KioskComponent from '../components/KioskComponent';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import '../stvor.css';

// Импортируем SetupPassword, если он все еще в отдельном файле
import { SetupPassword } from '../components/SetupPassword'; 

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

const Home = () => {
  const currentAccount = useCurrentAccount();
  const navigate = useNavigate();
  const [suiBalance, setSuiBalance] = useState<string>('Loading...');
  const [walBalance, setWalBalance] = useState<string>('Loading...');
  const address = currentAccount?.address;

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
        <h1 className="chat-header">Academic Secure Chat</h1>
        <div className="chat-sidebar-account">
          <p>Logged in as:</p>
          <p>
            <strong>{currentAccount.address}</strong>
          </p>
        </div>
        <LogoutButton />
        <div>
          {/* ✅ Здесь мы включаем компонент SetupPassword */}
          <SetupPassword /> 

          <div style={{ marginTop: '10px' }}>
            <p>Balance SUI: {suiBalance}</p>
            <p>Balance WAL: {walBalance}</p>
            <button onClick={refreshBalances} style={{ marginTop: '5px' }}>
              Refresh Balances
            </button>
          </div>
          <button onClick={goToMarketplace} style={{ marginTop: '10px' }} disabled={!currentAccount}>
            Go to the marketplace
          </button>
        </div>
      </div>
      <div className="chat-main">
        <div className="kiosk-section">
          <h2>Sui Kiosk</h2>
          <KioskComponent />
        </div>
      </div>
    </div>
  );
};

export default Home;