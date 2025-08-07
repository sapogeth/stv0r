import React, { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { WALRUS_PUBLISHER_URL } from '../services/walrus';
import { encryptData } from '../utils/crypto';

const SetupPassword = () => {
  const currentAccount = useCurrentAccount();
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState<string | null>(null);

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

  return (
    <div>
      <h2>Setup Password</h2>
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
    </div>
  );
};

export { SetupPassword };