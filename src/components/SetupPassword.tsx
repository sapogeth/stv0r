import React, { useState } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit'; // If an account is needed
import { WALRUS_PUBLISHER_URL } from '../services/walrus';
import { encryptData, EncryptedData } from '../utils/crypto';

export const SetupPassword: React.FC = () => {
    const currentAccount = useCurrentAccount(); // Added in case it's required
    const [password, setPassword] = useState('');
    const [message, setMessage] = useState<string | null>(null);

    const handleSetup = async () => {
        if (!password) {
            setMessage('Please enter a password');
            return;
        }

        const dataToEncrypt = "access_granted";
        const { encryptedData, salt, iv }: EncryptedData = await encryptData(dataToEncrypt, password);
        const storageData = {
            encryptedData: Array.from(encryptedData),
            salt: Array.from(salt),
            iv: Array.from(iv),
        };

        try {
            const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/blobs?epochs=1`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' }, // Added for JSON
                body: JSON.stringify(storageData),
            });

            if (response.status === 200) {
                const info = await response.json();
                const blobId = info.newlyCreated?.blobObject?.blobId || info.alreadyCertified?.blobId;
                if (blobId) {
                    localStorage.setItem('blobId', blobId);
                    setMessage('Password successfully set!');
                } else {
                    throw new Error('Failed to get blobId from the response');
                }
            } else {
                throw new Error(`Server error: ${response.status}`);
            }
        } catch (error: any) {
            console.error('Error details:', error);
            if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
                localStorage.setItem('encryptedPassword', btoa(JSON.stringify(storageData)));
                setMessage('Walrus server is unavailable. Password saved locally as a backup.');
            } else {
                setMessage(`An error occurred: ${error.message}`);
            }
        }
    };

    return (
        <div>
            <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter a new password"
            />
            <button onClick={handleSetup} disabled={!currentAccount}>
                Set Password
            </button>
            {message && (
                <div style={{ color: message.toLowerCase().includes('error') ? 'red' : 'green' }}>
                    {message}
                </div>
            )}
        </div>
    );
};