import React, { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { useNavigate } from 'react-router-dom';
import LogoutButton from '../components/LogoutButton';
import KioskComponent from '../components/KioskComponent';
import { WALRUS_PUBLISHER_URL } from '../services/walrus';
import { encryptData } from '../utils/crypto';
import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import '../stvor.css';

const client = new SuiClient({ url: getFullnodeUrl('testnet') });

const Home = () => {
  const currentAccount = useCurrentAccount();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);
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

  const handleSetupPassword = async () => {
    if (!password) {
      setMessage('Пожалуйста, введите пароль');
      return;
    }

    const dataToEncrypt = "access_granted";
    const { encryptedData, salt, iv } = await encryptData(dataToEncrypt, password);
    const storageData = {
      encryptedData: Array.from(encryptedData),
      salt: Array.from(salt),
      iv: Array.from(iv),
    };

    try {
      const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/blobs?epochs=1`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(storageData),
      });

      const responseBody = await response.text();
      console.log('Response status:', response.status);
      console.log('Response text:', responseBody);

      if (response.status === 200) {
        const info = JSON.parse(responseBody);
        const blobId = info.newlyCreated?.blobObject?.blobId || info.alreadyCertified?.blobId;
        if (blobId) {
          localStorage.setItem('blobId', blobId);
          setMessage('Пароль успешно установлен!');
        } else {
          throw new Error('Не удалось получить blobId из ответа');
        }
      } else if (response.status === 500 && responseBody.includes('WAL coins')) {
        localStorage.setItem('encryptedPassword', btoa(JSON.stringify(storageData)));
        setMessage('WAL токены отсутствуют. Пароль сохранён локально как резерв. Рекомендуется запросить WAL.');
      } else {
        throw new Error(`Ошибка сервера: ${response.status} - ${responseBody}`);
      }
    } catch (error) {
      console.error('Error details:', error);
      if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
        localStorage.setItem('encryptedPassword', btoa(JSON.stringify(storageData)));
        setMessage('Сервер Walrus недоступен. Пароль сохранён локально как резерв.');
      } else {
        setMessage(`Произошла ошибка при установлении пароля: ${error.message}`);
      }
    }
  };

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
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter a new password"
          />
          <button onClick={handleSetupPassword} disabled={!currentAccount}>
            Set a password
          </button>
          {message && (
            <div style={{ color: message.includes('error') || message.includes('Ошибка') ? 'red' : 'green' }}>
              {message}
            </div>
          )}
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