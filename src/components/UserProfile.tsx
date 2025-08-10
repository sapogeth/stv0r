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
          <h3>Connect your wallet</h3>
          <p>To use the profile, you need to connect your wallet</p>
        </div>
      </div>
    );
  }

  if (loading && !nickname) {
    return (
      <div className="user-profile">
        <div className="profile-loading">
          <h3>Initializing profile...</h3>
          <p>Creating your unique nickname</p>
        </div>
      </div>
    );
  }

  if (error && !nickname) {
    return (
      <div className="user-profile">
        <div className="profile-error">
          <h3>Initialization Error</h3>
          <p>{error}</p>
          <button onClick={refreshUser} className="retry-button">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="user-profile">
      <div className="profile-header">
        <h2>User Profile</h2>
        {loading && <span className="loading-indicator">Updating...</span>}
      </div>

      <div className="profile-info">
        <div className="wallet-info">
          <h3>Wallet</h3>
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
              'Not connected'
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
              <label>Registration Date:</label>
              <span>{user.createdAt.toLocaleDateString()}</span>
            </div>
            <div className="detail-item">
              <label>Last Updated:</label>
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
            Refresh Data
          </button>
        </div>
      )}

      <div className="profile-actions">
        <button onClick={refreshUser} className="refresh-button" disabled={loading}>
          {loading ? 'Updating...' : 'Refresh Profile'}
        </button>
      </div>
    </div>
  );
};

export default UserProfile;