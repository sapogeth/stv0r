// src/components/SwapComponent.tsx

import React, { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import {
  swapSuiToWal,
  swapWalToSui,
  getSwapQuote,
  getUserTokenBalances,
  getUserSwapHistory,
  getPoolInfo
} from '../services/swapService';
import { canSponsorTransaction, getRemainingSponsored } from '../services/transactionSponsorService';

interface SwapComponentProps {
  onSwapComplete?: (txDigest: string) => void;
}

const SwapComponent: React.FC<SwapComponentProps> = ({ onSwapComplete }) => {
  const [fromToken, setFromToken] = useState<'SUI' | 'WAL'>('SUI');
  const [toToken, setToToken] = useState<'SUI' | 'WAL'>('WAL');
  const [fromAmount, setFromAmount] = useState<string>('');
  const [toAmount, setToAmount] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [balances, setBalances] = useState({ sui: 0, wal: 0 });
  const [quote, setQuote] = useState<any>(null);
  const [swapHistory, setSwapHistory] = useState<any[]>([]);
  const [poolInfo, setPoolInfo] = useState<any>(null);
  const [remainingSponsored, setRemainingSponsored] = useState(0);

  const account = useCurrentAccount();

  useEffect(() => {
    if (account?.address) {
      loadUserData();
    }
  }, [account]);

  useEffect(() => {
    if (fromAmount && parseFloat(fromAmount) > 0) {
      getQuote();
    } else {
      setToAmount('');
      setQuote(null);
    }
  }, [fromAmount, fromToken, toToken]);

  const loadUserData = async () => {
    if (!account?.address) return;

    try {
      const [userBalances, history, pool] = await Promise.all([
        getUserTokenBalances(account.address),
        getUserSwapHistory(account.address),
        getPoolInfo()
      ]);

      setBalances(userBalances);
      setSwapHistory(history);
      setPoolInfo(pool);
      setRemainingSponsored(getRemainingSponsored(account.address));
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const getQuote = async () => {
    if (!fromAmount || parseFloat(fromAmount) <= 0) return;

    try {
      const quoteResult = await getSwapQuote(fromToken, toToken, parseFloat(fromAmount));
      setQuote(quoteResult);
      setToAmount(quoteResult.amountOut.toString());
    } catch (error) {
      console.error('Error getting quote:', error);
      setQuote(null);
      setToAmount('');
    }
  };

  const handleSwap = async () => {
    if (!account?.address || !fromAmount || parseFloat(fromAmount) <= 0) {
      alert('Enter a valid amount to swap');
      return;
    }

    setLoading(true);
    try {
      let result;
      
      if (fromToken === 'SUI') {
        result = await swapSuiToWal(account.address, parseFloat(fromAmount));
      } else {
        result = await swapWalToSui(account.address, parseFloat(fromAmount));
      }

      if (result.success) {
        alert(`Swap successful! Received: ${result.amountOut?.toFixed(4)} ${toToken}`);
        setFromAmount('');
        setToAmount('');
        setQuote(null);
        await loadUserData();
        
        if (onSwapComplete && result.txDigest) {
          onSwapComplete(result.txDigest);
        }
      } else {
        alert(`Swap error: ${result.error}`);
      }
    } catch (error) {
      console.error('Error during swap execution:', error);
      alert('An error occurred during the swap');
    } finally {
      setLoading(false);
    }
  };

  const switchTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount('');
    setQuote(null);
  };

  const setMaxAmount = () => {
    const maxAmount = fromToken === 'SUI' ? balances.sui : balances.wal;
    setFromAmount(maxAmount.toString());
  };

  if (!account) {
    return (
      <div className="swap-component">
        <div className="connect-wallet-message">
          <p>Connect your wallet to use the swap feature</p>
        </div>
      </div>
    );
  }

  return (
    <div className="swap-component">
      <div className="swap-header">
        <h2>Token Swap</h2>
        {remainingSponsored > 0 && (
          <div className="sponsored-info">
            <span className="sponsored-badge">
              🎁 Free transactions remaining: {remainingSponsored}
            </span>
          </div>
        )}
      </div>

      <div className="swap-form">
        <div className="token-input-group">
          <div className="token-input">
            <div className="token-header">
              <span>You Pay</span>
              <span className="balance">
                Balance: {fromToken === 'SUI' ? balances.sui.toFixed(4) : balances.wal.toFixed(4)} {fromToken}
              </span>
            </div>
            <div className="input-row">
              <input
                type="number"
                placeholder="0.00"
                value={fromAmount}
                onChange={(e) => setFromAmount(e.target.value)}
                disabled={loading}
              />
              <div className="token-selector">
                <span className="token-symbol">{fromToken}</span>
                <button className="max-button" onClick={setMaxAmount} disabled={loading}>
                  MAX
                </button>
              </div>
            </div>
          </div>

          <div className="swap-arrow">
            <button className="swap-button" onClick={switchTokens} disabled={loading}>
              ⇅
            </button>
          </div>

          <div className="token-input">
            <div className="token-header">
              <span>You Receive</span>
              <span className="balance">
                Balance: {toToken === 'SUI' ? balances.sui.toFixed(4) : balances.wal.toFixed(4)} {toToken}
              </span>
            </div>
            <div className="input-row">
              <input
                type="number"
                placeholder="0.00"
                value={toAmount}
                readOnly
                disabled
              />
              <div className="token-selector">
                <span className="token-symbol">{toToken}</span>
              </div>
            </div>
          </div>
        </div>

        {quote && (
          <div className="swap-details">
            <div className="detail-row">
              <span>Rate:</span>
              <span>1 {fromToken} = {(quote.amountOut / parseFloat(fromAmount)).toFixed(6)} {toToken}</span>
            </div>
            <div className="detail-row">
              <span>Price Impact:</span>
              <span className={quote.priceImpact > 5 ? 'high-impact' : 'low-impact'}>
                {quote.priceImpact}%
              </span>
            </div>
            <div className="detail-row">
              <span>Fee:</span>
              <span>{quote.fee} {fromToken}</span>
            </div>
          </div>
        )}

        <button
          className="swap-execute-button"
          onClick={handleSwap}
          disabled={loading || !fromAmount || parseFloat(fromAmount) <= 0 || !quote}
        >
          {loading ? 'Swapping...' : `Swap ${fromToken} for ${toToken}`}
        </button>
      </div>

      {poolInfo && (
        <div className="pool-info">
          <h3>Pool Information</h3>
          <div className="pool-stats">
            <div className="stat">
              <span>SUI Reserve:</span>
              <span>{poolInfo.suiReserve.toLocaleString()}</span>
            </div>
            <div className="stat">
              <span>WAL Reserve:</span>
              <span>{poolInfo.walReserve.toLocaleString()}</span>
            </div>
            <div className="stat">
              <span>Current Rate:</span>
              <span>1 SUI = {poolInfo.currentPrice} WAL</span>
            </div>
          </div>
        </div>
      )}

      {swapHistory.length > 0 && (
        <div className="swap-history">
          <h3>Swap History</h3>
          <div className="history-list">
            {swapHistory.slice(0, 5).map((swap, index) => (
              <div key={index} className="history-item">
                <div className="swap-info">
                  <span className="swap-pair">
                    {swap.amountIn} {swap.fromToken} → {swap.amountOut} {swap.toToken}
                  </span>
                  <span className="swap-date">
                    {swap.timestamp.toLocaleDateString()}
                  </span>
                </div>
                <div className="tx-hash">
                  <a 
                    href={`https://testnet.suivision.xyz/txblock/${swap.txDigest}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {swap.txDigest.slice(0, 8)}...
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SwapComponent;