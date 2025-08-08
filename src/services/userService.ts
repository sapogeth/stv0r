// src/services/userService.ts

import type { User } from '../types/user';
import { generateAvailableNickname } from '../utils/nicknameGenerator';

// Временное хранилище пользователей (в реальном приложении это будет база данных)
const users: Map<string, User> = new Map();

/**
 * Создает нового пользователя с автоматически сгенерированным никнеймом
 * @param email email пользователя
 * @param walletAddress адрес кошелька
 * @returns Promise<User> созданный пользователь
 */
export async function createUser(email: string, walletAddress: string): Promise<User> {
  const nickname = await generateAvailableNickname();
  
  const user: User = {
    id: generateUserId(),
    email,
    walletAddress,
    nickname,
    isNicknameNFT: false, // Изначально никнейм не является NFT
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  users.set(user.id, user);
  return user;
}

/**
 * Получает или создает пользователя по адресу кошелька
 * Гарантирует, что у каждого пользователя есть никнейм
 * @param walletAddress адрес кошелька
 * @param email опциональный email для новых пользователей
 * @returns Promise<User> пользователь с гарантированным никнеймом
 */
export async function getOrCreateUserByWallet(walletAddress: string, email?: string): Promise<User> {
  // Сначала ищем существующего пользователя
  let user = getUserByWallet(walletAddress);
  
  if (!user) {
    // Если пользователь не найден, создаем нового
    const userEmail = email || `user_${Date.now()}@stvor.app`;
    user = await createUser(userEmail, walletAddress);
    console.log(`Создан новый пользователь с никнеймом: ${user.nickname}`);
  } else if (!user.nickname || user.nickname.trim() === '') {
    // Если у существующего пользователя нет никнейма, создаем его
    const nickname = await generateAvailableNickname();
    user.nickname = nickname;
    user.updatedAt = new Date();
    users.set(user.id, user);
    console.log(`Добавлен никнейм для существующего пользователя: ${nickname}`);
  }
  
  return user;
}

/**
 * Проверяет и обеспечивает наличие никнейма у пользователя
 * @param walletAddress адрес кошелька
 * @returns Promise<string> никнейм пользователя
 */
export async function ensureUserHasNickname(walletAddress: string): Promise<string> {
  const user = await getOrCreateUserByWallet(walletAddress);
  return user.nickname;
}

/**
 * Получает пользователя по ID
 * @param userId ID пользователя
 * @returns User | null
 */
export function getUserById(userId: string): User | null {
  return users.get(userId) || null;
}

/**
 * Получает пользователя по адресу кошелька
 * @param walletAddress адрес кошелька
 * @returns User | null
 */
export function getUserByWallet(walletAddress: string): User | null {
  for (const user of users.values()) {
    if (user.walletAddress === walletAddress) {
      return user;
    }
  }
  return null;
}

/**
 * Получает пользователя по никнейму
 * @param nickname никнейм
 * @returns User | null
 */
export function getUserByNickname(nickname: string): User | null {
  for (const user of users.values()) {
    if (user.nickname === nickname) {
      return user;
    }
  }
  return null;
}

/**
 * Обновляет никнейм пользователя
 * @param userId ID пользователя
 * @param newNickname новый никнейм
 * @returns Promise<boolean> успешно ли обновлен
 */
export async function updateUserNickname(userId: string, newNickname: string): Promise<boolean> {
  const user = users.get(userId);
  if (!user) return false;
  
  // Проверяем, не занят ли никнейм
  if (getUserByNickname(newNickname)) {
    return false;
  }
  
  user.nickname = newNickname;
  user.updatedAt = new Date();
  users.set(userId, user);
  
  return true;
}

/**
 * Конвертирует никнейм пользователя в NFT
 * @param userId ID пользователя
 * @param tokenId ID созданного NFT токена
 * @returns Promise<boolean> успешно ли конвертирован
 */
export async function convertNicknameToNFT(userId: string, tokenId: string): Promise<boolean> {
  const user = users.get(userId);
  if (!user) return false;
  
  user.isNicknameNFT = true;
  user.nicknameTokenId = tokenId;
  user.updatedAt = new Date();
  users.set(userId, user);
  
  return true;
}

/**
 * Получает всех пользователей
 * @returns User[] массив всех пользователей
 */
export function getAllUsers(): User[] {
  return Array.from(users.values());
}

/**
 * Генерирует уникальный ID пользователя
 * @returns string уникальный ID
 */
function generateUserId(): string {
  return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

