import type { NicknameNFT, User } from '../types/user';
import { getUserByWallet, updateUserNickname } from './userService';
import { getNFTByTokenId, createNicknameNFT } from './marketplaceService';

// Максимальное количество никнеймов на пользователя
const MAX_NICKNAMES_PER_USER = 4;

// Хранилище владения никнеймами: walletAddress -> nickname[]
const userNicknames: Map<string, string[]> = new Map();

// Хранилище активного никнейма: walletAddress -> activeNickname
const activeNicknames: Map<string, string> = new Map();

/**
 * Интерфейс для информации о владении никнеймами
 */
export interface NicknameOwnership {
  walletAddress: string;
  ownedNicknames: string[];
  activeNickname: string | null;
  canBuyMore: boolean;
  remainingSlots: number;
}

/**
 * Присваивает никнейм пользователю после покупки
 * @param walletAddress адрес кошелька покупателя
 * @param nickname купленный никнейм
 * @param tokenId ID NFT токена
 * @returns Promise<{ success: boolean; message: string }> результат присвоения
 */
export async function assignNicknameAfterPurchase(
  walletAddress: string,
  nickname: string,
  tokenId: string
): Promise<{ success: boolean; message: string }> {
  try {
    // Проверяем, не превышен ли лимит никнеймов
    const currentNicknames = getUserNicknames(walletAddress);
    if (currentNicknames.length >= MAX_NICKNAMES_PER_USER) {
      return {
        success: false,
        message: `Превышен лимит никнеймов. Максимум ${MAX_NICKNAMES_PER_USER} никнеймов на пользователя.`
      };
    }

    // Проверяем, не владеет ли пользователь уже этим никнеймом
    if (currentNicknames.includes(nickname)) {
      return {
        success: false,
        message: 'Вы уже владеете этим никнеймом.'
      };
    }

    // Добавляем никнейм к списку владения
    const updatedNicknames = [...currentNicknames, nickname];
    userNicknames.set(walletAddress, updatedNicknames);

    // Если это первый никнейм пользователя, делаем его активным
    if (!activeNicknames.has(walletAddress)) {
      activeNicknames.set(walletAddress, nickname);
      
      // Обновляем никнейм в userService
      const user = getUserByWallet(walletAddress);
      if (user) {
        await updateUserNickname(user.id, nickname);
      }
    }

    console.log(`Никнейм "${nickname}" успешно присвоен пользователю ${walletAddress}`);
    return {
      success: true,
      message: `Никнейм "${nickname}" успешно добавлен к вашей коллекции!`
    };
  } catch (error) {
    console.error('Ошибка присвоения никнейма:', error);
    return {
      success: false,
      message: 'Произошла ошибка при присвоении никнейма.'
    };
  }
}

/**
 * Получает все никнеймы пользователя
 * @param walletAddress адрес кошелька
 * @returns string[] массив никнеймов
 */
export function getUserNicknames(walletAddress: string): string[] {
  return userNicknames.get(walletAddress) || [];
}

/**
 * Получает активный никнейм пользователя
 * @param walletAddress адрес кошелька
 * @returns string | null активный никнейм
 */
export function getActiveNickname(walletAddress: string): string | null {
  return activeNicknames.get(walletAddress) || null;
}

/**
 * Устанавливает активный никнейм пользователя
 * @param walletAddress адрес кошелька
 * @param nickname никнейм для активации
 * @returns Promise<{ success: boolean; message: string }> результат установки
 */
export async function setActiveNickname(
  walletAddress: string,
  nickname: string
): Promise<{ success: boolean; message: string }> {
  try {
    const userNicks = getUserNicknames(walletAddress);
    
    if (!userNicks.includes(nickname)) {
      return {
        success: false,
        message: 'Вы не владеете этим никнеймом.'
      };
    }

    activeNicknames.set(walletAddress, nickname);
    
    // Обновляем никнейм в userService
    const user = getUserByWallet(walletAddress);
    if (user) {
      await updateUserNickname(user.id, nickname);
    }

    return {
      success: true,
      message: `Активный никнейм изменен на "${nickname}".`
    };
  } catch (error) {
    console.error('Ошибка установки активного никнейма:', error);
    return {
      success: false,
      message: 'Произошла ошибка при смене активного никнейма.'
    };
  }
}

/**
 * Получает информацию о владении никнеймами пользователя
 * @param walletAddress адрес кошелька
 * @returns NicknameOwnership информация о владении
 */
export function getNicknameOwnership(walletAddress: string): NicknameOwnership {
  const ownedNicknames = getUserNicknames(walletAddress);
  const activeNickname = getActiveNickname(walletAddress);
  const remainingSlots = MAX_NICKNAMES_PER_USER - ownedNicknames.length;

  return {
    walletAddress,
    ownedNicknames,
    activeNickname,
    canBuyMore: remainingSlots > 0,
    remainingSlots: Math.max(0, remainingSlots)
  };
}

/**
 * Проверяет, может ли пользователь купить еще никнеймы
 * @param walletAddress адрес кошелька
 * @returns boolean может ли купить еще
 */
export function canUserBuyMoreNicknames(walletAddress: string): boolean {
  const currentCount = getUserNicknames(walletAddress).length;
  return currentCount < MAX_NICKNAMES_PER_USER;
}

/**
 * Получает количество оставшихся слотов для никнеймов
 * @param walletAddress адрес кошелька
 * @returns number количество оставшихся слотов
 */
export function getRemainingNicknameSlots(walletAddress: string): number {
  const currentCount = getUserNicknames(walletAddress).length;
  return Math.max(0, MAX_NICKNAMES_PER_USER - currentCount);
}

/**
 * Удаляет никнейм из владения пользователя (при продаже)
 * @param walletAddress адрес кошелька
 * @param nickname никнейм для удаления
 * @returns Promise<{ success: boolean; message: string }> результат удаления
 */
export async function removeNicknameFromUser(
  walletAddress: string,
  nickname: string
): Promise<{ success: boolean; message: string }> {
  try {
    const currentNicknames = getUserNicknames(walletAddress);
    
    if (!currentNicknames.includes(nickname)) {
      return {
        success: false,
        message: 'Пользователь не владеет этим никнеймом.'
      };
    }

    // Удаляем никнейм из списка
    const updatedNicknames = currentNicknames.filter(n => n !== nickname);
    userNicknames.set(walletAddress, updatedNicknames);

    // Если это был активный никнейм, выбираем новый активный
    const currentActive = getActiveNickname(walletAddress);
    if (currentActive === nickname) {
      if (updatedNicknames.length > 0) {
        // Устанавливаем первый доступный никнейм как активный
        await setActiveNickname(walletAddress, updatedNicknames[0]);
      } else {
        // Если никнеймов не осталось, удаляем активный
        activeNicknames.delete(walletAddress);
        
        // Генерируем новый временный никнейм в userService
        const user = getUserByWallet(walletAddress);
        if (user) {
          const { generateAvailableNickname } = await import('../utils/nicknameGenerator');
          const newNickname = await generateAvailableNickname();
          await updateUserNickname(user.id, newNickname);
        }
      }
    }

    return {
      success: true,
      message: `Никнейм "${nickname}" удален из вашей коллекции.`
    };
  } catch (error) {
    console.error('Ошибка удаления никнейма:', error);
    return {
      success: false,
      message: 'Произошла ошибка при удалении никнейма.'
    };
  }
}

/**
 * Получает статистику владения никнеймами
 * @returns объект со статистикой
 */
export function getNicknameOwnershipStats() {
  const totalUsers = userNicknames.size;
  const totalNicknames = Array.from(userNicknames.values()).reduce((sum, nicks) => sum + nicks.length, 0);
  const averageNicknamesPerUser = totalUsers > 0 ? totalNicknames / totalUsers : 0;
  
  // Распределение по количеству никнеймов
  const distribution: Record<number, number> = {};
  for (let i = 0; i <= MAX_NICKNAMES_PER_USER; i++) {
    distribution[i] = 0;
  }
  
  for (const nicknames of userNicknames.values()) {
    const count = Math.min(nicknames.length, MAX_NICKNAMES_PER_USER);
    distribution[count]++;
  }

  return {
    totalUsers,
    totalNicknames,
    averageNicknamesPerUser: Math.round(averageNicknamesPerUser * 100) / 100,
    maxNicknamesPerUser: MAX_NICKNAMES_PER_USER,
    distribution
  };
}

/**
 * Инициализирует владение никнеймом для нового пользователя
 * @param walletAddress адрес кошелька
 * @param initialNickname начальный никнейм
 */
export function initializeUserNicknames(walletAddress: string, initialNickname: string): void {
  if (!userNicknames.has(walletAddress)) {
    userNicknames.set(walletAddress, [initialNickname]);
    activeNicknames.set(walletAddress, initialNickname);
  }
}

/**
 * Получает всех пользователей с их никнеймами
 * @returns Map<string, string[]> карта пользователей и их никнеймов
 */
export function getAllUserNicknames(): Map<string, string[]> {
  return new Map(userNicknames);
}