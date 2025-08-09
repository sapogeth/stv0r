import React, { useEffect, useState } from 'react';
import { useVoting } from '../utils/voting';
import { useCurrentAccount } from '@mysten/dapp-kit';
import '../voting.css'

const VotingPage: React.FC = () => {
    const { initVoting, vote, endVoting, getResults } = useVoting();
    const account = useCurrentAccount();
    const [objectId, setObjectId] = useState<string>('');
    const [options, setOptions] = useState<string[]>([]);
    const [votes, setVotes] = useState<number[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);
    const [userMessage, setUserMessage] = useState<string | null>(null);

    // Load results only if there is an Object ID
    useEffect(() => {
        if (!objectId) return;

        let isMounted = true;

        const fetchResults = async () => {
            setError(null);
            try {
                const result = await getResults(objectId);
                if (isMounted) {
                    setOptions(result.options);
                    setVotes(result.votes);
                }
            } catch (err: any) {
                console.error('Error fetching voting results:', err);
                if (isMounted) {
                    setError(err.message || 'Failed to fetch voting results.');
                }
            }
        };

        fetchResults();
        const interval = setInterval(fetchResults, 5000);

        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [objectId, getResults]);

    // Function to show a temporary message to the user
    const showMessage = (msg: string) => {
        setUserMessage(msg);
        setTimeout(() => setUserMessage(null), 4000);
    };

    const handleInitVoting = async () => {
        setLoading(true);
        setError(null);
        try {
            const newObjectId = await initVoting();
            if (newObjectId) {
                setObjectId(newObjectId);
                setIsInitialized(true);
                showMessage(`Голосование инициализировано! ID Объекта: ${newObjectId}`);
            } else {
                setError('Не удалось получить ID Объекта из транзакции.');
            }
        } catch (err: any) {
            console.error('Error initializing voting:', err);
            setError(err.message || 'Не удалось инициализировать голосование.');
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (optionIndex: number) => {
        if (!objectId) {
            setError('Пожалуйста, инициализируйте голосование или укажите ID Объекта.');
            return;
        }

        setLoading(true);
        try {
            await vote(objectId, optionIndex);
            showMessage(`Вы проголосовали за "${options[optionIndex] || `option ${optionIndex + 1}`}"!`);
            // Update results immediately after voting
            const result = await getResults(objectId);
            setOptions(result.options);
            setVotes(result.votes);
        } catch (err: any) {
            console.error('Error voting:', err);
            setError(err.message || 'Не удалось проголосовать.');
        } finally {
            setLoading(false);
        }
    };

    const handleEndVoting = async () => {
        if (!objectId) {
            setError('Пожалуйста, инициализируйте голосование или укажите ID Объекта.');
            return;
        }

        setLoading(true);
        try {
            await endVoting(objectId);
            showMessage('Голосование завершено!');
        } catch (err: any) {
            console.error('Error ending voting:', err);
            setError(err.message || 'Не удалось завершить голосование.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="voting-page-body">
            <div className="voting-container">
                <h1 className="voting-title">Voting Page</h1>
                
                {!account && (
                    <div className="message message-error">
                        Please connect your wallet to interact with voting.
                    </div>
                )}

                {error && (
                    <div className="message message-error">
                        Error: {error}
                    </div>
                )}
                
                {userMessage && (
                     <div className="message message-info">
                        {userMessage}
                    </div>
                )}

                {/* Step 1: Initialize Voting */}
                <div className="voting-card">
                    <h2>Step 1: Initialize Voting</h2>
                    <button
                        onClick={handleInitVoting}
                        disabled={!account || loading}
                        className="voting-button btn-primary"
                    >
                        {loading ? 'Initializing...' : 'Initialize Voting'}
                    </button>
                    {isInitialized && (
                        <div className="message-success">
                            ✓ Voting initialized! Check console for Object ID.
                        </div>
                    )}
                </div>

                {/* Step 2: Set Object ID */}
                <div className="voting-card">
                    <h2>Step 2: Set Object ID</h2>
                    <p>
                        After initializing voting, find the Object ID in the console and enter it here:
                    </p>
                    <div className="voting-input-group">
                        <input
                            type="text"
                            value={objectId}
                            onChange={(e) => setObjectId(e.target.value)}
                            placeholder="Enter Object ID here..."
                            className="voting-input"
                        />
                        <button
                            onClick={() => setObjectId('')}
                            className="voting-button btn-secondary"
                        >
                            Clear
                        </button>
                    </div>
                    {objectId && (
                        <div className="message-success">
                            ✓ Object ID set: {objectId.substring(0, 20)}...
                        </div>
                    )}
                </div>

                {/* Step 3: Voting */}
                {objectId && (
                    <div className="voting-card">
                        <h2>Step 3: Vote</h2>
                        <div className="voting-options-list">
                            {options.length > 0 ? (
                                options.map((option, index) => (
                                    <div key={index} className="voting-option">
                                        <div className="voting-option-details">
                                            <span className="option-name">{option}</span>
                                            <span className="vote-count">
                                                ({votes[index] !== undefined ? votes[index] : 0} votes)
                                            </span>
                                        </div>
                                        <button
                                            onClick={() => handleVote(index)}
                                            disabled={!account || loading}
                                            className="voting-button btn-success"
                                        >
                                            Vote
                                        </button>
                                    </div>
                                ))
                            ) : (
                                <div className="loading-text">
                                    Loading voting options...
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Step 4: End Voting */}
                {objectId && (
                    <div className="voting-card">
                        <h2>Step 4: End Voting</h2>
                        <button
                            onClick={handleEndVoting}
                            disabled={!account || loading}
                            className="voting-button btn-danger"
                        >
                            {loading ? 'Ending...' : 'End Voting'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default VotingPage;
