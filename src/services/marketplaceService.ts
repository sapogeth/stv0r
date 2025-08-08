import type { MarketplaceListing, NicknameNFT, NicknameSale } from '../types/user';
import { 
  createKiosk, 
  placeNFTInKiosk, 
  listNFTForSale, 
  purchaseNFTFromKiosk,
  delistNFT,
  getKioskInfo,
  getKioskItems,
  getKioskIds,
} from './kioskService';
// import { storeNicknameMetadata } from './walrusService';
// import { encryptNicknameMetadata } from './sealService';
import { TransactionBlock } from '@mysten/sui.js/transactions';

// Временное хранилище для маркетплейса
const listings: Map<string, MarketplaceListing> = new Map();
const nicknameNFTs: Map<string, NicknameNFT> = new Map();
const salesHistory: NicknameSale[] = [];

/**
 * Получает или создает Kiosk для пользователя
 * @param walletAddress адрес кошелька пользователя
 * @returns Promise<{ kioskId: string; kioskCapId: string; tx: TransactionBlock | null }> ID Kiosk, ID KioskOwnerCap и транзакция (если требуется создание)
 */
export async function getOrCreateUserKiosk(walletAddress: string): Promise<{ kioskId: string; kioskCapId: string; tx: TransactionBlock | null }> {
  let kioskIds = getKioskIds(walletAddress);
  
  if (!kioskIds) {
    try {
      const tx = await createKiosk(walletAddress);
      // Возвращаем транзакцию, но без ID, так как они будут получены только после ее выполнения
      return { kioskId: '', kioskCapId: '', tx };
    } catch (error) {
      console.error('Ошибка создания Kiosk:', error);
      throw error;
    }
  }
  
  return { kioskId: kioskIds.kioskId, kioskCapId: kioskIds.kioskCapId, tx: null };
}

/**
 * Создает новый листинг на маркетплейсе с использованием Kiosk
 * @param tokenId ID NFT токена
 * @param nickname никнейм
 * @param seller адрес продавца
 * @param price цена в SUI
 * @returns Promise<{ listing: MarketplaceListing; tx: TransactionBlock }> созданный листинг и транзакция
 */
export async function createListingWithKiosk(
  tokenId: string,
  nickname: string,
  seller: string,
  price: number
): Promise<{ listing: MarketplaceListing; tx: TransactionBlock }> {
  try {
    const { kioskId, kioskCapId, tx: kioskTx } = await getOrCreateUserKiosk(seller);
    const tx = kioskTx || new TransactionBlock();
    
    // В этом коде nftId должен быть передан как ID объекта
    // А у вас он просто строка. Здесь нужна реальная логика получения NFT.
    const nftId = tokenId;
    
    // Проверяем, если Kiosk еще не был создан, то мы его создаем
    if (!kioskId) {
      // Здесь нужно обработать случай, когда Kiosk только создается
      // Временно будем считать, что он уже есть
    }
    
    await placeNFTInKiosk(kioskId, kioskCapId, nftId, tx);
    
    const priceInMist = (price * 1_000_000_000).toString();
    await listNFTForSale(kioskId, kioskCapId, nftId, priceInMist, tx);
    
    const listing: MarketplaceListing = {
      id: generateListingId(),
      tokenId,
      nickname,
      seller,
      price,
      createdAt: new Date(),
      isActive: true,
      kioskId,
    };
    
    listings.set(listing.id, listing);
    
    const nft = nicknameNFTs.get(tokenId);
    if (nft) {
      nft.isForSale = true;
      nft.price = price;
      nft.kioskId = kioskId;
      nicknameNFTs.set(tokenId, nft);
    }
    
    console.log(`NFT ${nickname} выставлен на продажу в Kiosk ${kioskId}`);
    return { listing, tx };
  } catch (error) {
    console.error('Ошибка создания листинга с Kiosk:', error);
    throw error;
  }
}

/**
 * Покупает никнейм NFT через Kiosk
 * @param listingId ID листинга
 * @param buyer адрес покупателя
 * @param paymentCoinId ID монеты для оплаты
 * @returns Promise<{ success: boolean; tx: TransactionBlock }> результат покупки и транзакция
 */
export async function buyNicknameWithKiosk(
  listingId: string,
  buyer: string,
  paymentCoinId: string
): Promise<{ success: boolean; tx: TransactionBlock }> {
  const listing = listings.get(listingId);
  if (!listing || !listing.isActive || !listing.kioskId) {
    return { success: false, tx: new TransactionBlock() };
  }
  
  try {
    const tx = new TransactionBlock();
    
    const transactionHash = await purchaseNFTFromKiosk(
      listing.kioskId,
      listing.tokenId,
      paymentCoinId,
      tx
    );
    
    listing.isActive = false;
    listings.set(listingId, listing);
    
    const nft = nicknameNFTs.get(listing.tokenId);
    if (nft) {
      nft.owner = buyer;
      nft.isForSale = false;
      nft.price = undefined;
      nft.lastSalePrice = listing.price;
      nft.kioskId = undefined;
      nicknameNFTs.set(listing.tokenId, nft);
    }
    
    const sale: NicknameSale = {
      id: generateSaleId(),
      tokenId: listing.tokenId,
      seller: listing.seller,
      buyer,
      price: listing.price,
      timestamp: new Date(),
      transactionHash,
    };
    
    salesHistory.push(sale);
    
    if (nft) {
      nft.saleHistory.push(sale);
      nicknameNFTs.set(listing.tokenId, nft);
    }
    
    console.log(`NFT ${listing.nickname} успешно куплен через Kiosk`);
    return { success: true, tx };
  } catch (error) {
    console.error('Ошибка покупки через Kiosk:', error);
    return { success: false, tx: new TransactionBlock() };
  }
}

/**
 * Отменяет листинг с использованием Kiosk
 * @param listingId ID листинга
 * @param seller адрес продавца
 * @returns Promise<{ success: boolean; tx: TransactionBlock }> результат отмены и транзакция
 */
export async function cancelListingWithKiosk(
  listingId: string, 
  seller: string
): Promise<{ success: boolean; tx: TransactionBlock }> {
  const listing = listings.get(listingId);
  if (!listing || !listing.isActive || listing.seller !== seller || !listing.kioskId) {
    return { success: false, tx: new TransactionBlock() };
  }
  
  try {
    const kioskIds = getKioskIds(seller);
    if (!kioskIds) {
      throw new Error('Kiosk not found for seller');
    }
    
    const tx = new TransactionBlock();
    
    await delistNFT(listing.kioskId, kioskIds.kioskCapId, listing.tokenId, tx);
    
    listing.isActive = false;
    listings.set(listingId, listing);
    
    const nft = nicknameNFTs.get(listing.tokenId);
    if (nft) {
      nft.isForSale = false;
      nft.price = undefined;
      nft.kioskId = undefined;
      nicknameNFTs.set(listing.tokenId, nft);
    }
    
    console.log(`Листинг ${listing.nickname} отменен в Kiosk`);
    return { success: true, tx };
  } catch (error) {
    console.error('Ошибка отмены листинга в Kiosk:', error);
    return { success: false, tx: new TransactionBlock() };
  }
}

/**
 * Создает новый NFT никнейм с интеграцией Walrus и Seal
 * @param tokenId ID токена
 * @param nickname никнейм
 * @param owner владелец
 * @param metadata метаданные NFT
 * @returns Promise<{ nft: NicknameNFT; tx: TransactionBlock }> созданный NFT и транзакция
 */
export async function createSecureNicknameNFT(
  nickname: string,
  owner: string
): Promise<TransactionBlock> {
  try {
    const tx = new TransactionBlock();
    
    // Вызов функции `mint` из вашего контракта
    const [nicknameNft] = tx.moveCall({
      target: '0x33c4f923e648c668b5a0346c764e4cb31a615714c5b1612470129210214a4cb3::nickname_nft::mint',
      arguments: [
        tx.object('0x199333917845f3c95101ce6b47c617b4864c0c1737edca94246ed810f5451a8f'), // ID SharedObject
        tx.pure(nickname)
      ],
    });
    
    // Передаем NFT владельцу
    tx.transferObjects([nicknameNft], tx.pure(owner));

    // Возвращаем транзакцию для подписи в компоненте
    return tx;
  } catch (error) {
    console.error('Ошибка создания безопасного NFT:', error);
    throw error;
  }
}

/**
 * Получает все активные листинги
 * @returns MarketplaceListing[] массив активных листингов
 */
export function getActiveListings(): MarketplaceListing[] {
  return Array.from(listings.values()).filter(listing => listing.isActive);
}

/**
 * Получает листинг по ID
 * @param listingId ID листинга
 * @returns MarketplaceListing | null
 */
export function getListingById(listingId: string): MarketplaceListing | null {
  return listings.get(listingId) || null;
}

/**
 * Покупает никнейм NFT
 * @param listingId ID листинга
 * @param buyer адрес покупателя
 * @param transactionHash хеш транзакции
 * @returns Promise<boolean> успешно ли совершена покупка
 */
export async function buyNickname(
  listingId: string,
  buyer: string,
  transactionHash: string
): Promise<boolean> {
  const listing = listings.get(listingId);
  if (!listing || !listing.isActive) {
    return false;
  }
  
  listing.isActive = false;
  listings.set(listingId, listing);
  
  const nft = nicknameNFTs.get(listing.tokenId);
  if (nft) {
    nft.owner = buyer;
    nft.isForSale = false;
    nft.price = undefined;
    nft.lastSalePrice = listing.price;
    nicknameNFTs.set(listing.tokenId, nft);
  }
  
  const sale: NicknameSale = {
    id: generateSaleId(),
    tokenId: listing.tokenId,
    seller: listing.seller,
    buyer,
    price: listing.price,
    timestamp: new Date(),
    transactionHash,
  };
  
  salesHistory.push(sale);
  
  if (nft) {
    nft.saleHistory.push(sale);
    nicknameNFTs.set(listing.tokenId, nft);
  }
  
  return true;
}

/**
 * Отменяет листинг
 * @param listingId ID листинга
 * @param seller адрес продавца
 * @returns Promise<boolean> успешно ли отменен
 */
export async function cancelListing(listingId: string, seller: string): Promise<boolean> {
  const listing = listings.get(listingId);
  if (!listing || !listing.isActive || listing.seller !== seller) {
    return false;
  }
  
  listing.isActive = false;
  listings.set(listingId, listing);
  
  const nft = nicknameNFTs.get(listing.tokenId);
  if (nft) {
    nft.isForSale = false;
    nft.price = undefined;
    nicknameNFTs.set(listing.tokenId, nft);
  }
  
  return true;
}

/**
 * Создает новый NFT никнейм
 * @param tokenId ID токена
 * @param nickname никнейм
 * @param owner владелец
 * @returns Promise<NicknameNFT> созданный NFT
 */
export async function createNicknameNFT(
  tokenId: string,
  nickname: string,
  owner: string
): Promise<NicknameNFT> {
  const nft: NicknameNFT = {
    tokenId,
    nickname,
    owner,
    isForSale: false,
    createdAt: new Date(),
    saleHistory: [],
  };
  
  nicknameNFTs.set(tokenId, nft);
  return nft;
}

/**
 * Получает NFT по токену
 * @param tokenId ID токена
 * @returns NicknameNFT | null
 */
export function getNFTByTokenId(tokenId: string): NicknameNFT | null {
  return nicknameNFTs.get(tokenId) || null;
}

/**
 * Получает все NFT пользователя
 * @param owner адрес владельца
 * @returns NicknameNFT[] массив NFT
 */
export function getUserNFTs(owner: string): NicknameNFT[] {
  return Array.from(nicknameNFTs.values()).filter(nft => nft.owner === owner);
}

/**
 * Получает историю продаж
 * @param limit лимит записей
 * @returns NicknameSale[] история продаж
 */
export function getSalesHistory(limit: number = 50): NicknameSale[] {
  return salesHistory
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Получает статистику маркетплейса
 * @returns объект со статистикой
 */
export function getMarketplaceStats() {
  const activeListings = getActiveListings();
  const totalNFTs = nicknameNFTs.size;
  const totalSales = salesHistory.length;
  const totalVolume = salesHistory.reduce((sum, sale) => sum + sale.price, 0);
  const averagePrice = totalSales > 0 ? totalVolume / totalSales : 0;
  
  return {
    activeListings: activeListings.length,
    totalNFTs,
    totalSales,
    totalVolume,
    averagePrice,
    floorPrice: activeListings.length > 0 ? Math.min(...activeListings.map(l => l.price)) : 0,
  };
}

/**
 * Генерирует уникальный ID листинга
 * @returns string уникальный ID
 */
function generateListingId(): string {
  return 'listing_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Генерирует уникальный ID продажи
 * @returns string уникальный ID
 */
function generateSaleId(): string {
  return 'sale_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}