// src/services/chatService.ts

import type { User } from '../types/user';
import { getUserByWallet } from './userService';
import { getActiveNickname } from './nicknameOwnershipService';

/**
 * Интерфейс для сообщения в чате
 */
export interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderNickname: string;
  recipientId: string;
  recipientNickname: string;
  content: string;
  timestamp: Date;
  isRead: boolean;
  messageType: 'text' | 'image' | 'file';
  metadata?: {
    imageUrl?: string;
    fileName?: string;
    fileSize?: number;
  };
}

/**
 * Интерфейс для чата
 */
export interface Chat {
  id: string;
  participants: string[]; // wallet addresses
  participantNicknames: string[];
  lastMessage?: ChatMessage;
  lastActivity: Date;
  unreadCount: Record<string, number>; // walletAddress -> unread count
  isActive: boolean;
}

/**
 * Интерфейс для создания нового сообщения
 */
export interface NewMessage {
  recipientAddress: string;
  content: string;
  messageType?: 'text' | 'image' | 'file';
  metadata?: {
    imageUrl?: string;
    fileName?: string;
    fileSize?: number;
  };
}

// Хранилище чатов и сообщений
const chats: Map<string, Chat> = new Map();
const messages: Map<string, ChatMessage[]> = new Map();

/**
 * Создает или получает существующий чат между двумя пользователями
 * @param user1Address адрес первого пользователя
 * @param user2Address адрес второго пользователя
 * @returns Promise<Chat> чат между пользователями
 */
export async function getOrCreateChat(
  user1Address: string,
  user2Address: string
): Promise<Chat> {
  // Создаем уникальный ID чата (сортируем адреса для консистентности)
  const sortedAddresses = [user1Address, user2Address].sort();
  const chatId = `chat_${sortedAddresses[0]}_${sortedAddresses[1]}`;

  // Проверяем, существует ли уже чат
  let chat = chats.get(chatId);
  
  if (!chat) {
    // Получаем никнеймы участников
    const user1Nickname = getActiveNickname(user1Address) || 'Unknown';
    const user2Nickname = getActiveNickname(user2Address) || 'Unknown';

    // Создаем новый чат
    chat = {
      id: chatId,
      participants: sortedAddresses,
      participantNicknames: [user1Nickname, user2Nickname],
      lastActivity: new Date(),
      unreadCount: {
        [user1Address]: 0,
        [user2Address]: 0
      },
      isActive: true
    };

    chats.set(chatId, chat);
    messages.set(chatId, []);
  }

  return chat;
}

/**
 * Отправляет сообщение в чат
 * @param senderAddress адрес отправителя
 * @param newMessage данные нового сообщения
 * @returns Promise<ChatMessage> отправленное сообщение
 */
export async function sendMessage(
  senderAddress: string,
  newMessage: NewMessage
): Promise<ChatMessage> {
  const { recipientAddress, content, messageType = 'text', metadata } = newMessage;

  // Получаем или создаем чат
  const chat = await getOrCreateChat(senderAddress, recipientAddress);
  
  // Получаем никнеймы
  const senderNickname = getActiveNickname(senderAddress) || 'Unknown';
  const recipientNickname = getActiveNickname(recipientAddress) || 'Unknown';

  // Создаем сообщение
  const message: ChatMessage = {
    id: generateMessageId(),
    chatId: chat.id,
    senderId: senderAddress,
    senderNickname,
    recipientId: recipientAddress,
    recipientNickname,
    content,
    timestamp: new Date(),
    isRead: false,
    messageType,
    metadata
  };

  // Добавляем сообщение в чат
  const chatMessages = messages.get(chat.id) || [];
  chatMessages.push(message);
  messages.set(chat.id, chatMessages);

  // Обновляем чат
  chat.lastMessage = message;
  chat.lastActivity = new Date();
  chat.unreadCount[recipientAddress] = (chat.unreadCount[recipientAddress] || 0) + 1;
  chats.set(chat.id, chat);

  console.log(`Сообщение отправлено от @${senderNickname} к @${recipientNickname}`);
  return message;
}

/**
 * Получает сообщения чата
 * @param chatId ID чата
 * @param limit максимальное количество сообщений
 * @param offset смещение для пагинации
 * @returns ChatMessage[] сообщения чата
 */
export function getChatMessages(
  chatId: string,
  limit: number = 50,
  offset: number = 0
): ChatMessage[] {
  const chatMessages = messages.get(chatId) || [];
  
  // Сортируем по времени (новые сначала) и применяем пагинацию
  return chatMessages
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(offset, offset + limit);
}

/**
 * Получает все чаты пользователя
 * @param userAddress адрес пользователя
 * @returns Chat[] чаты пользователя
 */
export function getUserChats(userAddress: string): Chat[] {
  const userChats: Chat[] = [];

  for (const chat of chats.values()) {
    if (chat.participants.includes(userAddress) && chat.isActive) {
      userChats.push(chat);
    }
  }

  // Сортируем по последней активности
  return userChats.sort((a, b) => 
    b.lastActivity.getTime() - a.lastActivity.getTime()
  );
}

/**
 * Отмечает сообщения как прочитанные
 * @param chatId ID чата
 * @param userAddress адрес пользователя, который прочитал сообщения
 * @returns Promise<number> количество отмеченных сообщений
 */
export async function markMessagesAsRead(
  chatId: string,
  userAddress: string
): Promise<number> {
  const chatMessages = messages.get(chatId) || [];
  let markedCount = 0;

  // Отмечаем непрочитанные сообщения как прочитанные
  for (const message of chatMessages) {
    if (message.recipientId === userAddress && !message.isRead) {
      message.isRead = true;
      markedCount++;
    }
  }

  // Обновляем счетчик непрочитанных в чате
  const chat = chats.get(chatId);
  if (chat) {
    chat.unreadCount[userAddress] = 0;
    chats.set(chatId, chat);
  }

  return markedCount;
}

/**
 * Получает количество непрочитанных сообщений для пользователя
 * @param userAddress адрес пользователя
 * @returns number общее количество непрочитанных сообщений
 */
export function getTotalUnreadCount(userAddress: string): number {
  let totalUnread = 0;

  for (const chat of chats.values()) {
    if (chat.participants.includes(userAddress)) {
      totalUnread += chat.unreadCount[userAddress] || 0;
    }
  }

  return totalUnread;
}

/**
 * Ищет сообщения по содержимому
 * @param userAddress адрес пользователя
 * @param query поисковый запрос
 * @param limit максимальное количество результатов
 * @returns ChatMessage[] найденные сообщения
 */
export function searchMessages(
  userAddress: string,
  query: string,
  limit: number = 20
): ChatMessage[] {
  const searchQuery = query.toLowerCase();
  const foundMessages: ChatMessage[] = [];

  // Получаем чаты пользователя
  const userChats = getUserChats(userAddress);

  for (const chat of userChats) {
    const chatMessages = messages.get(chat.id) || [];
    
    for (const message of chatMessages) {
      if (message.content.toLowerCase().includes(searchQuery)) {
        foundMessages.push(message);
      }
    }
  }

  // Сортируем по времени (новые сначала) и ограничиваем количество
  return foundMessages
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, limit);
}

/**
 * Удаляет чат
 * @param chatId ID чата
 * @param userAddress адрес пользователя, который удаляет чат
 * @returns Promise<boolean> успешно ли удален чат
 */
export async function deleteChat(
  chatId: string,
  userAddress: string
): Promise<boolean> {
  const chat = chats.get(chatId);
  
  if (!chat || !chat.participants.includes(userAddress)) {
    return false;
  }

  // Помечаем чат как неактивный для пользователя
  // В реальном приложении можно реализовать более сложную логику
  chat.isActive = false;
  chats.set(chatId, chat);

  return true;
}

/**
 * Получает статистику чатов
 * @param userAddress адрес пользователя
 * @returns объект со статистикой
 */
export function getChatStats(userAddress: string) {
  const userChats = getUserChats(userAddress);
  const totalChats = userChats.length;
  const totalUnread = getTotalUnreadCount(userAddress);
  
  let totalMessages = 0;
  let sentMessages = 0;
  let receivedMessages = 0;

  for (const chat of userChats) {
    const chatMessages = messages.get(chat.id) || [];
    totalMessages += chatMessages.length;
    
    for (const message of chatMessages) {
      if (message.senderId === userAddress) {
        sentMessages++;
      } else {
        receivedMessages++;
      }
    }
  }

  return {
    totalChats,
    totalMessages,
    sentMessages,
    receivedMessages,
    totalUnread,
    averageMessagesPerChat: totalChats > 0 ? Math.round(totalMessages / totalChats) : 0
  };
}

/**
 * Генерирует уникальный ID сообщения
 * @returns string уникальный ID
 */
function generateMessageId(): string {
  return 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Получает активные чаты (с недавней активностью)
 * @param userAddress адрес пользователя
 * @param hoursLimit количество часов для определения "недавней" активности
 * @returns Chat[] активные чаты
 */
export function getActiveChats(
  userAddress: string,
  hoursLimit: number = 24
): Chat[] {
  const cutoffTime = new Date(Date.now() - hoursLimit * 60 * 60 * 1000);
  
  return getUserChats(userAddress).filter(chat => 
    chat.lastActivity > cutoffTime
  );
}

/**
 * Блокирует пользователя (простая реализация)
 * @param userAddress адрес пользователя, который блокирует
 * @param blockedUserAddress адрес блокируемого пользователя
 * @returns Promise<boolean> успешно ли заблокирован
 */
export async function blockUser(
  userAddress: string,
  blockedUserAddress: string
): Promise<boolean> {
  // В реальном приложении здесь будет более сложная логика
  // Пока просто помечаем чат как неактивный
  const chat = await getOrCreateChat(userAddress, blockedUserAddress);
  chat.isActive = false;
  chats.set(chat.id, chat);
  
  console.log(`Пользователь ${userAddress} заблокировал ${blockedUserAddress}`);
  return true;
}
