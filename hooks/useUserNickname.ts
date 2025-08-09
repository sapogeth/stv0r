// src/hooks/useUserNickname.ts

import { useState, useEffect } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { getOrCreateUserByWallet, ensureUserHasNickname } from '../services/userService';
import { User } from '../types/user';

/**
 * Хук для автоматического управления никнеймами пользователей
 * Гарантирует, что у каждого подключенного пользователя есть никнейм
 */
export function useUserNickname() {
  const [user, setUser] = useState<User | null>(null);
  const [nickname, setNickname] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const account = useCurrentAccount();

  useEffect(() => {
    const initializeUser = async () => {
      if (!account?.address) {
        setUser(null);
        setNickname('');
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Получаем или создаем пользователя с гарантированным никнеймом
        const userData = await getOrCreateUserByWallet(account.address);
        setUser(userData);
        setNickname(userData.nickname);
        
        console.log('Пользователь инициализирован:', {
          address: account.address,
          nickname: userData.nickname,
          isNew: !userData.email.includes('@stvor.app') // Проверяем, новый ли пользователь
        });
        
      } catch (err) {
        console.error('Ошибка инициализации пользователя:', err);
        setError('Не удалось инициализировать пользователя');
        
        // Fallback: пытаемся хотя бы создать никнейм
        try {
          const fallbackNickname = await ensureUserHasNickname(account.address);
          setNickname(fallbackNickname);
        } catch (fallbackErr) {
          console.error('Ошибка создания fallback никнейма:', fallbackErr);
        }
      } finally {
        setLoading(false);
      }
    };

    initializeUser();
  }, [account?.address]);

  /**
   * Обновляет никнейм пользователя
   */
  const updateNickname = async (newNickname: string): Promise<boolean> => {
    if (!user || !account?.address) return false;

    try {
      setLoading(true);
      // В реальном приложении здесь будет API вызов
      const updatedUser = { ...user, nickname: newNickname, updatedAt: new Date() };
      setUser(updatedUser);
      setNickname(newNickname);
      return true;
    } catch (err) {
      console.error('Ошибка обновления никнейма:', err);
      setError('Не удалось обновить никнейм');
      return false;
    } finally {
      setLoading(false);
    }
  };

  /**
   * Принудительно обновляет данные пользователя
   */
  const refreshUser = async () => {
    if (!account?.address) return;

    setLoading(true);
    try {
      const userData = await getOrCreateUserByWallet(account.address);
      setUser(userData);
      setNickname(userData.nickname);
      setError(null);
    } catch (err) {
      console.error('Ошибка обновления данных пользователя:', err);
      setError('Не удалось обновить данные пользователя');
    } finally {
      setLoading(false);
    }
  };

  return {
    user,
    nickname,
    loading,
    error,
    updateNickname,
    refreshUser,
    isConnected: !!account?.address,
    walletAddress: account?.address || null
  };
}

