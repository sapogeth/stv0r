// src/services/swapService.ts

import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import { MIST_PER_SUI } from '@mysten/sui.js/utils';

// Конфигурация для свапа
const SWAP_CONFIG = {
  // Адреса контрактов для свапа (тестовые значения)
  SWAP_PACKAGE_ID: '0x1234567890abcdef1234567890abcdef12345678',
  
  // Типы токенов
  SUI_TYPE: '0x2::sui::SUI',
  WAL_TYPE: '0x9f9b4f113862e8b1a3591d7955fadd7c52ecc07cf24be9e3492ce56eb8087805::wal::WAL',
  
  // Пулы ликвидности
  SUI_WAL_POOL: '0x795ddbc26b8cfff2551f45e198b87fc19473f2df50f995376b924ac80e56f88b',
  
  // Минимальные суммы для свапа
  MIN_SWAP_AMOUNT: 0.01,
  
  // Комиссия за свап (в процентах)
  SWAP_FEE: 0.3,
  
  // RPC URL
  RPC_URL: getFullnodeUrl('testnet')
};

// Инициализация клиента
const client = new SuiClient({ url: SWAP_CONFIG.RPC_URL });

/**
 * Интерфейс для результата свапа
 */
export interface SwapResult {
  success: boolean;
  txDigest?: string;
  amountOut?: number;
  error?: string;
}

/**
 * Интерфейс для информации о пуле
 */
export interface PoolInfo {
  suiReserve: number;
  walReserve: number;
  totalLiquidity: number;
  currentPrice: number;
}

/**
 * Получает информацию о пуле ликвидности SUI/WAL
 * @returns Promise<PoolInfo> информация о пуле
 */
export async function getPoolInfo(): Promise<PoolInfo> {
  try {
    // В реальном проекте здесь должен быть запрос к смарт-контракту пула
    // Для демонстрации возвращаем мок-данные
    return {
      suiReserve: 1000000, // 1M SUI
      walReserve: 500000,  // 500K WAL
      totalLiquidity: 707106, // sqrt(1M * 500K)
      currentPrice: 0.5 // 1 SUI = 0.5 WAL
    };
  } catch (error) {
    console.error('Ошибка получения информации о пуле:', error);
    throw error;
  }
}

/**
 * Рассчитывает количество токенов на выходе для свапа
 * @param amountIn количество входных токенов
 * @param reserveIn резерв входного токена
 * @param reserveOut резерв выходного токена
 * @returns number количество выходных токенов
 */
function calculateAmountOut(amountIn: number, reserveIn: number, reserveOut: number): number {
  // Формула AMM (Automated Market Maker): x * y = k
  // amountOut = (amountIn * reserveOut) / (reserveIn + amountIn)
  
  const amountInWithFee = amountIn * (1 - SWAP_CONFIG.SWAP_FEE / 100);
  const numerator = amountInWithFee * reserveOut;
  const denominator = reserveIn + amountInWithFee;
  
  return numerator / denominator;
}

/**
 * Получает предварительный расчет свапа
 * @param fromToken тип входного токена ('SUI' | 'WAL')
 * @param toToken тип выходного токена ('SUI' | 'WAL')
 * @param amountIn количество входных токенов
 * @returns Promise<{amountOut: number, priceImpact: number, fee: number}>
 */
export async function getSwapQuote(
  fromToken: 'SUI' | 'WAL',
  toToken: 'SUI' | 'WAL',
  amountIn: number
): Promise<{amountOut: number, priceImpact: number, fee: number}> {
  if (fromToken === toToken) {
    throw new Error('Нельзя свапать токен сам на себя');
  }

  if (amountIn < SWAP_CONFIG.MIN_SWAP_AMOUNT) {
    throw new Error(`Минимальная сумма для свапа: ${SWAP_CONFIG.MIN_SWAP_AMOUNT}`);
  }

  const poolInfo = await getPoolInfo();
  
  let reserveIn: number;
  let reserveOut: number;
  
  if (fromToken === 'SUI') {
    reserveIn = poolInfo.suiReserve;
    reserveOut = poolInfo.walReserve;
  } else {
    reserveIn = poolInfo.walReserve;
    reserveOut = poolInfo.suiReserve;
  }

  const amountOut = calculateAmountOut(amountIn, reserveIn, reserveOut);
  
  // Расчет влияния на цену
  const currentPrice = fromToken === 'SUI' ? poolInfo.currentPrice : 1 / poolInfo.currentPrice;
  const newPrice = amountOut / amountIn;
  const priceImpact = Math.abs((newPrice - currentPrice) / currentPrice) * 100;
  
  // Расчет комиссии
  const fee = amountIn * (SWAP_CONFIG.SWAP_FEE / 100);

  return {
    amountOut: parseFloat(amountOut.toFixed(6)),
    priceImpact: parseFloat(priceImpact.toFixed(2)),
    fee: parseFloat(fee.toFixed(6))
  };
}

/**
 * Выполняет свап SUI на WAL
 * @param userAddress адрес пользователя
 * @param amountIn количество SUI для свапа
 * @returns Promise<SwapResult>
 */
export async function swapSuiToWal(userAddress: string, amountIn: number): Promise<SwapResult> {
  try {
    if (amountIn < SWAP_CONFIG.MIN_SWAP_AMOUNT) {
      return {
        success: false,
        error: `Минимальная сумма для свапа: ${SWAP_CONFIG.MIN_SWAP_AMOUNT} SUI`
      };
    }

    // Получаем расчет свапа
    const quote = await getSwapQuote('SUI', 'WAL', amountIn);

    // Создаем транзакцию
    const tx = new TransactionBlock();
    
    // Получаем монеты пользователя
    const coins = await client.getCoins({
      owner: userAddress,
      coinType: SWAP_CONFIG.SUI_TYPE,
      limit: 10
    });

    if (coins.data.length === 0) {
      return {
        success: false,
        error: 'У пользователя нет SUI монет'
      };
    }

    // Находим подходящие монеты для свапа
    const requiredAmount = BigInt(Math.floor(amountIn * Number(MIST_PER_SUI)));
    let totalAmount = BigInt(0);
    const selectedCoins: string[] = [];

    for (const coin of coins.data) {
      selectedCoins.push(coin.coinObjectId);
      totalAmount += BigInt(coin.balance);
      
      if (totalAmount >= requiredAmount) {
        break;
      }
    }

    if (totalAmount < requiredAmount) {
      return {
        success: false,
        error: 'Недостаточно SUI для свапа'
      };
    }

    // Объединяем монеты если нужно
    let coinToSwap: any;
    if (selectedCoins.length === 1) {
      coinToSwap = tx.object(selectedCoins[0]);
    } else {
      coinToSwap = tx.mergeCoins(tx.object(selectedCoins[0]), selectedCoins.slice(1).map(id => tx.object(id)));
    }

    // Разделяем нужную сумму
    const [swapCoin] = tx.splitCoins(coinToSwap, [requiredAmount]);

    // Выполняем свап (псевдокод - в реальности нужен правильный вызов контракта)
    tx.moveCall({
      target: `${SWAP_CONFIG.SWAP_PACKAGE_ID}::swap::swap_sui_to_wal`,
      arguments: [
        tx.object(SWAP_CONFIG.SUI_WAL_POOL),
        swapCoin,
        tx.pure(Math.floor(quote.amountOut * 0.95 * Number(MIST_PER_SUI))) // slippage tolerance 5%
      ],
      typeArguments: [SWAP_CONFIG.SUI_TYPE, SWAP_CONFIG.WAL_TYPE]
    });

    // В реальном проекте здесь должна быть подпись и выполнение транзакции
    // Для демонстрации возвращаем успешный результат
    const mockTxDigest = `0x${Math.random().toString(16).substr(2, 8)}...`;

    console.log(`Свап выполнен: ${amountIn} SUI -> ${quote.amountOut} WAL`);
    console.log(`Влияние на цену: ${quote.priceImpact}%`);
    console.log(`Комиссия: ${quote.fee} SUI`);

    return {
      success: true,
      txDigest: mockTxDigest,
      amountOut: quote.amountOut
    };

  } catch (error) {
    console.error('Ошибка при свапе SUI на WAL:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }
}

/**
 * Выполняет свап WAL на SUI
 * @param userAddress адрес пользователя
 * @param amountIn количество WAL для свапа
 * @returns Promise<SwapResult>
 */
export async function swapWalToSui(userAddress: string, amountIn: number): Promise<SwapResult> {
  try {
    if (amountIn < SWAP_CONFIG.MIN_SWAP_AMOUNT) {
      return {
        success: false,
        error: `Минимальная сумма для свапа: ${SWAP_CONFIG.MIN_SWAP_AMOUNT} WAL`
      };
    }

    // Получаем расчет свапа
    const quote = await getSwapQuote('WAL', 'SUI', amountIn);

    // Создаем транзакцию
    const tx = new TransactionBlock();
    
    // Получаем WAL монеты пользователя
    const coins = await client.getCoins({
      owner: userAddress,
      coinType: SWAP_CONFIG.WAL_TYPE,
      limit: 10
    });

    if (coins.data.length === 0) {
      return {
        success: false,
        error: 'У пользователя нет WAL монет'
      };
    }

    // Аналогичная логика как для SUI->WAL свапа
    const mockTxDigest = `0x${Math.random().toString(16).substr(2, 8)}...`;

    console.log(`Свап выполнен: ${amountIn} WAL -> ${quote.amountOut} SUI`);
    console.log(`Влияние на цену: ${quote.priceImpact}%`);
    console.log(`Комиссия: ${quote.fee} WAL`);

    return {
      success: true,
      txDigest: mockTxDigest,
      amountOut: quote.amountOut
    };

  } catch (error) {
    console.error('Ошибка при свапе WAL на SUI:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Неизвестная ошибка'
    };
  }
}

/**
 * Получает баланс токенов пользователя
 * @param userAddress адрес пользователя
 * @returns Promise<{sui: number, wal: number}>
 */
export async function getUserTokenBalances(userAddress: string): Promise<{sui: number, wal: number}> {
  try {
    // Получаем баланс SUI
    const suiBalance = await client.getBalance({
      owner: userAddress,
      coinType: SWAP_CONFIG.SUI_TYPE
    });

    // Получаем баланс WAL
    const walBalance = await client.getBalance({
      owner: userAddress,
      coinType: SWAP_CONFIG.WAL_TYPE
    });

    return {
      sui: Number(suiBalance.totalBalance) / Number(MIST_PER_SUI),
      wal: Number(walBalance.totalBalance) / Number(MIST_PER_SUI) // Предполагаем, что WAL имеет такую же точность
    };

  } catch (error) {
    console.error('Ошибка получения балансов:', error);
    return { sui: 0, wal: 0 };
  }
}

/**
 * Получает историю свапов пользователя (мок-данные)
 * @param userAddress адрес пользователя
 * @returns Promise<Array> история свапов
 */
export async function getUserSwapHistory(userAddress: string): Promise<Array<{
  timestamp: Date;
  fromToken: string;
  toToken: string;
  amountIn: number;
  amountOut: number;
  txDigest: string;
}>> {
  // В реальном проекте здесь должен быть запрос к блокчейну или базе данных
  // Для демонстрации возвращаем мок-данные
  return [
    {
      timestamp: new Date(Date.now() - 86400000), // 1 день назад
      fromToken: 'SUI',
      toToken: 'WAL',
      amountIn: 10,
      amountOut: 4.85,
      txDigest: '0xabc123...'
    },
    {
      timestamp: new Date(Date.now() - 172800000), // 2 дня назад
      fromToken: 'WAL',
      toToken: 'SUI',
      amountIn: 5,
      amountOut: 10.2,
      txDigest: '0xdef456...'
    }
  ];
}

