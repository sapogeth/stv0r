// src/services/walrusService.ts

import { WALRUS_PUBLISHER_URL } from './walrus';

export interface WalrusUploadResponse {
  newlyCreated?: {
    blobObject: {
      id: string;
      storedEpoch: number;
      blobId: string;
      size: number;
      erasureCodeType: string;
      certifiedEpoch: number;
      storage: {
        id: string;
        startEpoch: number;
        endEpoch: number;
        storageSize: number;
      };
    };
    resourceOperation: {
      RegisterFromScratch?: any;
      RegisterFromExisting?: any;
    };
  };
  alreadyCertified?: {
    blobId: string;
    event: any;
    endEpoch: number;
  };
}

export interface WalrusMetadata {
  nickname: string;
  owner: string;
  createdAt: string;
  type: 'nickname_nft';
  attributes: Record<string, any>;
}

/**
 * Загружает данные в Walrus для безопасного хранения
 * @param data данные для загрузки
 * @param metadata метаданные
 * @returns Promise<string> ID blob в Walrus
 */
export async function uploadToWalrus(data: any, metadata: WalrusMetadata): Promise<string> {
  try {
    const payload = {
      data,
      metadata,
      timestamp: new Date().toISOString()
    };

    const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/store`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Walrus upload failed: ${response.status} ${response.statusText}`);
    }

    const result: WalrusUploadResponse = await response.json();
    
    if (result.newlyCreated) {
      return result.newlyCreated.blobObject.blobId;
    } else if (result.alreadyCertified) {
      return result.alreadyCertified.blobId;
    } else {
      throw new Error('Unexpected Walrus response format');
    }
  } catch (error) {
    console.error('Ошибка загрузки в Walrus:', error);
    throw error;
  }
}

/**
 * Получает данные из Walrus по blob ID
 * @param blobId ID blob в Walrus
 * @returns Promise<any> данные из Walrus
 */
export async function downloadFromWalrus(blobId: string): Promise<any> {
  try {
    const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/${blobId}`);
    
    if (!response.ok) {
      throw new Error(`Walrus download failed: ${response.status} ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Ошибка загрузки из Walrus:', error);
    throw error;
  }
}

/**
 * Сохраняет метаданные NFT никнейма в Walrus
 * @param nickname никнейм
 * @param owner владелец
 * @param tokenId ID NFT токена
 * @param attributes дополнительные атрибуты
 * @returns Promise<string> blob ID в Walrus
 */
export async function storeNicknameMetadata(
  nickname: string,
  owner: string,
  tokenId: string,
  attributes: Record<string, any> = {}
): Promise<string> {
  const metadata: WalrusMetadata = {
    nickname,
    owner,
    createdAt: new Date().toISOString(),
    type: 'nickname_nft',
    attributes: {
      tokenId,
      length: nickname.length,
      ...attributes
    }
  };

  const nftData = {
    name: `Nickname: ${nickname}`,
    description: `Unique nickname NFT for "${nickname}"`,
    image: `data:image/svg+xml;base64,${generateNicknameImage(nickname)}`,
    attributes: [
      {
        trait_type: 'Type',
        value: 'Nickname'
      },
      {
        trait_type: 'Length',
        value: nickname.length
      },
      {
        trait_type: 'Owner',
        value: owner
      },
      {
        trait_type: 'Created',
        value: metadata.createdAt
      }
    ]
  };

  return await uploadToWalrus(nftData, metadata);
}

/**
 * Генерирует SVG изображение для никнейма
 * @param nickname никнейм
 * @returns string base64 encoded SVG
 */
function generateNicknameImage(nickname: string): string {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
    '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'
  ];
  
  const bgColor = colors[nickname.length % colors.length];
  const textColor = '#FFFFFF';
  
  const svg = `
    <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${bgColor};stop-opacity:1" />
          <stop offset="100%" style="stop-color:${adjustColor(bgColor, -30)};stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="400" height="400" fill="url(#grad1)" rx="20"/>
      <text x="200" y="180" font-family="Arial, sans-serif" font-size="24" font-weight="bold" 
            text-anchor="middle" fill="${textColor}">NICKNAME NFT</text>
      <text x="200" y="220" font-family="Arial, sans-serif" font-size="32" font-weight="bold" 
            text-anchor="middle" fill="${textColor}">${nickname}</text>
      <text x="200" y="280" font-family="Arial, sans-serif" font-size="16" 
            text-anchor="middle" fill="${textColor}" opacity="0.8">Unique Digital Identity</text>
      <circle cx="200" cy="320" r="3" fill="${textColor}" opacity="0.6"/>
      <circle cx="210" cy="320" r="3" fill="${textColor}" opacity="0.6"/>
      <circle cx="220" cy="320" r="3" fill="${textColor}" opacity="0.6"/>
    </svg>
  `;
  
  return btoa(svg);
}

/**
 * Изменяет яркость цвета
 * @param color цвет в формате HEX
 * @param amount количество изменения (-100 до 100)
 * @returns string измененный цвет
 */
function adjustColor(color: string, amount: number): string {
  const usePound = color[0] === '#';
  const col = usePound ? color.slice(1) : color;
  const num = parseInt(col, 16);
  let r = (num >> 16) + amount;
  let g = (num >> 8 & 0x00FF) + amount;
  let b = (num & 0x0000FF) + amount;
  
  r = r > 255 ? 255 : r < 0 ? 0 : r;
  g = g > 255 ? 255 : g < 0 ? 0 : g;
  b = b > 255 ? 255 : b < 0 ? 0 : b;
  
  return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
}

/**
 * Проверяет доступность Walrus сервиса
 * @returns Promise<boolean> доступен ли сервис
 */
export async function checkWalrusHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${WALRUS_PUBLISHER_URL}/v1/health`, {
      method: 'GET',
      timeout: 5000
    } as any);
    
    return response.ok;
  } catch (error) {
    console.error('Walrus health check failed:', error);
    return false;
  }
}

