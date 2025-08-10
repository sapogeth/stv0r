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
  placeholder = "Search users by nickname...",
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

  // Close dropdown on click outside the component
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
      console.error('Error loading popular nicknames:', error);
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
      console.error('Search error:', error);
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
      alert('Connect your wallet to start a chat');
      return;
    }

    if (currentAccount.address === userResult.user.walletAddress) {
      alert('You cannot start a chat with yourself');
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
      console.error('Error creating chat:', error);
      alert('Error while creating chat');
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
                Users found: {results.length}
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
                        <span className="active-badge">Active</span>
                      )}
                    </div>
                    <div className="user-details">
                      <span className="wallet-short">
                        {result.user.walletAddress.slice(0, 6)}...
                        {result.user.walletAddress.slice(-4)}
                      </span>
                      {result.allNicknames.length > 1 && (
                        <span className="nickname-count">
                          +{result.allNicknames.length - 1} nickname(s)
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
                      💬 Chat
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : query.trim() && !loading ? (
            <div className="no-results">
              <p>Users with the nickname "{query}" were not found</p>
              <p>Try a different search query</p>
            </div>
          ) : null}
        </div>
      )}

      {!showDropdown && popularNicknames.length > 0 && !query.trim() && (
        <div className="popular-nicknames">
          <div className="popular-header">Popular Nicknames:</div>
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