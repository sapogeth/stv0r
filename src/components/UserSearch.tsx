// src/components/UserSearch.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { 
  searchUsersByNickname, 
  getPopularNicknames, 
  checkNicknameAvailability,
  type UserSearchResult 
} from '../services/userSearchService';
import { getOrCreateChat } from '../services/chatService';
import '../styles/UserSearch.css';

interface UserSearchProps {
  onUserSelect?: (user: UserSearchResult) => void;
  onChatStart?: (chatId: string) => void;
  placeholder?: string;
  showStartChatButton?: boolean;
}

const UserSearch: React.FC<UserSearchProps> = ({
  onUserSelect,
  onChatStart,
  placeholder = "Поиск пользователей по никнейму...",
  showStartChatButton = true
}) => {
  const currentAccount = useCurrentAccount();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [popularNicknames, setPopularNicknames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPopularNicknames();
  }, []);

  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (query.trim()) {
        performSearch();
      } else {
        setResults([]);
        setShowDropdown(false);
      }
    }, 300);

    return () => clearTimeout(delayedSearch);
  }, [query]);

  // Закрытие dropdown при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadPopularNicknames = async () => {
    try {
      const popular = await getPopularNicknames(8);
      setPopularNicknames(popular);
    } catch (error) {
      console.error('Ошибка загрузки популярных никнеймов:', error);
    }
  };

  const performSearch = async () => {
    if (!query.trim()) return;

    setLoading(true);
    try {
      const searchResults = await searchUsersByNickname(query.trim(), false);
      setResults(searchResults);
      setShowDropdown(true);
      setSelectedIndex(-1);
    } catch (error) {
      console.error('Ошибка поиска:', error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (value.trim()) {
      setShowDropdown(true);
    }
  };

  const handleInputFocus = () => {
    if (query.trim() && results.length > 0) {
      setShowDropdown(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < results.length) {
          handleUserSelect(results[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleUserSelect = (userResult: UserSearchResult) => {
    setQuery(`@${userResult.nickname}`);
    setShowDropdown(false);
    setSelectedIndex(-1);
    
    if (onUserSelect) {
      onUserSelect(userResult);
    }
  };

  const handleStartChat = async (userResult: UserSearchResult) => {
    if (!currentAccount?.address) {
      alert('Подключите кошелек для начала чата');
      return;
    }

    if (currentAccount.address === userResult.user.walletAddress) {
      alert('Нельзя начать чат с самим собой');
      return;
    }

    try {
      const chat = await getOrCreateChat(
        currentAccount.address,
        userResult.user.walletAddress
      );
      
      if (onChatStart) {
        onChatStart(chat.id);
      }
    } catch (error) {
      console.error('Ошибка создания чата:', error);
      alert('Ошибка при создании чата');
    }
  };

  const handlePopularNicknameClick = (nickname: string) => {
    setQuery(`@${nickname}`);
    inputRef.current?.focus();
  };

  return (
    <div className="user-search" ref={searchRef}>
      <div className="search-input-container">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="search-input"
        />
        {loading && <div className="search-loading">🔍</div>}
      </div>

      {showDropdown && (
        <div className="search-dropdown">
          {results.length > 0 ? (
            <div className="search-results">
              <div className="results-header">
                Найдено пользователей: {results.length}
              </div>
              {results.map((result, index) => (
                <div
                  key={`${result.user.walletAddress}-${result.nickname}`}
                  className={`search-result-item ${
                    index === selectedIndex ? 'selected' : ''
                  }`}
                  onClick={() => handleUserSelect(result)}
                >
                  <div className="user-info">
                    <div className="nickname-display">
                      <span className="nickname">@{result.nickname}</span>
                      {result.isActive && (
                        <span className="active-badge">Активный</span>
                      )}
                    </div>
                    <div className="user-details">
                      <span className="wallet-short">
                        {result.user.walletAddress.slice(0, 6)}...
                        {result.user.walletAddress.slice(-4)}
                      </span>
                      {result.allNicknames.length > 1 && (
                        <span className="nickname-count">
                          +{result.allNicknames.length - 1} никнейм(ов)
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {showStartChatButton && (
                    <button
                      className="start-chat-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStartChat(result);
                      }}
                    >
                      💬 Чат
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : query.trim() && !loading ? (
            <div className="no-results">
              <p>Пользователи с никнеймом "{query}" не найдены</p>
              <p>Попробуйте другой поисковый запрос</p>
            </div>
          ) : null}
        </div>
      )}

      {!showDropdown && popularNicknames.length > 0 && !query.trim() && (
        <div className="popular-nicknames">
          <div className="popular-header">Популярные никнеймы:</div>
          <div className="popular-list">
            {popularNicknames.map((nickname) => (
              <button
                key={nickname}
                className="popular-nickname-btn"
                onClick={() => handlePopularNicknameClick(nickname)}
              >
                @{nickname}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserSearch;
