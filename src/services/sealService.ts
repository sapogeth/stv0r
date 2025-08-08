// src/services/sealService.ts

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// Конфигурация Seal
const SEAL_PACKAGE_ID = '0x...'; // ID пакета Seal (нужно будет заменить)
const SUI_NETWORK = 'testnet';

export interface SealEncryptionResult {
  encryptedData: string;
  accessPolicyId: string;
  encryptionKeyId: string;
}

export interface AccessPolicy {
  id: string;
  owner: string;
  allowedUsers: string[];
  conditions: AccessCondition[];
  createdAt: Date;
  expiresAt?: Date;
}

export interface AccessCondition {
  type: 'wallet_ownership' | 'nft_ownership' | 'token_balance' | 'time_based';
  value: any;
}

/**
 * Шифрует данные с помощью Seal
 * @param data данные для шифрования
 * @param accessPolicy политика доступа
 * @param keypair ключевая пара для подписи
 * @returns Promise<SealEncryptionResult> результат шифрования
 */
export async function encryptWithSeal(
  data: any,
  accessPolicy: AccessPolicy,
  keypair: Ed25519Keypair
): Promise<SealEncryptionResult> {
  try {
    const client = new SuiClient({ url: `https://fullnode.${SUI_NETWORK}.sui.io:443` });
    
    // Сериализуем данные
    const serializedData = JSON.stringify(data);
    
    // Создаем транзакцию для шифрования через Seal
    const tx = new Transaction();
    
    // Создаем политику доступа
    const policyTx = tx.moveCall({
      target: `${SEAL_PACKAGE_ID}::access_policy::create`,
      arguments: [
        tx.pure.vector('address', accessPolicy.allowedUsers),
        tx.pure.string(JSON.stringify(accessPolicy.conditions)),
        tx.pure.option('u64', accessPolicy.expiresAt ? [accessPolicy.expiresAt.getTime()] : [])
      ]
    });
    
    // Шифруем данные
    const encryptTx = tx.moveCall({
      target: `${SEAL_PACKAGE_ID}::encryption::encrypt`,
      arguments: [
        tx.pure.string(serializedData),
        policyTx
      ]
    });
    
    // Подписываем и отправляем транзакцию
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showObjectChanges: true
      }
    });
    
    // Извлекаем результаты из транзакции
    const createdObjects = result.objectChanges?.filter(
      change => change.type === 'created'
    );
    
    if (!createdObjects || createdObjects.length < 2) {
      throw new Error('Не удалось создать зашифрованные данные');
    }
    
    return {
      encryptedData: 'encrypted_' + result.digest, // В реальности это будет зашифрованная строка
      accessPolicyId: createdObjects[0].objectId,
      encryptionKeyId: createdObjects[1].objectId
    };
    
  } catch (error) {
    console.error('Ошибка шифрования с Seal:', error);
    throw error;
  }
}

/**
 * Расшифровывает данные с помощью Seal
 * @param encryptedData зашифрованные данные
 * @param accessPolicyId ID политики доступа
 * @param keypair ключевая пара для подписи
 * @returns Promise<any> расшифрованные данные
 */
export async function decryptWithSeal(
  encryptedData: string,
  accessPolicyId: string,
  keypair: Ed25519Keypair
): Promise<any> {
  try {
    const client = new SuiClient({ url: `https://fullnode.${SUI_NETWORK}.sui.io:443` });
    
    const tx = new Transaction();
    
    // Расшифровываем данные
    tx.moveCall({
      target: `${SEAL_PACKAGE_ID}::encryption::decrypt`,
      arguments: [
        tx.pure.string(encryptedData),
        tx.object(accessPolicyId)
      ]
    });
    
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true,
        showEvents: true
      }
    });
    
    // В реальной реализации здесь будет извлечение расшифрованных данных из событий
    // Пока возвращаем mock данные
    return { decrypted: true, data: 'decrypted_data' };
    
  } catch (error) {
    console.error('Ошибка расшифровки с Seal:', error);
    throw error;
  }
}

/**
 * Создает политику доступа для никнейма NFT
 * @param owner владелец никнейма
 * @param allowedUsers разрешенные пользователи
 * @param conditions условия доступа
 * @returns AccessPolicy политика доступа
 */
export function createNicknameAccessPolicy(
  owner: string,
  allowedUsers: string[] = [],
  conditions: AccessCondition[] = []
): AccessPolicy {
  return {
    id: 'policy_' + Date.now(),
    owner,
    allowedUsers: [owner, ...allowedUsers],
    conditions: [
      {
        type: 'wallet_ownership',
        value: { requiredWallet: owner }
      },
      ...conditions
    ],
    createdAt: new Date()
  };
}

/**
 * Шифрует метаданные никнейма для безопасного хранения
 * @param nickname никнейм
 * @param owner владелец
 * @param metadata метаданные
 * @param keypair ключевая пара
 * @returns Promise<SealEncryptionResult> зашифрованные метаданные
 */
export async function encryptNicknameMetadata(
  nickname: string,
  owner: string,
  metadata: any,
  keypair: Ed25519Keypair
): Promise<SealEncryptionResult> {
  const accessPolicy = createNicknameAccessPolicy(owner);
  
  const nicknameData = {
    nickname,
    owner,
    metadata,
    timestamp: new Date().toISOString(),
    type: 'nickname_metadata'
  };
  
  return await encryptWithSeal(nicknameData, accessPolicy, keypair);
}

/**
 * Создает условие доступа на основе владения NFT
 * @param nftId ID NFT токена
 * @returns AccessCondition условие доступа
 */
export function createNFTOwnershipCondition(nftId: string): AccessCondition {
  return {
    type: 'nft_ownership',
    value: { requiredNFT: nftId }
  };
}

/**
 * Создает условие доступа на основе баланса токенов
 * @param tokenType тип токена
 * @param minBalance минимальный баланс
 * @returns AccessCondition условие доступа
 */
export function createTokenBalanceCondition(tokenType: string, minBalance: number): AccessCondition {
  return {
    type: 'token_balance',
    value: { tokenType, minBalance }
  };
}

/**
 * Создает временное условие доступа
 * @param expiresAt время истечения
 * @returns AccessCondition условие доступа
 */
export function createTimeBasedCondition(expiresAt: Date): AccessCondition {
  return {
    type: 'time_based',
    value: { expiresAt: expiresAt.getTime() }
  };
}

/**
 * Проверяет доступность Seal сервиса
 * @returns Promise<boolean> доступен ли сервис
 */
export async function checkSealHealth(): Promise<boolean> {
  try {
    const client = new SuiClient({ url: `https://fullnode.${SUI_NETWORK}.sui.io:443` });
    
    // Проверяем доступность пакета Seal
    const packageInfo = await client.getObject({
      id: SEAL_PACKAGE_ID,
      options: { showContent: true }
    });
    
    return !!packageInfo.data;
  } catch (error) {
    console.error('Seal health check failed:', error);
    return false;
  }
}

/**
 * Получает информацию о политике доступа
 * @param policyId ID политики доступа
 * @returns Promise<AccessPolicy | null> информация о политике
 */
export async function getAccessPolicy(policyId: string): Promise<AccessPolicy | null> {
  try {
    const client = new SuiClient({ url: `https://fullnode.${SUI_NETWORK}.sui.io:443` });
    
    const policyObject = await client.getObject({
      id: policyId,
      options: { showContent: true }
    });
    
    if (!policyObject.data) {
      return null;
    }
    
    // В реальной реализации здесь будет парсинг данных политики
    // Пока возвращаем mock данные
    return {
      id: policyId,
      owner: 'mock_owner',
      allowedUsers: [],
      conditions: [],
      createdAt: new Date()
    };
    
  } catch (error) {
    console.error('Ошибка получения политики доступа:', error);
    return null;
  }
}

