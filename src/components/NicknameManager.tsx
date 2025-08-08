// src/components/NicknameManager.tsx

import React, { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { generateNicknameOptions } from '../utils/nicknameGenerator';
import { createNicknameNFT } from '../services/marketplaceService';
import '../styles/NicknameManager.css';

interface NicknameManagerProps {
  currentNickname?: string;
  onNicknameUpdate?: (nickname: string) => void;
}

const NicknameManager: React.FC<NicknameManagerProps> = ({ 
  currentNickname = '', 
  onNicknameUpdate 
}) => {
  const [nickname, setNickname] = useState(currentNickname);
  const [isEditing, setIsEditing] = useState(false);
  const [nicknameOptions, setNicknameOptions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isNFT, setIsNFT] = useState(false);
  
  const account = useCurrentAccount();

  useEffect(() => {
    if (isEditing) {
      generateNicknameVariants();
    }
  }, [isEditing]);

  const generateNicknameVariants = () => {
    const options = generateNicknameOptions(5);
    setNicknameOptions(options);
  };

  const handleSaveNickname = async () => {
    if (!nickname.trim()) return;
    
    setLoading(true);
    try {
      // В реальном приложении здесь будет API вызов
      console.log('Сохранение никнейма:', nickname);
      
      if (onNicknameUpdate) {
        onNicknameUpdate(nickname);
      }
      
      setIsEditing(false);
      alert('Никнейм успешно обновлен!');
      
    } catch (error) {
      console.error('Ошибка сохранения никнейма:', error);
      alert('Ошибка при сохранении никнейма');
    } finally {
      setLoading(false);
    }
  };

  const handleConvertToNFT = async () => {
    if (!account?.address || !nickname) return;
    
    setLoading(true);
    try {
      // Создаем NFT никнейм
      const tokenId = 'nft_' + Date.now(); // В реальном приложении это будет ID из блокчейна
      const nft = await createNicknameNFT(tokenId, nickname, account.address);
      
      setIsNFT(true);
      alert(`Никнейм "${nickname}" успешно конвертирован в NFT!`);
      
    } catch (error) {
      console.error('Ошибка конвертации в NFT:', error);
      alert('Ошибка при конвертации в NFT');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="nickname-manager">
      <div className="nickname-display">
        <h3>Ваш никнейм</h3>
        {!isEditing ? (
          <div className="nickname-info">
            <div className="nickname-value">
              {nickname || 'Не установлен'}
              {isNFT && <span className="nft-badge">NFT</span>}
            </div>
            <div className="nickname-actions">
              <button 
                className="edit-button"
                onClick={() => setIsEditing(true)}
                disabled={loading}
              >
                Изменить
              </button>
              {!isNFT && nickname && (
                <button 
                  className="nft-button"
                  onClick={handleConvertToNFT}
                  disabled={loading}
                >
                  Конвертировать в NFT
                </button>
              )}
            </div>
          </div>
        ) : (
          <div className="nickname-editor">
            <div className="custom-nickname">
              <label htmlFor="customNickname">Введите свой никнейм:</label>
              <input
                type="text"
                id="customNickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                placeholder="Введите никнейм"
                maxLength={20}
              />
            </div>
            
            <div className="nickname-suggestions">
              <h4>Или выберите из предложенных:</h4>
              <div className="suggestions-grid">
                {nicknameOptions.map((option, index) => (
                  <button
                    key={index}
                    className={`suggestion-button ${nickname === option ? 'selected' : ''}`}
                    onClick={() => setNickname(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
              <button 
                className="generate-more"
                onClick={generateNicknameVariants}
                disabled={loading}
              >
                Сгенерировать еще
              </button>
            </div>
            
            <div className="editor-actions">
              <button 
                className="save-button"
                onClick={handleSaveNickname}
                disabled={loading || !nickname.trim()}
              >
                {loading ? 'Сохранение...' : 'Сохранить'}
              </button>
              <button 
                className="cancel-button"
                onClick={() => {
                  setIsEditing(false);
                  setNickname(currentNickname);
                }}
                disabled={loading}
              >
                Отмена
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NicknameManager;

