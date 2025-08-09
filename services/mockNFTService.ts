// src/services/mockNFTService.ts

import type { NicknameNFT, MarketplaceListing } from '../types/user';

// Тестовые NFT для демонстрации маркетплейса
const mockNFTs: NicknameNFT[] = [
  {
    tokenId: 'mock_nft_001',
    nickname: 'CryptoKing',
    owner: '0x1234567890abcdef1234567890abcdef12345678',
    isForSale: true,
    price: 5.5,
    lastSalePrice: 4.2,
    createdAt: new Date('2024-01-15'),
    saleHistory: [
      {
        id: 'sale_001',
        tokenId: 'mock_nft_001',
        seller: '0xabcdef1234567890abcdef1234567890abcdef12',
        buyer: '0x1234567890abcdef1234567890abcdef12345678',
        price: 4.2,
        timestamp: new Date('2024-01-10'),
        transactionHash: '0x123abc...'
      }
    ],
    kioskId: 'kiosk_001',
    walrusBlobId: 'walrus_blob_001',
    sealEncryptionId: 'seal_enc_001'
  },
  {
    tokenId: 'mock_nft_002',
    nickname: 'SuiMaster',
    owner: '0xfedcba0987654321fedcba0987654321fedcba09',
    isForSale: true,
    price: 12.0,
    lastSalePrice: 8.5,
    createdAt: new Date('2024-01-20'),
    saleHistory: [
      {
        id: 'sale_002',
        tokenId: 'mock_nft_002',
        seller: '0x9876543210fedcba9876543210fedcba98765432',
        buyer: '0xfedcba0987654321fedcba0987654321fedcba09',
        price: 8.5,
        timestamp: new Date('2024-01-18'),
        transactionHash: '0x456def...'
      }
    ],
    kioskId: 'kiosk_002',
    walrusBlobId: 'walrus_blob_002',
    sealEncryptionId: 'seal_enc_002'
  },
  {
    tokenId: 'mock_nft_003',
    nickname: 'BlockchainPro',
    owner: '0x5555666677778888999900001111222233334444',
    isForSale: true,
    price: 8.75,
    createdAt: new Date('2024-01-25'),
    saleHistory: [],
    kioskId: 'kiosk_003',
    walrusBlobId: 'walrus_blob_003',
    sealEncryptionId: 'seal_enc_003'
  },
  {
    tokenId: 'mock_nft_004',
    nickname: 'NFTCollector',
    owner: '0xaaabbbbccccddddeeeeffffgggghhhhiiiijjjj',
    isForSale: true,
    price: 3.25,
    createdAt: new Date('2024-02-01'),
    saleHistory: [],
    kioskId: 'kiosk_004',
    walrusBlobId: 'walrus_blob_004',
    sealEncryptionId: 'seal_enc_004'
  },
  {
    tokenId: 'mock_nft_005',
    nickname: 'DefiExpert',
    owner: '0x1111222233334444555566667777888899990000',
    isForSale: true,
    price: 15.5,
    lastSalePrice: 12.0,
    createdAt: new Date('2024-02-05'),
    saleHistory: [
      {
        id: 'sale_003',
        tokenId: 'mock_nft_005',
        seller: '0x0000999988887777666655554444333322221111',
        buyer: '0x1111222233334444555566667777888899990000',
        price: 12.0,
        timestamp: new Date('2024-02-03'),
        transactionHash: '0x789ghi...'
      }
    ],
    kioskId: 'kiosk_005',
    walrusBlobId: 'walrus_blob_005',
    sealEncryptionId: 'seal_enc_005'
  }
];

/**
 * Получает все тестовые NFT, доступные для покупки
 * @returns Promise<NicknameNFT[]> массив NFT на продаже
 */
export async function getMockNFTsForSale(): Promise<NicknameNFT[]> {
  // Симулируем задержку API
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return mockNFTs.filter(nft => nft.isForSale);
}

/**
 * Получает тестовые листинги для маркетплейса
 * @returns Promise<MarketplaceListing[]> массив листингов
 */
export async function getMockMarketplaceListings(): Promise<MarketplaceListing[]> {
  const nftsForSale = await getMockNFTsForSale();
  
  return nftsForSale.map(nft => ({
    id: `listing_${nft.tokenId}`,
    tokenId: nft.tokenId,
    nickname: nft.nickname,
    seller: nft.owner,
    price: nft.price || 0,
    createdAt: nft.createdAt,
    isActive: true,
    kioskId: nft.kioskId
  }));
}

/**
 * Получает NFT пользователя (для демонстрации)
 * @param userAddress адрес пользователя
 * @returns Promise<NicknameNFT[]> NFT пользователя
 */
export async function getMockUserNFTs(userAddress: string): Promise<NicknameNFT[]> {
  // Симулируем задержку API
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // Возвращаем NFT, принадлежащие пользователю
  return mockNFTs.filter(nft => nft.owner.toLowerCase() === userAddress.toLowerCase());
}

/**
 * Симулирует покупку NFT
 * @param tokenId ID NFT
 * @param buyerAddress адрес покупателя
 * @returns Promise<boolean> успешность покупки
 */
export async function simulateBuyNFT(tokenId: string, buyerAddress: string): Promise<boolean> {
  // Симулируем задержку транзакции
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const nftIndex = mockNFTs.findIndex(nft => nft.tokenId === tokenId);
  if (nftIndex === -1) return false;
  
  const nft = mockNFTs[nftIndex];
  
  // Обновляем владельца и историю продаж
  const saleRecord = {
    id: `sale_${Date.now()}`,
    tokenId: nft.tokenId,
    seller: nft.owner,
    buyer: buyerAddress,
    price: nft.price || 0,
    timestamp: new Date(),
    transactionHash: `0x${Math.random().toString(16).substr(2, 8)}...`
  };
  
  nft.lastSalePrice = nft.price;
  nft.owner = buyerAddress;
  nft.isForSale = false;
  nft.price = undefined;
  nft.saleHistory.push(saleRecord);
  
  console.log(`NFT ${nft.nickname} продан пользователю ${buyerAddress} за ${saleRecord.price} SUI`);
  
  return true;
}

/**
 * Симулирует выставление NFT на продажу
 * @param tokenId ID NFT
 * @param price цена в SUI
 * @returns Promise<boolean> успешность листинга
 */
export async function simulateListNFT(tokenId: string, price: number): Promise<boolean> {
  // Симулируем задержку транзакции
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const nftIndex = mockNFTs.findIndex(nft => nft.tokenId === tokenId);
  if (nftIndex === -1) return false;
  
  const nft = mockNFTs[nftIndex];
  nft.isForSale = true;
  nft.price = price;
  
  console.log(`NFT ${nft.nickname} выставлен на продажу за ${price} SUI`);
  
  return true;
}

/**
 * Создает новый тестовый NFT
 * @param nickname никнейм для NFT
 * @param ownerAddress адрес владельца
 * @returns Promise<NicknameNFT> созданный NFT
 */
export async function createMockNFT(nickname: string, ownerAddress: string): Promise<NicknameNFT> {
  // Симулируем задержку минтинга
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  const newNFT: NicknameNFT = {
    tokenId: `mock_nft_${Date.now()}`,
    nickname,
    owner: ownerAddress,
    isForSale: false,
    createdAt: new Date(),
    saleHistory: [],
    kioskId: `kiosk_${Date.now()}`,
    walrusBlobId: `walrus_blob_${Date.now()}`,
    sealEncryptionId: `seal_enc_${Date.now()}`
  };
  
  mockNFTs.push(newNFT);
  
  console.log(`Создан новый NFT: ${nickname} для пользователя ${ownerAddress}`);
  
  return newNFT;
}

/**
 * Получает статистику маркетплейса
 * @returns Promise<any> статистика
 */
export async function getMockMarketplaceStats(): Promise<any> {
  const totalNFTs = mockNFTs.length;
  const nftsForSale = mockNFTs.filter(nft => nft.isForSale).length;
  const totalSales = mockNFTs.reduce((sum, nft) => sum + nft.saleHistory.length, 0);
  const totalVolume = mockNFTs.reduce((sum, nft) => 
    sum + nft.saleHistory.reduce((saleSum, sale) => saleSum + sale.price, 0), 0
  );
  const prices = mockNFTs.filter(nft => nft.isForSale && nft.price).map(nft => nft.price!);
  const floorPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const averagePrice = prices.length > 0 ? prices.reduce((sum, price) => sum + price, 0) / prices.length : 0;
  
  return {
    totalNFTs,
    nftsForSale,
    totalSales,
    totalVolume: parseFloat(totalVolume.toFixed(2)),
    floorPrice: parseFloat(floorPrice.toFixed(2)),
    averagePrice: parseFloat(averagePrice.toFixed(2)),
    uniqueOwners: new Set(mockNFTs.map(nft => nft.owner)).size
  };
}

