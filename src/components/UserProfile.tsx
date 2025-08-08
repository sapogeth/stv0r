// src/components/UserProfile.tsx

import React from 'react';
import { useUserNickname } from '../hooks/useUserNickname';
import NicknameManager from './NicknameManager';
import '../styles/UserProfile.css';

const UserProfile: React.FC = () => {
  const { 
    user, 
    nickname, 
    loading, 
    error, 
    updateNickname, 
    refreshUser, 
    isConnected, 
    walletAddress 
  } = useUserNickname();

  if (!isConnected) {
    return (
      <div className="user-profile">
        <div className="profile-message">
          <h3>Подключите кошелек</h3>
          <p>Для использования профиля необходимо подключить кошелек</p>
        </div>
      </div>
    );
  }

  if (loading && !nickname) {
    return (
      <div className="user-profile">
        <div className="profile-loading">
          <h3>Инициализация профиля...</h3>
          <p>Создаем ваш уникальный никнейм</p>
        </div>
      </div>
    );
  }

  if (error && !nickname) {
    return (
      <div className="user-profile">
        <div className="profile-error">
          <h3>Ошибка инициализации</h3>
          <p>{error}</p>
          <button onClick={refreshUser} className="retry-button">
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        <h2>Профиль пользователя</h2>
        {loading && <span className="loading-indicator">Обновление...</span>}
      </div>

      <div className="profile-info">
        <div className="wallet-info">
          <h3>Кошелек</h3>
          <div className="wallet-address">
            {walletAddress ? (
              <>
                <span className="address-short">
                  {walletAddress.slice(0, 8)}...{walletAddress.slice(-6)}
                </span>
                <span className="address-full" title={walletAddress}>
                  {walletAddress}
                </span>
              </>
            ) : (
              'Не подключен'
            )}
          </div>
        </div>

        {user && (
          <div className="user-details">
            <div className="detail-item">
              <label>Email:</label>
              <span>{user.email}</span>
            </div>
            <div className="detail-item">
              <label>Дата регистрации:</label>
              <span>{user.createdAt.toLocaleDateString()}</span>
            </div>
            <div className="detail-item">
              <label>Последнее обновление:</label>
              <span>{user.updatedAt.toLocaleDateString()}</span>
            </div>
          </div>
        )}
      </div>

      <div className="nickname-section">
        <NicknameManager 
          currentNickname={nickname}
          onNicknameUpdate={updateNickname}
        />
      </div>

      {error && (
        <div className="profile-error-message">
          <p>⚠️ {error}</p>
          <button onClick={refreshUser} className="refresh-button">
            Обновить данные
          </button>
        </div>
      )}

      <div className="profile-actions">
        <button onClick={refreshUser} className="refresh-button" disabled={loading}>
          {loading ? 'Обновление...' : 'Обновить профиль'}
        </button>
      </div>
    </div>
  );
};

export default UserProfile;

