// src/utils/crypto.ts
export const encryptData = async (data: string, password: string) => {
  const salt = window.crypto.getRandomValues(new Uint8Array(16)); // Uint8Array с ArrayBuffer
  const iv = window.crypto.getRandomValues(new Uint8Array(12));   // Uint8Array с ArrayBuffer
  const textEncoder = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt, // salt как Uint8Array (BufferSource)
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt'],
  );
  const encryptedData = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv }, // iv как Uint8Array (BufferSource)
    key,
    textEncoder.encode(data),
  );
  return { encryptedData: new Uint8Array(encryptedData), salt, iv };
};

export const decryptData = async (
  encryptedData: Uint8Array,
  password: string,
  salt: Uint8Array,
  iv: Uint8Array
): Promise<string> => {
  const textEncoder = new TextEncoder();
  const textDecoder = new TextDecoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    'raw',
    textEncoder.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveKey'],
  );
  const key = await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt, // salt как Uint8Array (BufferSource)
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    true,
    ['decrypt'],
  );
  const decryptedData = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: iv }, // iv как Uint8Array (BufferSource)
    key,
    encryptedData, // encryptedData как Uint8Array (BufferSource)
  );
  return textDecoder.decode(decryptedData);
};