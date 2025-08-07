import { Ed25519Keypair, SuiClient, getFullnodeUrl, TransactionBlock } from '@mysten/sui.js';
import { EnokiClient } from '@mysten/enoki';

const enoki = new EnokiClient({ apiKey: process.env.REACT_APP_ENOKI_API_KEY });
const client = new SuiClient({ url: getFullnodeUrl('mainnet') });

// Инициировать OAuth-логин
export async function initiateOAuthLogin() {
  const clientId = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const redirectUri = process.env.REACT_APP_REDIRECT_URI;
  const keypair = Ed25519Keypair.generate();
  const ephemeralPublicKey = keypair.getPublicKey();
  const maxEpoch = 1000; // Установите в зависимости от текущей эпохи Sui
  const jwtRandomness = crypto.randomBytes(16).toString('hex');
  
  // Сохраняем ключевую пару в localStorage для использования в callback
  localStorage.setItem('ephemeralKeypair', JSON.stringify(keypair.export()));
  localStorage.setItem('jwtRandomness', jwtRandomness);
  localStorage.setItem('maxEpoch', maxEpoch);

  // Формируем nonce (упрощённый пример, используйте poseidonHash из SDK)
  const nonce = Buffer.from(poseidonHash([
    BigInt(ephemeralPublicKey.toSuiAddress()),
    maxEpoch,
    jwtRandomness
  ])).toString('base64url');

  const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=id_token&scope=openid%20profile%20email&nonce=${nonce}`;
  window.location.href = authUrl;
}

// Обработка callback
export async function handleOAuthCallback() {
  const urlParams = new URLSearchParams(window.location.hash.slice(1) || window.location.search);
  const jwt = urlParams.get('id_token');
  if (!jwt) throw new Error('JWT not found');

  // Восстановление ключевой пары
  const keypairData = JSON.parse(localStorage.getItem('ephemeralKeypair'));
  const keypair = Ed25519Keypair.fromSecretKey(Buffer.from(keypairData.privateKey, 'hex'));
  const ephemeralPublicKey = keypair.getPublicKey();
  const maxEpoch = parseInt(localStorage.getItem('maxEpoch'));
  const jwtRandomness = localStorage.getItem('jwtRandomness');

  // Получение соли
  const userSalt = await enoki.getSalt({ jwt });

  // Генерация ZK-доказательства
  const zkProof = await enoki.getZkProof({
    jwt,
    userSalt,
    ephemeralPublicKey,
    jwtRandomness,
    maxEpoch
  });

  // Получение адреса
  const zkLoginAddress = await enoki.getAddress({ jwt, userSalt });

  // Пример транзакции
  const tx = new TransactionBlock();
  tx.transferObjects([tx.object('0x...')], zkLoginAddress); // Замените '0x...' на реальный объект
  const signature = keypair.signData(tx.serialize());

  // Отправка транзакции
  const response = await client.executeTransactionBlock({
    transactionBlock: tx,
    signature,
    zkProof
  });

  console.log('Transaction executed:', response);
  return zkLoginAddress;
}