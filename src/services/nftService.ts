// src/services/nftService.ts

import { SuiClient } from '@mysten/sui/client';
import { Transaction } from '@mysten/sui/transactions';
import { Ed25519Keypair } from '@mysten/sui/keypairs/ed25519';

// Конфигурация для работы с Sui блокчейном
const SUI_NETWORK = 'testnet'; // или 'mainnet'
const PACKAGE_ID = '0x...'; // ID пакета смарт-контракта (нужно будет заменить)

export interface NFTMetadata {
  name: string;
  description: string;
  image_url?: string;
  attributes: Array<{
    trait_type: string;
    value: string;
  }>;
}

/**
 * Создает NFT никнейм
 * @param nickname никнейм для создания NFT
 * @param owner адрес владельца
 * @param keypair ключевая пара для подписи транзакции
 * @returns Promise<string> ID созданного NFT токена
 */
export async function mintNicknameNFT(
  nickname: string,
  owner: string,
  keypair: Ed25519Keypair
): Promise<string> {
  try {
    const client = new SuiClient({ url: `https://fullnode.${SUI_NETWORK}.sui.io:443` });
    
    // Создаем метаданные для NFT
    const metadata: NFTMetadata = {
      name: `Nickname: ${nickname}`,
      description: `Unique nickname NFT for "${nickname}"`,
      attributes: [
        {
          trait_type: 'Type',
          value: 'Nickname'
        },
        {
          trait_type: 'Length',
          value: nickname.length.toString()
        },
        {
          trait_type: 'Created',
          value: new Date().toISOString()
        }
      ]
    };
    
    // Создаем транзакцию для минтинга NFT
    const tx = new Transaction();
    
    // Вызываем функцию смарт-контракта для создания NFT
    // Это пример - нужно будет адаптировать под реальный смарт-контракт
    tx.moveCall({
      target: `${PACKAGE_ID}::nickname_nft::mint`,
      arguments: [
        tx.pure.string(nickname),
        tx.pure.string(JSON.stringify(metadata)),
        tx.pure.address(owner)
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
    
    // Извлекаем ID созданного NFT из результата
    const createdObjects = result.objectChanges?.filter(
      change => change.type === 'created'
    );
    
    if (createdObjects && createdObjects.length > 0) {
      return createdObjects[0].objectId;
    }
    
    throw new Error('Не удалось получить ID созданного NFT');
    
  } catch (error) {
    console.error('Ошибка при создании NFT:', error);
    throw error;
  }
}

/**
 * Переводит NFT другому пользователю
 * @param tokenId ID NFT токена
 * @param recipient адрес получателя
 * @param keypair ключевая пара отправителя
 * @returns Promise<string> хеш транзакции
 */
export async function transferNicknameNFT(
  tokenId: string,
  recipient: string,
  keypair: Ed25519Keypair
): Promise<string> {
  try {
    const client = new SuiClient({ url: `https://fullnode.${SUI_NETWORK}.sui.io:443` });
    
    const tx = new Transaction();
    
    // Переводим NFT
    tx.transferObjects([tx.object(tokenId)], recipient);
    
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true
      }
    });
    
    return result.digest;
    
  } catch (error) {
    console.error('Ошибка при переводе NFT:', error);
    throw error;
  }
}

/**
 * Получает информацию о NFT
 * @param tokenId ID NFT токена
 * @returns Promise<any> информация о NFT
 */
export async function getNFTInfo(tokenId: string): Promise<any> {
  try {
    const client = new SuiClient({ url: `https://fullnode.${SUI_NETWORK}.sui.io:443` });
    
    const object = await client.getObject({
      id: tokenId,
      options: {
        showContent: true,
        showDisplay: true,
        showOwner: true
      }
    });
    
    return object;
    
  } catch (error) {
    console.error('Ошибка при получении информации о NFT:', error);
    throw error;
  }
}

/**
 * Получает все NFT пользователя
 * @param ownerAddress адрес владельца
 * @returns Promise<any[]> массив NFT
 */
export async function getUserNFTs(ownerAddress: string): Promise<any[]> {
  try {
    const client = new SuiClient({ url: `https://fullnode.${SUI_NETWORK}.sui.io:443` });
    
    const objects = await client.getOwnedObjects({
      owner: ownerAddress,
      filter: {
        StructType: `${PACKAGE_ID}::nickname_nft::NicknameNFT`
      },
      options: {
        showContent: true,
        showDisplay: true
      }
    });
    
    return objects.data;
    
  } catch (error) {
    console.error('Ошибка при получении NFT пользователя:', error);
    throw error;
  }
}

/**
 * Создает листинг NFT на маркетплейсе (через смарт-контракт)
 * @param tokenId ID NFT токена
 * @param price цена в SUI
 * @param keypair ключевая пара владельца
 * @returns Promise<string> хеш транзакции
 */
export async function listNFTForSale(
  tokenId: string,
  price: number,
  keypair: Ed25519Keypair
): Promise<string> {
  try {
    const client = new SuiClient({ url: `https://fullnode.${SUI_NETWORK}.sui.io:443` });
    
    const tx = new Transaction();
    
    // Вызываем функцию смарт-контракта для создания листинга
    tx.moveCall({
      target: `${PACKAGE_ID}::marketplace::list_for_sale`,
      arguments: [
        tx.object(tokenId),
        tx.pure.u64(price * 1000000000) // Конвертируем в MIST (1 SUI = 10^9 MIST)
      ]
    });
    
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true
      }
    });
    
    return result.digest;
    
  } catch (error) {
    console.error('Ошибка при создании листинга:', error);
    throw error;
  }
}

/**
 * Покупает NFT с маркетплейса
 * @param listingId ID листинга
 * @param payment объект платежа
 * @param keypair ключевая пара покупателя
 * @returns Promise<string> хеш транзакции
 */
export async function buyNFTFromMarketplace(
  listingId: string,
  payment: string,
  keypair: Ed25519Keypair
): Promise<string> {
  try {
    const client = new SuiClient({ url: `https://fullnode.${SUI_NETWORK}.sui.io:443` });
    
    const tx = new Transaction();
    
    // Вызываем функцию смарт-контракта для покупки
    tx.moveCall({
      target: `${PACKAGE_ID}::marketplace::buy_nft`,
      arguments: [
        tx.object(listingId),
        tx.object(payment)
      ]
    });
    
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true
      }
    });
    
    return result.digest;
    
  } catch (error) {
    console.error('Ошибка при покупке NFT:', error);
    throw error;
  }
}

/**
 * Отменяет листинг NFT
 * @param listingId ID листинга
 * @param keypair ключевая пара владельца
 * @returns Promise<string> хеш транзакции
 */
export async function cancelNFTListing(
  listingId: string,
  keypair: Ed25519Keypair
): Promise<string> {
  try {
    const client = new SuiClient({ url: `https://fullnode.${SUI_NETWORK}.sui.io:443` });
    
    const tx = new Transaction();
    
    tx.moveCall({
      target: `${PACKAGE_ID}::marketplace::cancel_listing`,
      arguments: [tx.object(listingId)]
    });
    
    const result = await client.signAndExecuteTransaction({
      signer: keypair,
      transaction: tx,
      options: {
        showEffects: true
      }
    });
    
    return result.digest;
    
  } catch (error) {
    console.error('Ошибка при отмене листинга:', error);
    throw error;
  }
}

