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
            console.error('Error loading nickname ownership:', error);
            showMessage('error', 'Error loading nickname data');
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
                loadOwnership(); // Reload the data
            } else {
                showMessage('error', result.message);
            }
        } catch (error) {
            console.error('Error changing active nickname:', error);
            showMessage('error', 'An error occurred while changing the nickname');
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
                <p>Connect your wallet to manage nicknames</p>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="nickname-manager">
                <div className="loading">Loading nicknames...</div>
            </div>
        );
    }

    if (!ownership) {
        return (
            <div className="nickname-manager">
                <p>Error loading nickname data</p>
                <button onClick={loadOwnership} className="retry-btn">
                    Try again
                </button>
            </div>
        );
    }

    return (
        <div className="nickname-manager">
            <div className="nickname-header">
                <h3>Nickname Management</h3>
                <div className="nickname-stats">
                    <span className="owned-count">
                        {ownership.ownedNicknames.length}/4 nicknames
                    </span>
                    {ownership.canBuyMore && (
                        <span className="can-buy-more">
                            Can buy {ownership.remainingSlots} more
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
                    <p>You don't have any NFT nicknames yet</p>
                    <p>Buy a nickname in the marketplace to get started!</p>
                </div>
            ) : (
                <div className="nicknames-list">
                    <h4>Your Nicknames:</h4>
                    {ownership.ownedNicknames.map((nickname) => (
                        <div
                            key={nickname}
                            className={`nickname-item ${nickname === ownership.activeNickname ? 'active' : ''}`}
                        >
                            <div className="nickname-info">
                                <span className="nickname-name">@{nickname}</span>
                                {nickname === ownership.activeNickname && (
                                    <span className="active-badge">Active</span>
                                )}
                            </div>

                            {nickname !== ownership.activeNickname && (
                                <button
                                    onClick={() => handleSetActiveNickname(nickname)}
                                    disabled={changingActive}
                                    className="set-active-btn"
                                >
                                    {changingActive ? 'Changing...' : 'Set as Active'}
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
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>

                {ownership.canBuyMore && (
                    <div className="buy-more-info">
                        <p>💡 You can buy {ownership.remainingSlots} more nickname(s) in the marketplace</p>
                    </div>
                )}

                {!ownership.canBuyMore && (
                    <div className="limit-reached">
                        <p>🔒 Nickname limit reached (4/4)</p>
                        <p>Sell a nickname to free up a slot for a new one</p>
                    </div>
                )}
            </div>

            <div className="nickname-help">
                <h5>How it works:</h5>
                <ul>
                    <li>Each user can own a maximum of 4 nicknames</li>
                    <li>One nickname is always active - it's displayed in chats and your profile</li>
                    <li>You can switch between your nicknames</li>
                    <li>Nicknames can be sold in the marketplace</li>
                </ul>
            </div>
        </div>
    );
};

export default NicknameOwnershipManager;