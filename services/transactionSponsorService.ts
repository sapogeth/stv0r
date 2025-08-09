// src/services/transactionSponsorService.ts

import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { MIST_PER_SUI } from '@mysten/sui.js/utils';

// Конфигурация для спонсирования транзакций
const SPONSOR_CONFIG = {
  // Максимальное количество спонсируемых транзакций на пользователя
  MAX_SPONSORED_TRANSACTIONS: 5,
  
  // Максимальная стоимость газа для спонсирования (в SUI)
  MAX_GAS_COST: 0.1,
  
  // Приватный ключ кошелька-спонсора (в реальном проекте должен быть в переменных окружения)
  SPONSOR_PRIVATE_KEY: process.env.SPONSOR_PRIVATE_KEY || '',
  
  // RPC URL для Sui testnet
  RPC_URL: getFullnodeUrl('testnet')
};

// Хранилище счетчиков спонсируемых транзакций для каждого пользователя
const userTransactionCounts = new Map<string, number>();

// Инициализация клиента Sui
const client = new SuiClient({ url: SPONSOR_CONFIG.RPC_URL });

/**
 * Проверяет, может ли пользователь получить спонсируемую транзакцию
 * @param userAddress адрес пользователя
 * @returns boolean может ли пользователь получить спонсируемую транзакцию
 */
export function canSponsorTransaction(userAddress: string): boolean {
  const currentCount = userTransactionCounts.get(userAddress) || 0;
  return currentCount < SPONSOR_CONFIG.MAX_SPONSORED_TRANSACTIONS;
}

/**
 * Получает количество оставшихся спонсируемых транзакций для пользователя
 * @param userAddress адрес пользователя
 * @returns number количество оставшихся транзакций
 */
export function getRemainingSponsored(userAddress: string): number {
  const currentCount = userTransactionCounts.get(userAddress) || 0;
  return Math.max(0, SPONSOR_CONFIG.MAX_SPONSORED_TRANSACTIONS - currentCount);
}

/**
 * Увеличивает счетчик спонсируемых транзакций для пользователя
 * @param userAddress адрес пользователя
 */
function incrementTransactionCount(userAddress: string): void {
  const currentCount = userTransactionCounts.get(userAddress) || 0;
  userTransactionCounts.set(userAddress, currentCount + 1);
}

/**
 * Создает кошелек спонсора из приватного ключа
 * @returns Ed25519Keypair кошелек спонсора
 */
function createSponsorWallet(): Ed25519Keypair {
  if (!SPONSOR_CONFIG.SPONSOR_PRIVATE_KEY) {
    throw new Error('Приватный ключ спонсора не настроен');
  }
  
  // В реальном проекте здесь должна быть правильная обработка приватного ключа
  // Для демонстрации создаем случайный кошелек
  return new Ed25519Keypair();
}

/**
 * Спонсирует транзакцию для пользователя
 * @param userAddress адрес пользователя
 * @param transactionBlock блок транзакции для спонсирования
 * @returns Promise<{success: boolean, txDigest?: string, error?: string}>
 */
export async function sponsorTransaction(
  userAddress: string, 
  transactionBlock: TransactionBlock
): Promise<{success: boolean, txDigest?: string, error?: string}> {
  try {
    // Проверяем, может ли пользователь получить спонсируемую транзакцию
    if (!canSponsorTransaction(userAddress)) {
      return {
        success: false,
        error: `Превышен лимит спонсируемых транзакций (${SPONSOR_CONFIG.MAX_SPONSORED_TRANSACTIONS})`
      };
    }

    // Создаем кошелек спонсора
    const sponsorWallet = createSponsorWallet();
    const sponsorAddress = sponsorWallet.getPublicKey().toSuiAddress();

    // Проверяем баланс спонсора
    const sponsorBalance = await client.getBalance({
      owner: sponsorAddress,
      coinType: '0x2::sui::SUI'
    });

    const sponsorBalanceSui = Number(sponsorBalance.totalBalance) / Number(MIST_PER_SUI);
    
    if (sponsorBalanceSui < SPONSOR_CONFIG.MAX_GAS_COST) {
      return {
        success: false,
        error: 'Недостаточно средств у спонсора для оплаты газа'
      };
    }

    // Устанавливаем спонсора для транзакции
    transactionBlock.setSender(userAddress);
    transactionBlock.setGasOwner(sponsorAddress);

    // Получаем газовые монеты спонсора
    const gasCoins = await client.getCoins({
      owner: sponsorAddress,
      coinType: '0x2::sui::SUI',
      limit: 1
    });

    if (gasCoins.data.length === 0) {
      return {
        success: false,
        error: 'У спонсора нет доступных газовых монет'
      };
    }

    // Устанавливаем газовую монету
    transactionBlock.setGasPayment([{
      objectId: gasCoins.data[0].coinObjectId,
      version: gasCoins.data[0].version,
      digest: gasCoins.data[0].digest
    }]);

    // Подписываем и выполняем транзакцию
    const result = await client.signAndExecuteTransactionBlock({
      signer: sponsorWallet,
      transactionBlock,
      options: {
        showEffects: true,
        showObjectChanges: true
      }
    });

    // Увеличиваем счетчик спонсируемых транзакций
    incrementTransactionCount(userAddress);

    console.log(`Транзакция спонсирована для пользователя ${userAddress}: ${result.digest}`);
    console.log(`Осталось спонсируемых транзакций: ${getRemainingSponsored(userAddress)}`);

    return {
      success: true,
      txDigest: result.digest
    };

  } catch (error) {
    console.error('Ошибка при спонсировании транзакции:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }
}

/**
 * Запрашивает тестовые SUI для кошелька спонсора
 * @returns Promise<boolean> успешность запроса
 */
export async function requestSponsorFaucet(): Promise<boolean> {
  try {
    const sponsorWallet = createSponsorWallet();
    const sponsorAddress = sponsorWallet.getPublicKey().toSuiAddress();

    // В реальном проекте здесь должен быть запрос к фаусету
    // Для демонстрации просто возвращаем true
    console.log(`Запрос тестовых SUI для спонсора: ${sponsorAddress}`);
    
    return true;
  } catch (error) {
    console.error('Ошибка при запросе тестовых SUI для спонсора:', error);
    return false;
  }
}

/**
 * Получает статистику спонсирования
 * @returns объект со статистикой
 */
export function getSponsorStats(): {
  totalUsers: number;
  totalSponsored: number;
  averagePerUser: number;
} {
  const totalUsers = userTransactionCounts.size;
  const totalSponsored = Array.from(userTransactionCounts.values()).reduce((sum, count) => sum + count, 0);
  const averagePerUser = totalUsers > 0 ? totalSponsored / totalUsers : 0;

  return {
    totalUsers,
    totalSponsored,
    averagePerUser: parseFloat(averagePerUser.toFixed(2))
  };
}

/**
 * Сбрасывает счетчики спонсируемых транзакций (для тестирования)
 */
export function resetSponsorCounts(): void {
  userTransactionCounts.clear();
  console.log('Счетчики спонсируемых транзакций сброшены');
}

/**
 * Проверяет, настроен ли сервис спонсирования
 * @returns boolean настроен ли сервис
 */
export function isSponsorServiceConfigured(): boolean {
  return Boolean(SPONSOR_CONFIG.SPONSOR_PRIVATE_KEY);
}

