// src/components/StakingComponent.tsx

import React, { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import {
  getUserStakes,
  createStake,
  unstake,
  claimRewards,
  getStakingStats,
  calculatePotentialRewards,
  getAvailablePools,
  type StakeInfo,
  type StakingStats
} from '../services/stakingService';
import { getUserTokenBalances } from '../services/swapService';

interface StakingComponentProps {
  onStakeComplete?: (txDigest: string) => void;
}

const StakingComponent: React.FC<StakingComponentProps> = ({ onStakeComplete }) => {
  const [activeTab, setActiveTab] = useState<'stake' | 'my-stakes' | 'stats'>('stake');
  const [stakeAmount, setStakeAmount] = useState<string>('');
  const [userStakes, setUserStakes] = useState<StakeInfo[]>([]);
  const [stakingStats, setStakingStats] = useState<StakingStats | null>(null);
  const [availablePools, setAvailablePools] = useState<any[]>([]);
  const [walBalance, setWalBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedPool, setSelectedPool] = useState<string>('');

  const account = useCurrentAccount();

  useEffect(() => {
    if (account?.address) {
      loadUserData();
    }
    loadGeneralData();
  }, [account]);

  const loadUserData = async () => {
    if (!account?.address) return;

    try {
      const [stakes, balances] = await Promise.all([
        getUserStakes(account.address),
        getUserTokenBalances(account.address)
      ]);

      setUserStakes(stakes);
      setWalBalance(balances.wal);
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadGeneralData = async () => {
    try {
      const [stats, pools] = await Promise.all([
        getStakingStats(),
        getAvailablePools()
      ]);

      setStakingStats(stats);
      setAvailablePools(pools);
      
      if (pools.length > 0 && !selectedPool) {
        setSelectedPool(pools[0].poolId);
      }
    } catch (error) {
      console.error('Error loading general data:', error);
    }
  };

  const handleStake = async () => {
    if (!account?.address || !stakeAmount || parseFloat(stakeAmount) <= 0) {
      alert('Enter a valid amount to stake');
      return;
    }

    setLoading(true);
    try {
      const result = await createStake(account.address, parseFloat(stakeAmount));

      if (result.success) {
        alert(`Stake created successfully! ID: ${result.stakeId}`);
        setStakeAmount('');
        await loadUserData();
        await loadGeneralData();
        
        if (onStakeComplete && result.txDigest) {
          onStakeComplete(result.txDigest);
        }
      } else {
        alert(`Error creating stake: ${result.error}`);
      }
    } catch (error) {
      console.error('Error while creating stake:', error);
      alert('An error occurred while creating the stake');
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async (stakeId: string) => {
    if (!account?.address) return;

    setLoading(true);
    try {
      const result = await unstake(account.address, stakeId);

      if (result.success) {
        alert('Stake successfully ended!');
        await loadUserData();
        await loadGeneralData();
      } else {
        alert(`Error ending stake: ${result.error}`);
      }
    } catch (error) {
      console.error('Error while ending stake:', error);
      alert('An error occurred while ending the stake');
    } finally {
      setLoading(false);
    }
  };

  const handleClaimRewards = async (stakeId: string) => {
    if (!account?.address) return;

    setLoading(true);
    try {
      const result = await claimRewards(account.address, stakeId);

      if (result.success) {
        alert('Rewards claimed successfully!');
        await loadUserData();
        await loadGeneralData();
      } else {
        alert(`Error claiming rewards: ${result.error}`);
      }
    } catch (error) {
      console.error('Error while claiming rewards:', error);
      alert('An error occurred while claiming rewards');
    } finally {
      setLoading(false);
    }
  };

  const setMaxAmount = () => {
    setStakeAmount(walBalance.toString());
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isStakeUnlocked = (unlockTime: Date) => {
    return new Date() >= unlockTime;
  };

  const getDaysRemaining = (unlockTime: Date) => {
    const now = new Date();
    const diff = unlockTime.getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  if (!account) {
    return (
      <div className="staking-component">
        <div className="connect-wallet-message">
          <p>Connect your wallet to use staking</p>
        </div>
      </div>
    );
  }

  return (
    <div className="staking-component">
      <div className="staking-header">
        <h2>WAL Staking</h2>
        <div className="balance-info">
          <span>Available: {walBalance.toFixed(4)} WAL</span>
        </div>
      </div>

      <div className="tab-buttons">
        <button 
          onClick={() => setActiveTab('stake')} 
          className={activeTab === 'stake' ? 'active' : ''}
        >
          Create Stake
        </button>
        <button 
          onClick={() => setActiveTab('my-stakes')} 
          className={activeTab === 'my-stakes' ? 'active' : ''}
        >
          My Stakes ({userStakes.length})
        </button>
        <button 
          onClick={() => setActiveTab('stats')} 
          className={activeTab === 'stats' ? 'active' : ''}
        >
          Statistics
        </button>
      </div>

      {activeTab === 'stake' && (
        <div className="tab-content">
          <div className="stake-form">
            <div className="form-group">
              <label>Amount to stake:</label>
              <div className="input-row">
                <input
                  type="number"
                  placeholder="0.00"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  disabled={loading}
                />
                <span className="token-symbol">WAL</span>
                <button className="max-button" onClick={setMaxAmount} disabled={loading}>
                  MAX
                </button>
              </div>
            </div>

            {availablePools.length > 0 && (
              <div className="form-group">
                <label>Staking Pool:</label>
                <select
                  value={selectedPool}
                  onChange={(e) => setSelectedPool(e.target.value)}
                  disabled={loading}
                >
                  {availablePools.map(pool => (
                    <option key={pool.poolId} value={pool.poolId}>
                      {pool.name} - APY: {pool.apy}%
                    </option>
                  ))}
                </select>
              </div>
            )}

            {stakeAmount && parseFloat(stakeAmount) > 0 && (
              <div className="potential-rewards">
                <h4>Potential Rewards:</h4>
                <div className="rewards-grid">
                  <div className="reward-item">
                    <span>For 30 days:</span>
                    <span>{calculatePotentialRewards(parseFloat(stakeAmount), 30).toFixed(4)} WAL</span>
                  </div>
                  <div className="reward-item">
                    <span>For 90 days:</span>
                    <span>{calculatePotentialRewards(parseFloat(stakeAmount), 90).toFixed(4)} WAL</span>
                  </div>
                  <div className="reward-item">
                    <span>For 365 days:</span>
                    <span>{calculatePotentialRewards(parseFloat(stakeAmount), 365).toFixed(4)} WAL</span>
                  </div>
                </div>
              </div>
            )}

            <button
              className="stake-button"
              onClick={handleStake}
              disabled={loading || !stakeAmount || parseFloat(stakeAmount) <= 0 || parseFloat(stakeAmount) > walBalance}
            >
              {loading ? 'Creating stake...' : 'Create Stake'}
            </button>

            <div className="staking-info">
              <h4>Staking Terms:</h4>
              <ul>
                <li>APY: 12.5%</li>
                <li>Lock-in Period: 30 days</li>
                <li>Minimum Amount: 1 WAL</li>
                <li>Rewards are accrued daily</li>
                <li>You can claim rewards without unstaking</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'my-stakes' && (
        <div className="tab-content">
          <div className="stakes-list">
            {userStakes.length > 0 ? (
              userStakes.map((stake) => (
                <div key={stake.stakeId} className={`stake-card ${stake.isActive ? 'active' : 'completed'}`}>
                  <div className="stake-header">
                    <h4>Stake #{stake.stakeId.slice(-8)}</h4>
                    <span className={`status ${stake.isActive ? 'active' : 'completed'}`}>
                      {stake.isActive ? 'Active' : 'Completed'}
                    </span>
                  </div>

                  <div className="stake-details">
                    <div className="detail-row">
                      <span>Amount:</span>
                      <span>{stake.amount} WAL</span>
                    </div>
                    <div className="detail-row">
                      <span>Start Date:</span>
                      <span>{formatDate(stake.startTime)}</span>
                    </div>
                    <div className="detail-row">
                      <span>Unlock Date:</span>
                      <span>{formatDate(stake.unlockTime)}</span>
                    </div>
                    <div className="detail-row">
                      <span>Current Rewards:</span>
                      <span className="rewards">{stake.currentRewards.toFixed(4)} WAL</span>
                    </div>
                    
                    {stake.isActive && !isStakeUnlocked(stake.unlockTime) && (
                      <div className="detail-row">
                        <span>Days until unlock:</span>
                        <span>{getDaysRemaining(stake.unlockTime)}</span>
                      </div>
                    )}
                  </div>

                  {stake.isActive && (
                    <div className="stake-actions">
                      <button
                        className="claim-button"
                        onClick={() => handleClaimRewards(stake.stakeId)}
                        disabled={loading || stake.currentRewards < 0.001}
                      >
                        Claim Rewards
                      </button>
                      
                      <button
                        className="unstake-button"
                        onClick={() => handleUnstake(stake.stakeId)}
                        disabled={loading || !isStakeUnlocked(stake.unlockTime)}
                      >
                        {isStakeUnlocked(stake.unlockTime) ? 'Unstake' : 'Locked'}
                      </button>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>You have no active stakes yet</p>
                <p>Create your first stake in the "Create Stake" tab</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'stats' && stakingStats && (
        <div className="tab-content">
          <div className="stats-grid">
            <div className="stat-card">
              <h4>Total Amount Staked</h4>
              <div className="stat-value">{stakingStats.totalStaked.toLocaleString()} WAL</div>
            </div>
            
            <div className="stat-card">
              <h4>Number of Stakers</h4>
              <div className="stat-value">{stakingStats.totalStakers}</div>
            </div>
            
            <div className="stat-card">
              <h4>Average Stake Size</h4>
              <div className="stat-value">{stakingStats.averageStake.toLocaleString()} WAL</div>
            </div>
            
            <div className="stat-card">
              <h4>Rewards Paid Out</h4>
              <div className="stat-value">{stakingStats.totalRewardsDistributed.toFixed(2)} WAL</div>
            </div>
            
            <div className="stat-card">
              <h4>Current APY</h4>
              <div className="stat-value">{stakingStats.currentAPY}%</div>
            </div>
          </div>

          {availablePools.length > 0 && (
            <div className="pools-info">
              <h3>Available Pools</h3>
              <div className="pools-list">
                {availablePools.map(pool => (
                  <div key={pool.poolId} className="pool-card">
                    <h4>{pool.name}</h4>
                    <div className="pool-details">
                      <div className="detail-row">
                        <span>APY:</span>
                        <span>{pool.apy}%</span>
                      </div>
                      <div className="detail-row">
                        <span>Total Staked:</span>
                        <span>{pool.totalStaked.toLocaleString()} WAL</span>
                      </div>
                      <div className="detail-row">
                        <span>Lock-in Period:</span>
                        <span>{pool.lockPeriod} days</span>
                      </div>
                      <div className="detail-row">
                        <span>Minimum Stake:</span>
                        <span>{pool.minStake} WAL</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StakingComponent;