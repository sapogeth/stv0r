import React, { useEffect, useState } from 'react';
import { useVoting } from '../utils/voting';
import { useCurrentAccount } from '@mysten/dapp-kit';

const VotingPage: React.FC = () => {
    const { initVoting, vote, endVoting, getResults } = useVoting();
    const account = useCurrentAccount();
    const [objectId, setObjectId] = useState<string>('');
    const [options, setOptions] = useState<string[]>([]);
    const [votes, setVotes] = useState<number[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState<boolean>(false);

    // Загружаем результаты только если есть Object ID
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
    }, [objectId]);

    const handleInitVoting = async () => {
        setLoading(true);
        setError(null);
        try {
            const newObjectId = await initVoting();
            if (newObjectId) {
                setObjectId(newObjectId);
                setIsInitialized(true);
                alert(`Voting initialized! Object ID: ${newObjectId}`);
            } else {
                setError('Failed to get Object ID from transaction. Check console for details.');
                alert('Voting may have been initialized, but Object ID could not be retrieved. Check console for details.');
            }
        } catch (err: any) {
            console.error('Error initializing voting:', err);
            setError(err.message || 'Failed to initialize voting.');
            alert(`Failed to initialize voting: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleVote = async (optionIndex: number) => {
        if (!objectId) {
            alert('Please initialize voting first or set a valid Object ID.');
            return;
        }

        setLoading(true);
        try {
            await vote(objectId, optionIndex);
            alert(`Voted for ${options[optionIndex] || `option ${optionIndex + 1}`}!`);
            // Обновляем результаты сразу после голосования
            const result = await getResults(objectId);
            setOptions(result.options);
            setVotes(result.votes);
        } catch (err: any) {
            console.error('Error voting:', err);
            alert(`Failed to vote: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleEndVoting = async () => {
        if (!objectId) {
            alert('Please initialize voting first or set a valid Object ID.');
            return;
        }

        setLoading(true);
        try {
            await endVoting(objectId);
            alert('Voting ended!');
        } catch (err: any) {
            console.error('Error ending voting:', err);
            alert(`Failed to end voting: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mx-auto p-4 max-w-2xl">
            <h1 className="text-3xl font-bold mb-6 text-center">Voting Page</h1>
            
            {!account && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    Please connect your wallet to interact with voting.
                </div>
            )}

            {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    Error: {error}
                </div>
            )}

            {/* Step 1: Initialize Voting */}
            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Step 1: Initialize Voting</h2>
                <button
                    onClick={handleInitVoting}
                    disabled={!account || loading}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {loading ? 'Initializing...' : 'Initialize Voting'}
                </button>
                {isInitialized && (
                    <div className="mt-2 text-green-600">
                        ✓ Voting initialized! Check console for Object ID.
                    </div>
                )}
            </div>

            {/* Step 2: Set Object ID */}
            <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                <h2 className="text-xl font-semibold mb-4">Step 2: Set Object ID</h2>
                <p className="text-gray-600 mb-3">
                    After initializing voting, find the Object ID in the console and enter it here:
                </p>
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={objectId}
                        onChange={(e) => setObjectId(e.target.value)}
                        placeholder="Enter Object ID here..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        onClick={() => setObjectId('')}
                        className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
                    >
                        Clear
                    </button>
                </div>
                {objectId && (
                    <div className="mt-2 text-green-600">
                        ✓ Object ID set: {objectId.substring(0, 20)}...
                    </div>
                )}
            </div>

            {/* Step 3: Voting */}
            {objectId && (
                <div className="bg-white shadow-md rounded-lg p-6 mb-6">
                    <h2 className="text-xl font-semibold mb-4">Step 3: Vote</h2>
                    <div className="space-y-3">
                        {options.length > 0 ? (
                            options.map((option, index) => (
                                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 rounded">
                                    <div>
                                        <span className="font-medium">{option}</span>
                                        <span className="ml-2 text-gray-600">
                                            ({votes[index] !== undefined ? votes[index] : 0} votes)
                                        </span>
                                    </div>
                                    <button
                                        onClick={() => handleVote(index)}
                                        disabled={!account || loading}
                                        className="bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-3 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        Vote
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="text-gray-500">
                                Loading voting options...
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Step 4: End Voting */}
            {objectId && (
                <div className="bg-white shadow-md rounded-lg p-6">
                    <h2 className="text-xl font-semibold mb-4">Step 4: End Voting</h2>
                    <button
                        onClick={handleEndVoting}
                        disabled={!account || loading}
                        className="bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Ending...' : 'End Voting'}
                    </button>
                </div>
            )}
        </div>
    );
};

export default VotingPage;

