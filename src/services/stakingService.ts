// src/services/stakingService.ts

import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { MIST_PER_SUI } from '@mysten/sui.js/utils';

// Конфигурация для стейкинга
const STAKING_CONFIG = {
  // Адреса контрактов для стейкинга
  STAKING_PACKAGE_ID: '0x20266a17b4f1a216727f3eef5772f8d486a9e3b5e319af80a5b75809c035561d',
  
  // Типы токенов
  WAL_TYPE: '0x9f9b4f113862e8b1a3591d7955fadd7c52ecc07cf24be9e3492ce56eb8087805::wal::WAL',
  
  // Пулы стейкинга
  WALRUS_POOL_OBJECT_ID: '0x20266a17b4f1a216727f3eef5772f8d486a9e3b5e319af80a5b75809c035561d',
  
  // Минимальная сумма для стейкинга
  MIN_STAKE_AMOUNT: 1,
  
  // APY (годовая процентная ставка) в процентах
  STAKING_APY: 12.5,
  
  // Период блокировки (в днях)
  LOCK_PERIOD_DAYS: 30,
  
  // RPC URL
  RPC_URL: getFullnodeUrl('testnet')
};

// Инициализация клиента
const client = new SuiClient({ url: STAKING_CONFIG.RPC_URL });

/**
 * Интерфейс для информации о стейке
 */
export interface StakeInfo {
  stakeId: string;
  amount: number;
  startTime: Date;
  unlockTime: Date;
  currentRewards: number;
  isActive: boolean;
}

/**
 * Интерфейс для результата стейкинга
 */
export interface StakingResult {
  success: boolean;
  txDigest?: string;
  stakeId?: string;
  error?: string;
}

/**
 * Интерфейс для статистики стейкинга
 */
export interface StakingStats {
  totalStaked: number;
  totalStakers: number;
  averageStake: number;
  totalRewardsDistributed: number;
  currentAPY: number;
}

// Хранилище стейков пользователей (в реальном проекте должно быть в блокчейне)
const userStakes = new Map<string, StakeInfo[]>();

/**
 * Получает информацию о всех стейках пользователя
 * @param userAddress адрес пользователя
 * @returns Promise<StakeInfo[]> массив стейков
 */
export async function getUserStakes(userAddress: string): Promise<StakeInfo[]> {
  try {
    // В реальном проекте здесь должен быть запрос к блокчейну
    // Для демонстрации возвращаем данные из локального хранилища
    const stakes = userStakes.get(userAddress) || [];
    
    // Обновляем текущие награды для активных стейков
    const updatedStakes = stakes.map(stake => {
      if (stake.isActive) {
        const currentTime = new Date();
        const stakingDays = (currentTime.getTime() - stake.startTime.getTime()) / (1000 * 60 * 60 * 24);
        const dailyReward = (stake.amount * STAKING_CONFIG.STAKING_APY / 100) / 365;
        stake.currentRewards = dailyReward * stakingDays;
      }
      return stake;
    });

    return updatedStakes;
  } catch (error) {
    console.error('Ошибка получения стейков пользователя:', error);
    return [];
  }
}

/**
 * Создает новый стейк
 * @param userAddress адрес пользователя
 * @param amount количество WAL для стейкинга
 * @returns Promise<StakingResult>
 */
export async function createStake(userAddress: string, amount: number): Promise<StakingResult> {
  try {
    if (amount < STAKING_CONFIG.MIN_STAKE_AMOUNT) {
      return {
        success: false,
        error: `Минимальная сумма для стейкинга: ${STAKING_CONFIG.MIN_STAKE_AMOUNT} WAL`
      };
    }

    // Проверяем баланс пользователя
    const balance = await client.getBalance({
      owner: userAddress,
      coinType: STAKING_CONFIG.WAL_TYPE
    });

    const userBalance = Number(balance.totalBalance) / Number(MIST_PER_SUI);
    
    if (userBalance < amount) {
      return {
        success: false,
        error: `Недостаточно WAL. Баланс: ${userBalance.toFixed(2)} WAL`
      };
    }

    // Создаем транзакцию для стейкинга
    const tx = new TransactionBlock();
    
    // Получаем монеты пользователя
    const coins = await client.getCoins({
      owner: userAddress,
      coinType: STAKING_CONFIG.WAL_TYPE,
      limit: 10
    });

    if (coins.data.length === 0) {
      return {
        success: false,
        error: 'У пользователя нет WAL монет'
      };
    }

    // Находим подходящие монеты для стейкинга
    const requiredAmount = BigInt(Math.floor(amount * Number(MIST_PER_SUI)));
    let totalAmount = BigInt(0);
    const selectedCoins: string[] = [];

    for (const coin of coins.data) {
      selectedCoins.push(coin.coinObjectId);
      totalAmount += BigInt(coin.balance);
      
      if (totalAmount >= requiredAmount) {
        break;
      }
    }

    // Объединяем монеты если нужно
    let coinToStake: any;
    if (selectedCoins.length === 1) {
      coinToStake = tx.object(selectedCoins[0]);
    } else {
      coinToStake = tx.mergeCoins(tx.object(selectedCoins[0]), selectedCoins.slice(1).map(id => tx.object(id)));
    }

    // Разделяем нужную сумму
    const [stakeCoin] = tx.splitCoins(coinToStake, [requiredAmount]);

    // Выполняем стейкинг (псевдокод - в реальности нужен правильный вызов контракта)
    tx.moveCall({
      target: `${STAKING_CONFIG.STAKING_PACKAGE_ID}::staking::stake`,
      arguments: [
        tx.object(STAKING_CONFIG.WALRUS_POOL_OBJECT_ID),
        stakeCoin,
        tx.pure(STAKING_CONFIG.LOCK_PERIOD_DAYS)
      ],
      typeArguments: [STAKING_CONFIG.WAL_TYPE]
    });

    // Создаем запись о стейке
    const stakeId = `stake_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const currentTime = new Date();
    const unlockTime = new Date(currentTime.getTime() + STAKING_CONFIG.LOCK_PERIOD_DAYS * 24 * 60 * 60 * 1000);

    const newStake: StakeInfo = {
      stakeId,
      amount,
      startTime: currentTime,
      unlockTime,
      currentRewards: 0,
      isActive: true
    };

    // Сохраняем стейк в локальном хранилище
    const existingStakes = userStakes.get(userAddress) || [];
    existingStakes.push(newStake);
    userStakes.set(userAddress, existingStakes);

    // В реальном проекте здесь должна быть подпись и выполнение транзакции
    const mockTxDigest = `0x${Math.random().toString(16).substr(2, 8)}...`;

    console.log(`Стейк создан: ${amount} WAL на ${STAKING_CONFIG.LOCK_PERIOD_DAYS} дней`);
    console.log(`APY: ${STAKING_CONFIG.STAKING_APY}%`);
    console.log(`Разблокировка: ${unlockTime.toLocaleDateString()}`);

    return {
      success: true,
      txDigest: mockTxDigest,
      stakeId
    };

  } catch (error) {
    console.error('Ошибка при создании стейка:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }
}

/**
 * Снимает стейк (unstake)
 * @param userAddress адрес пользователя
 * @param stakeId ID стейка
 * @returns Promise<StakingResult>
 */
export async function unstake(userAddress: string, stakeId: string): Promise<StakingResult> {
  try {
    const userStakesList = userStakes.get(userAddress) || [];
    const stakeIndex = userStakesList.findIndex(stake => stake.stakeId === stakeId);

    if (stakeIndex === -1) {
      return {
        success: false,
        error: 'Стейк не найден'
      };
    }

    const stake = userStakesList[stakeIndex];

    if (!stake.isActive) {
      return {
        success: false,
        error: 'Стейк уже завершен'
      };
    }

    const currentTime = new Date();
    
    // Проверяем, можно ли снять стейк (прошел ли период блокировки)
    const canUnstake = currentTime >= stake.unlockTime;
    
    if (!canUnstake) {
      const remainingDays = Math.ceil((stake.unlockTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60 * 24));
      return {
        success: false,
        error: `Стейк заблокирован еще на ${remainingDays} дней`
      };
    }

    // Создаем транзакцию для снятия стейка
    const tx = new TransactionBlock();

    // Выполняем unstake (псевдокод)
    tx.moveCall({
      target: `${STAKING_CONFIG.STAKING_PACKAGE_ID}::staking::unstake`,
      arguments: [
        tx.object(STAKING_CONFIG.WALRUS_POOL_OBJECT_ID),
        tx.pure(stakeId)
      ],
      typeArguments: [STAKING_CONFIG.WAL_TYPE]
    });

    // Рассчитываем финальные награды
    const stakingDays = (currentTime.getTime() - stake.startTime.getTime()) / (1000 * 60 * 60 * 24);
    const dailyReward = (stake.amount * STAKING_CONFIG.STAKING_APY / 100) / 365;
    const totalRewards = dailyReward * stakingDays;

    // Обновляем статус стейка
    stake.isActive = false;
    stake.currentRewards = totalRewards;
    userStakesList[stakeIndex] = stake;
    userStakes.set(userAddress, userStakesList);

    const mockTxDigest = `0x${Math.random().toString(16).substr(2, 8)}...`;

    console.log(`Стейк завершен: ${stake.amount} WAL + ${totalRewards.toFixed(4)} WAL награды`);
    console.log(`Период стейкинга: ${stakingDays.toFixed(1)} дней`);

    return {
      success: true,
      txDigest: mockTxDigest,
      stakeId
    };

  } catch (error) {
    console.error('Ошибка при снятии стейка:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }
}

/**
 * Собирает награды со стейка без его завершения
 * @param userAddress адрес пользователя
 * @param stakeId ID стейка
 * @returns Promise<StakingResult>
 */
export async function claimRewards(userAddress: string, stakeId: string): Promise<StakingResult> {
  try {
    const userStakesList = userStakes.get(userAddress) || [];
    const stakeIndex = userStakesList.findIndex(stake => stake.stakeId === stakeId);

    if (stakeIndex === -1) {
      return {
        success: false,
        error: 'Стейк не найден'
      };
    }

    const stake = userStakesList[stakeIndex];

    if (!stake.isActive) {
      return {
        success: false,
        error: 'Стейк не активен'
      };
    }

    // Рассчитываем доступные награды
    const currentTime = new Date();
    const stakingDays = (currentTime.getTime() - stake.startTime.getTime()) / (1000 * 60 * 60 * 24);
    const dailyReward = (stake.amount * STAKING_CONFIG.STAKING_APY / 100) / 365;
    const availableRewards = dailyReward * stakingDays;

    if (availableRewards < 0.001) {
      return {
        success: false,
        error: 'Недостаточно накопленных наград для сбора'
      };
    }

    // Создаем транзакцию для сбора наград
    const tx = new TransactionBlock();

    tx.moveCall({
      target: `${STAKING_CONFIG.STAKING_PACKAGE_ID}::staking::claim_rewards`,
      arguments: [
        tx.object(STAKING_CONFIG.WALRUS_POOL_OBJECT_ID),
        tx.pure(stakeId)
      ],
      typeArguments: [STAKING_CONFIG.WAL_TYPE]
    });

    // Обновляем время начала для пересчета наград
    stake.startTime = currentTime;
    stake.currentRewards = 0;
    userStakesList[stakeIndex] = stake;
    userStakes.set(userAddress, userStakesList);

    const mockTxDigest = `0x${Math.random().toString(16).substr(2, 8)}...`;

    console.log(`Награды собраны: ${availableRewards.toFixed(4)} WAL`);

    return {
      success: true,
      txDigest: mockTxDigest,
      stakeId
    };

  } catch (error) {
    console.error('Ошибка при сборе наград:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }
}

/**
 * Получает общую статистику стейкинга
 * @returns Promise<StakingStats>
 */
export async function getStakingStats(): Promise<StakingStats> {
  try {
    let totalStaked = 0;
    let totalStakers = 0;
    let totalRewardsDistributed = 0;

    // Подсчитываем статистику по всем пользователям
    for (const [userAddress, stakes] of userStakes.entries()) {
      if (stakes.length > 0) {
        totalStakers++;
        
        for (const stake of stakes) {
          if (stake.isActive) {
            totalStaked += stake.amount;
          }
          totalRewardsDistributed += stake.currentRewards;
        }
      }
    }

    const averageStake = totalStakers > 0 ? totalStaked / totalStakers : 0;

    return {
      totalStaked: parseFloat(totalStaked.toFixed(2)),
      totalStakers,
      averageStake: parseFloat(averageStake.toFixed(2)),
      totalRewardsDistributed: parseFloat(totalRewardsDistributed.toFixed(4)),
      currentAPY: STAKING_CONFIG.STAKING_APY
    };

  } catch (error) {
    console.error('Ошибка получения статистики стейкинга:', error);
    return {
      totalStaked: 0,
      totalStakers: 0,
      averageStake: 0,
      totalRewardsDistributed: 0,
      currentAPY: STAKING_CONFIG.STAKING_APY
    };
  }
}

/**
 * Рассчитывает потенциальные награды для заданной суммы и периода
 * @param amount сумма для стейкинга
 * @param days количество дней
 * @returns number потенциальные награды
 */
export function calculatePotentialRewards(amount: number, days: number): number {
  const dailyReward = (amount * STAKING_CONFIG.STAKING_APY / 100) / 365;
  return dailyReward * days;
}

/**
 * Получает доступные пулы для стейкинга
 * @returns Promise<Array> список пулов
 */
export async function getAvailablePools(): Promise<Array<{
  poolId: string;
  name: string;
  apy: number;
  totalStaked: number;
  lockPeriod: number;
  minStake: number;
}>> {
  // В реальном проекте здесь должен быть запрос к блокчейну
  return [
    {
      poolId: STAKING_CONFIG.WALRUS_POOL_OBJECT_ID,
      name: 'Walrus Main Pool',
      apy: STAKING_CONFIG.STAKING_APY,
      totalStaked: 1000000,
      lockPeriod: STAKING_CONFIG.LOCK_PERIOD_DAYS,
      minStake: STAKING_CONFIG.MIN_STAKE_AMOUNT
    }
  ];
}

