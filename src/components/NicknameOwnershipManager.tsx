// src/components/NicknameOwnershipManager.tsx

import React, { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { 
  getNicknameOwnership, 
  setActiveNickname, 
  type NicknameOwnership 
} from '../services/nicknameOwnershipService';
import '../styles/NicknameManager.css';

const NicknameOwnershipManager: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const [ownership, setOwnership] = useState<NicknameOwnership | null>(null);
  const [loading, setLoading] = useState(true);
  const [changingActive, setChangingActive] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (currentAccount?.address) {
      loadOwnership();
    }
  }, [currentAccount]);

  const loadOwnership = () => {
    if (!currentAccount?.address) return;
    
    setLoading(true);
    try {
      const ownershipData = getNicknameOwnership(currentAccount.address);
      setOwnership(ownershipData);
    } catch (error) {
      console.error('Ошибка загрузки владения никнеймами:', error);
      showMessage('error', 'Ошибка загрузки данных о никнеймах');
    } finally {
      setLoading(false);
    }
  };

  const handleSetActiveNickname = async (nickname: string) => {
    if (!currentAccount?.address || changingActive) return;
    
    setChangingActive(true);
    try {
      const result = await setActiveNickname(currentAccount.address, nickname);
      
      if (result.success) {
        showMessage('success', result.message);
        loadOwnership(); // Перезагружаем данные
      } else {
        showMessage('error', result.message);
      }
    } catch (error) {
      console.error('Ошибка смены активного никнейма:', error);
      showMessage('error', 'Произошла ошибка при смене никнейма');
    } finally {
      setChangingActive(false);
    }
  };

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  if (!currentAccount) {
    return (
      <div className="nickname-manager">
        <p>Подключите кошелек для управления никнеймами</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="nickname-manager">
        <div className="loading">Загрузка никнеймов...</div>
      </div>
    );
  }

  if (!ownership) {
    return (
      <div className="nickname-manager">
        <p>Ошибка загрузки данных о никнеймах</p>
        <button onClick={loadOwnership} className="retry-btn">
          Попробовать снова
        </button>
      </div>
    );
  }

  return (
    <div className="nickname-manager">
      <div className="nickname-header">
        <h3>Управление никнеймами</h3>
        <div className="nickname-stats">
          <span className="owned-count">
            {ownership.ownedNicknames.length}/{4} никнеймов
          </span>
          {ownership.canBuyMore && (
            <span className="can-buy-more">
              Можно купить еще {ownership.remainingSlots}
            </span>
          )}
        </div>
      </div>

      {message && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      {ownership.ownedNicknames.length === 0 ? (
        <div className="no-nicknames">
          <p>У вас пока нет никнеймов NFT</p>
          <p>Купите никнейм в маркетплейсе, чтобы начать!</p>
        </div>
      ) : (
        <div className="nicknames-list">
          <h4>Ваши никнеймы:</h4>
          {ownership.ownedNicknames.map((nickname) => (
            <div 
              key={nickname} 
              className={`nickname-item ${nickname === ownership.activeNickname ? 'active' : ''}`}
            >
              <div className="nickname-info">
                <span className="nickname-name">@{nickname}</span>
                {nickname === ownership.activeNickname && (
                  <span className="active-badge">Активный</span>
                )}
              </div>
              
              {nickname !== ownership.activeNickname && (
                <button
                  onClick={() => handleSetActiveNickname(nickname)}
                  disabled={changingActive}
                  className="set-active-btn"
                >
                  {changingActive ? 'Изменение...' : 'Сделать активным'}
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="nickname-actions">
        <button 
          onClick={loadOwnership} 
          className="refresh-btn"
          disabled={loading}
        >
          {loading ? 'Обновление...' : 'Обновить'}
        </button>
        
        {ownership.canBuyMore && (
          <div className="buy-more-info">
            <p>💡 Вы можете купить еще {ownership.remainingSlots} никнейм(ов) в маркетплейсе</p>
          </div>
        )}
        
        {!ownership.canBuyMore && (
          <div className="limit-reached">
            <p>🔒 Достигнут лимит никнеймов (4/4)</p>
            <p>Продайте никнейм, чтобы освободить место для нового</p>
          </div>
        )}
      </div>

      <div className="nickname-help">
        <h5>Как это работает:</h5>
        <ul>
          <li>Каждый пользователь может владеть максимум 4 никнеймами</li>
          <li>Один никнейм всегда активный - он отображается в чатах и профиле</li>
          <li>Вы можете переключаться между своими никнеймами</li>
          <li>Никнеймы можно продавать в маркетплейсе</li>
        </ul>
      </div>
    </div>
  );
};

export default NicknameOwnershipManager;
