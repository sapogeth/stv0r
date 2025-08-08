import { SuiClient } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { CONTRACTS } from '../config/contracts'; 

export interface KioskInfo {
  id: string;
  owner: string;
  itemCount: number;
  profits: string;
  createdAt: Date;
}

export interface KioskListing {
  id: string;
  kioskId: string;
  itemId: string;
  itemType: string;
  price: string;
  seller: string;
  isActive: boolean;
  createdAt: Date;
}

export interface KioskItem {
  id: string;
  type: string;
  isLocked: boolean;
  metadata: any;
}

// Хранилище для Kiosk и KioskOwnerCap
const userKiosks: Record<string, string> = {}; // ownerAddress -> kioskId
const userKioskCaps: Record<string, string> = {}; // ownerAddress -> kioskCapId

/**
 * Создает новый Kiosk для пользователя
 * @param ownerAddress адрес владельца
 * @returns Promise<TransactionBlock> транзакция для создания Kiosk
 */
export async function createKiosk(ownerAddress: string): Promise<TransactionBlock> {
  const tx = new TransactionBlock();
  
  // Создаем новый Kiosk используя стандартный Sui Framework
  const [kiosk, kioskCap] = tx.moveCall({
    target: `${CONTRACTS.KIOSK_PACKAGE_ID}::kiosk::new`,
    arguments: [],
  });
  
  // Передаем KioskOwnerCap владельцу
  tx.transferObjects([kioskCap], tx.pure(ownerAddress));

  // Возвращаем транзакцию для подписи в компоненте
  return tx;
}

/**
 * Получает ID Kiosk и KioskOwnerCap для пользователя
 * @param ownerAddress адрес владельца
 * @returns { kioskId: string; kioskCapId: string } | undefined
 */
export function getKioskIds(ownerAddress: string): { kioskId: string; kioskCapId: string } | undefined {
  const kioskId = userKiosks[ownerAddress];
  const kioskCapId = userKioskCaps[ownerAddress];
  if (kioskId && kioskCapId) {
    return { kioskId, kioskCapId };
  }
  return undefined;
}

/**
 * Сохраняет ID Kiosk и KioskOwnerCap для пользователя
 * @param ownerAddress адрес владельца
 * @param kioskId ID Kiosk
 * @param kioskCapId ID KioskOwnerCap
 */
export function saveKioskIds(ownerAddress: string, kioskId: string, kioskCapId: string): void {
  userKiosks[ownerAddress] = kioskId;
  userKioskCaps[ownerAddress] = kioskCapId;
}

/**
 * Размещает NFT никнейм в Kiosk
 * @param kioskId ID Kiosk
 * @param kioskCapId ID KioskOwnerCap
 * @param nftId ID NFT никнейма
 * @param tx блок транзакции
 * @returns Promise<void>
 */
export async function placeNFTInKiosk(
  kioskId: string,
  kioskCapId: string,
  nftId: string,
  tx: TransactionBlock
): Promise<void> {
  try {
    // Проверяем, что контракты развернуты
    if (!CONTRACTS.areContractsDeployed()) {
      throw new Error('Контракты NFT не развернуты. Используем стандартный Kiosk.');
    }

    tx.moveCall({
      target: `${CONTRACTS.KIOSK_PACKAGE_ID}::kiosk::place`,
      typeArguments: [CONTRACTS.getNicknameNFTType()],
      arguments: [
        tx.object(kioskId),
        tx.object(kioskCapId),
        tx.object(nftId),
      ],
    });
  } catch (error) {
    console.error('Ошибка размещения NFT в Kiosk:', error);
    throw error;
  }
}

/**
 * Выставляет NFT на продажу в Kiosk
 * @param kioskId ID Kiosk
 * @param kioskCapId ID KioskOwnerCap
 * @param nftId ID NFT никнейма
 * @param price цена в MIST (1 SUI = 10^9 MIST)
 * @param tx блок транзакции
 * @returns Promise<void>
 */
export async function listNFTForSale(
  kioskId: string,
  kioskCapId: string,
  nftId: string,
  price: string,
  tx: TransactionBlock
): Promise<void> {
  try {
    tx.moveCall({
      target: `${CONTRACTS.KIOSK_PACKAGE_ID}::kiosk::list`,
      typeArguments: [CONTRACTS.getNicknameNFTType()],
      arguments: [
        tx.object(kioskId),
        tx.object(kioskCapId),
        tx.pure.id(nftId),
        tx.pure.u64(price),
      ],
    });
  } catch (error) {
    console.error('Ошибка выставления NFT на продажу:', error);
    throw error;
  }
}

/**
 * Покупает NFT из Kiosk
 * @param kioskId ID Kiosk продавца
 * @param nftId ID NFT никнейма
 * @param paymentCoinId ID монеты для оплаты
 * @param tx блок транзакции
 * @returns Promise<string> хеш транзакции
 */
export async function purchaseNFTFromKiosk(
  kioskId: string,
  nftId: string,
  paymentCoinId: string,
  tx: TransactionBlock
): Promise<string> {
  try {
    const [nft, transferRequest] = tx.moveCall({
      target: `${CONTRACTS.KIOSK_PACKAGE_ID}::kiosk::purchase`,
      typeArguments: [CONTRACTS.getNicknameNFTType()],
      arguments: [
        tx.object(kioskId),
        tx.pure.id(nftId),
        tx.object(paymentCoinId),
      ],
    });
    
    tx.moveCall({
      target: `${CONTRACTS.KIOSK_PACKAGE_ID}::kiosk::confirm_request`,
      typeArguments: [CONTRACTS.getNicknameNFTType()],
      arguments: [
        tx.object(kioskId),
        transferRequest,
      ],
    });
    
    tx.transferObjects([nft], tx.sender);
    
    return 'tx_' + Date.now(); // Mock хеш, реальный хеш будет получен после выполнения
  } catch (error) {
    console.error('Ошибка покупки NFT из Kiosk:', error);
    throw error;
  }
}

/**
 * Снимает NFT с продажи в Kiosk
 * @param kioskId ID Kiosk
 * @param kioskCapId ID KioskOwnerCap
 * @param nftId ID NFT никнейма
 * @param tx блок транзакции
 * @returns Promise<void>
 */
export async function delistNFT(
  kioskId: string,
  kioskCapId: string,
  nftId: string,
  tx: TransactionBlock
): Promise<void> {
  try {
    tx.moveCall({
      target: `${CONTRACTS.KIOSK_PACKAGE_ID}::kiosk::delist`,
      typeArguments: [CONTRACTS.getNicknameNFTType()],
      arguments: [
        tx.object(kioskId),
        tx.object(kioskCapId),
        tx.pure.id(nftId),
      ],
    });
  } catch (error) {
    console.error('Ошибка снятия NFT с продажи:', error);
    throw error;
  }
}

/**
 * Забирает NFT из Kiosk
 * @param kioskId ID Kiosk
 * @param kioskCapId ID KioskOwnerCap
 * @param nftId ID NFT никнейма
 * @param tx блок транзакции
 * @returns Promise<void>
 */
export async function takeNFTFromKiosk(
  kioskId: string,
  kioskCapId: string,
  nftId: string,
  tx: TransactionBlock
): Promise<void> {
  try {
    const nft = tx.moveCall({
      target: `${CONTRACTS.KIOSK_PACKAGE_ID}::kiosk::take`,
      typeArguments: [CONTRACTS.getNicknameNFTType()],
      arguments: [
        tx.object(kioskId),
        tx.object(kioskCapId),
        tx.pure.id(nftId),
      ],
    });
    
    tx.transferObjects([nft], tx.sender);
  } catch (error) {
    console.error('Ошибка извлечения NFT из Kiosk:', error);
    throw error;
  }
}

/**
 * Получает информацию о Kiosk
 * @param kioskId ID Kiosk
 * @returns Promise<KioskInfo | null> информация о Kiosk
 */
export async function getKioskInfo(kioskId: string): Promise<KioskInfo | null> {
  try {
    const client = new SuiClient({ url: CONTRACTS.RPC_URL });
    
    const kioskObject = await client.getObject({
      id: kioskId,
      options: {
        showContent: true,
        showOwner: true,
      },
    });
    
    if (!kioskObject.data) {
      return null;
    }
    
    return {
      id: kioskId,
      owner: kioskObject.data.owner?.AddressOwner || 'unknown',
      itemCount: 0, // Требуется реальная реализация
      profits: '0',
      createdAt: new Date(),
    };
  } catch (error) {
    console.error('Ошибка получения информации о Kiosk:', error);
    return null;
  }
}

/**
 * Получает все NFT в Kiosk
 * @param kioskId ID Kiosk
 * @returns Promise<KioskItem[]> список NFT в Kiosk
 */
export async function getKioskItems(kioskId: string): Promise<KioskItem[]> {
  try {
    const client = new SuiClient({ url: CONTRACTS.RPC_URL });
    
    const dynamicFields = await client.getDynamicFields({
      parentId: kioskId,
    });
    
    const items: KioskItem[] = [];
    
    for (const field of dynamicFields.data) {
      try {
        const fieldObject = await client.getObject({
          id: field.objectId,
          options: { showContent: true },
        });
        
        if (fieldObject.data) {
          items.push({
            id: field.objectId,
            type: field.objectType,
            isLocked: false,
            metadata: fieldObject.data.content,
          });
        }
      } catch (error) {
        console.error('Ошибка получения элемента Kiosk:', error);
      }
    }
    
    return items;
  } catch (error) {
    console.error('Ошибка получения элементов Kiosk:', error);
    return [];
  }
}

/**
 * Получает все активные листинги в Kiosk
 * @param kioskId ID Kiosk
 * @returns Promise<KioskListing[]> список активных листингов
 */
export async function getKioskListings(kioskId: string): Promise<KioskListing[]> {
  try {
    const client = new SuiClient({ url: CONTRACTS.RPC_URL });
    
    // Реальная реализация требует запроса к событиям Kiosk
    return [];
  } catch (error) {
    console.error('Ошибка получения листингов Kiosk:', error);
    return [];
  }
}

/**
 * Получает прибыль от продаж в Kiosk
 * @param kioskId ID Kiosk
 * @param kioskCapId ID KioskOwnerCap
 * @param tx блок транзакции
 * @returns Promise<void>
 */
export async function withdrawKioskProfits(
  kioskId: string,
  kioskCapId: string,
  tx: TransactionBlock
): Promise<void> {
  try {
    const coin = tx.moveCall({
      target: `${CONTRACTS.KIOSK_PACKAGE_ID}::kiosk::withdraw`,
      arguments: [
        tx.object(kioskId),
        tx.object(kioskCapId),
        tx.pure.option('u64', []),
      ],
    });
    
    tx.transferObjects([coin], tx.sender);
  } catch (error) {
    console.error('Ошибка вывода прибыли из Kiosk:', error);
    throw error;
  }
}

