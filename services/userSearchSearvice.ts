// src/services/userSearchService.ts

import { getUserByNickname, getAllUsers } from './userService';
import { getAllUserNicknames } from './nicknameOwnershipService';
import type { User } from '../types/user';

/**
 * Интерфейс для результата поиска пользователя
 */
export interface UserSearchResult {
  user: User;
  nickname: string;
  isActive: boolean;
  allNicknames: string[];
}

/**
 * Интерфейс для расширенного поиска
 */
export interface SearchFilters {
  query: string;
  exactMatch?: boolean;
  includeInactive?: boolean;
  limit?: number;
}

/**
 * Ищет пользователей по никнейму
 * @param query поисковый запрос
 * @param exactMatch точное совпадение или частичное
 * @returns Promise<UserSearchResult[]> результаты поиска
 */
export async function searchUsersByNickname(
  query: string,
  exactMatch: boolean = false
): Promise<UserSearchResult[]> {
  if (!query.trim()) {
    return [];
  }

  const searchQuery = query.toLowerCase().replace('@', '');
  const results: UserSearchResult[] = [];
  const allUserNicknames = getAllUserNicknames();
  const allUsers = getAllUsers();

  // Создаем карту пользователей для быстрого поиска
  const userMap = new Map<string, User>();
  allUsers.forEach(user => {
    userMap.set(user.walletAddress, user);
  });

  // Поиск по всем никнеймам пользователей
  for (const [walletAddress, nicknames] of allUserNicknames.entries()) {
    const user = userMap.get(walletAddress);
    if (!user) continue;

    for (const nickname of nicknames) {
      const nicknameMatch = exactMatch 
        ? nickname.toLowerCase() === searchQuery
        : nickname.toLowerCase().includes(searchQuery);

      if (nicknameMatch) {
        // Проверяем, является ли этот никнейм активным
        const { getActiveNickname } = await import('./nicknameOwnershipService');
        const activeNickname = getActiveNickname(walletAddress);
        
        results.push({
          user,
          nickname,
          isActive: nickname === activeNickname,
          allNicknames: nicknames
        });
      }
    }
  }

  // Сортируем результаты: сначала активные никнеймы, потом по алфавиту
  results.sort((a, b) => {
    if (a.isActive && !b.isActive) return -1;
    if (!a.isActive && b.isActive) return 1;
    return a.nickname.localeCompare(b.nickname);
  });

  return results;
}

/**
 * Расширенный поиск пользователей с фильтрами
 * @param filters фильтры поиска
 * @returns Promise<UserSearchResult[]> результаты поиска
 */
export async function advancedUserSearch(filters: SearchFilters): Promise<UserSearchResult[]> {
  const {
    query,
    exactMatch = false,
    includeInactive = true,
    limit = 50
  } = filters;

  let results = await searchUsersByNickname(query, exactMatch);

  // Фильтруем неактивные никнеймы если нужно
  if (!includeInactive) {
    results = results.filter(result => result.isActive);
  }

  // Ограничиваем количество результатов
  if (limit > 0) {
    results = results.slice(0, limit);
  }

  return results;
}

/**
 * Получает популярные никнеймы (для автодополнения)
 * @param limit максимальное количество результатов
 * @returns Promise<string[]> популярные никнеймы
 */
export async function getPopularNicknames(limit: number = 10): Promise<string[]> {
  const allUserNicknames = getAllUserNicknames();
  const { getActiveNickname } = await import('./nicknameOwnershipService');
  
  const activeNicknames: string[] = [];
  
  for (const [walletAddress] of allUserNicknames.entries()) {
    const activeNickname = getActiveNickname(walletAddress);
    if (activeNickname) {
      activeNicknames.push(activeNickname);
    }
  }

  // Сортируем по алфавиту и возвращаем ограниченное количество
  return activeNicknames
    .sort((a, b) => a.localeCompare(b))
    .slice(0, limit);
}

/**
 * Проверяет доступность никнейма
 * @param nickname никнейм для проверки
 * @returns Promise<{ available: boolean; suggestions?: string[] }> доступность и предложения
 */
export async function checkNicknameAvailability(
  nickname: string
): Promise<{ available: boolean; suggestions?: string[] }> {
  const cleanNickname = nickname.toLowerCase().replace('@', '');
  
  // Проверяем, занят ли никнейм
  const existingUser = getUserByNickname(cleanNickname);
  
  if (!existingUser) {
    return { available: true };
  }

  // Если занят, генерируем предложения
  const suggestions: string[] = [];
  const { generateNicknameOptions } = await import('../utils/nicknameGenerator');
  
  // Генерируем варианты на основе исходного никнейма
  for (let i = 1; i <= 5; i++) {
    const suggestion = `${cleanNickname}${i}`;
    const suggestionUser = getUserByNickname(suggestion);
    if (!suggestionUser) {
      suggestions.push(suggestion);
    }
  }

  // Добавляем случайные варианты если мало предложений
  if (suggestions.length < 3) {
    const randomOptions = generateNicknameOptions(5);
    suggestions.push(...randomOptions.slice(0, 3 - suggestions.length));
  }

  return {
    available: false,
    suggestions: suggestions.slice(0, 5)
  };
}

/**
 * Получает статистику поиска
 * @returns объект со статистикой
 */
export function getSearchStats() {
  const allUserNicknames = getAllUserNicknames();
  const totalUsers = allUserNicknames.size;
  const totalNicknames = Array.from(allUserNicknames.values())
    .reduce((sum, nicknames) => sum + nicknames.length, 0);

  // Подсчитываем распределение по длине никнеймов
  const lengthDistribution: Record<number, number> = {};
  for (const nicknames of allUserNicknames.values()) {
    for (const nickname of nicknames) {
      const length = nickname.length;
      lengthDistribution[length] = (lengthDistribution[length] || 0) + 1;
    }
  }

  // Находим самые популярные первые буквы
  const firstLetterDistribution: Record<string, number> = {};
  for (const nicknames of allUserNicknames.values()) {
    for (const nickname of nicknames) {
      const firstLetter = nickname.charAt(0).toLowerCase();
      firstLetterDistribution[firstLetter] = (firstLetterDistribution[firstLetter] || 0) + 1;
    }
  }

  return {
    totalUsers,
    totalNicknames,
    averageNicknamesPerUser: totalUsers > 0 ? totalNicknames / totalUsers : 0,
    lengthDistribution,
    firstLetterDistribution,
    mostPopularFirstLetter: Object.entries(firstLetterDistribution)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'a'
  };
}

/**
 * Получает рекомендации пользователей для знакомства
 * @param currentUserAddress адрес текущего пользователя
 * @param limit максимальное количество рекомендаций
 * @returns Promise<UserSearchResult[]> рекомендованные пользователи
 */
export async function getRecommendedUsers(
  currentUserAddress: string,
  limit: number = 5
): Promise<UserSearchResult[]> {
  const allUserNicknames = getAllUserNicknames();
  const { getActiveNickname } = await import('./nicknameOwnershipService');
  const allUsers = getAllUsers();
  
  const recommendations: UserSearchResult[] = [];
  const userMap = new Map<string, User>();
  
  allUsers.forEach(user => {
    userMap.set(user.walletAddress, user);
  });

  // Исключаем текущего пользователя и получаем случайных пользователей
  for (const [walletAddress, nicknames] of allUserNicknames.entries()) {
    if (walletAddress === currentUserAddress) continue;
    
    const user = userMap.get(walletAddress);
    if (!user) continue;

    const activeNickname = getActiveNickname(walletAddress);
    if (activeNickname) {
      recommendations.push({
        user,
        nickname: activeNickname,
        isActive: true,
        allNicknames: nicknames
      });
    }
  }

  // Перемешиваем и возвращаем ограниченное количество
  const shuffled = recommendations.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, limit);
}
