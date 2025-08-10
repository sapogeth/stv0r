import { useState } from 'react'; // Removed useEffect as it's not being used
import { WALRUS_AGGREGATOR_URL } from '../services/walrus';
import { decryptData } from '../utils/crypto';

export function ProtectedPage() {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const checkPassword = async () => {
    const blobId = localStorage.getItem('blobId');
    if (!blobId) {
      setError('Password not set. Go to the settings page.');
      return;
    }
    try {
      const response = await fetch(`${WALRUS_AGGREGATOR_URL}/v1/blobs/${blobId}`);
      if (response.status === 200) {
        const storageData = await response.json();
        const decryptedData = await decryptData(
          new Uint8Array(storageData.encryptedData),
          password,
          new Uint8Array(storageData.salt),
          new Uint8Array(storageData.iv)
        );
        if (decryptedData === 'access_granted') {
          setIsAuthorized(true);
          setError(null);
        } else {
          setError('Incorrect password');
        }
      } else {
        setError('Error downloading blob');
      }
    } catch (error) {
      setError('Error loading or decrypting data');
    }
  };

  if (isAuthorized) {
    return <div>Protected content is here</div>;
  }

  return (
    <div>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Enter your password"
      />
      <button onClick={checkPassword}>Verify password</button>
      {error && <div style={{ color: 'red' }}>{error}</div>}
    </div>
  );
}