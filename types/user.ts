// src/types/user.ts

export interface User {
  id: string;
  email: string;
  walletAddress: string;
  nickname: string;
  isNicknameNFT: boolean;
  createdAt: Date;
  updatedAt: Date;
  kioskId?: string; // ID Kiosk пользователя
}

export interface NicknameNFT {
  tokenId: string;
  nickname: string;
  owner: string;
  isForSale: boolean;
  price?: number;
  lastSalePrice?: number;
  createdAt: Date;
  saleHistory: NicknameSale[];
  kioskId?: string; // ID Kiosk, где размещен NFT
  walrusBlobId?: string; // ID blob в Walrus для метаданных
  sealEncryptionId?: string; // ID шифрования в Seal
  sealAccessPolicyId?: string; // ID политики доступа в Seal
}

export interface MarketplaceListing {
  id: string;
  tokenId: string;
  nickname: string;
  seller: string;
  price: number;
  createdAt: Date;
  isActive: boolean;
  kioskId?: string; // ID Kiosk для листинга
}

export interface NicknameSale {
  id: string;
  tokenId: string;
  seller: string;
  buyer: string;
  price: number;
  timestamp: Date;
  transactionHash: string;
}

export interface MarketplaceStats {
  totalVolume: number;
  totalSales: number;
  activeListings: number;
  floorPrice: number;
  averagePrice: number;
  uniqueOwners: number;
}