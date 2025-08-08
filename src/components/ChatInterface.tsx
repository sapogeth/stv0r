// src/components/ChatInterface.tsx

import React, { useState, useEffect, useRef } from 'react';
import { useCurrentAccount } from '@mysten/dapp-kit';
import {
  getUserChats,
  getChatMessages,
  sendMessage,
  markMessagesAsRead,
  getTotalUnreadCount,
  type Chat,
  type ChatMessage,
  type NewMessage
} from '../services/chatService';
import { getActiveNickname } from '../services/nicknameOwnershipService';
import UserSearch from './UserSearch';
import '../styles/ChatInterface.css';

const ChatInterface: React.FC = () => {
  const currentAccount = useCurrentAccount();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalUnread, setTotalUnread] = useState(0);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (currentAccount?.address) {
      loadChats();
      loadUnreadCount();
    }
  }, [currentAccount]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages();
      markChatAsRead();
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadChats = () => {
    if (!currentAccount?.address) return;
    
    try {
      const userChats = getUserChats(currentAccount.address);
      setChats(userChats);
    } catch (error) {
      console.error('Ошибка загрузки чатов:', error);
    }
  };

  const loadMessages = () => {
    if (!selectedChat) return;
    
    try {
      const chatMessages = getChatMessages(selectedChat.id, 50, 0);
      setMessages(chatMessages.reverse()); // Показываем в хронологическом порядке
    } catch (error) {
      console.error('Ошибка загрузки сообщений:', error);
    }
  };

  const loadUnreadCount = () => {
    if (!currentAccount?.address) return;
    
    try {
      const unread = getTotalUnreadCount(currentAccount.address);
      setTotalUnread(unread);
    } catch (error) {
      console.error('Ошибка загрузки непрочитанных:', error);
    }
  };

  const markChatAsRead = async () => {
    if (!selectedChat || !currentAccount?.address) return;
    
    try {
      await markMessagesAsRead(selectedChat.id, currentAccount.address);
      loadUnreadCount();
      loadChats(); // Обновляем список чатов для обновления счетчиков
    } catch (error) {
      console.error('Ошибка отметки как прочитанное:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || !currentAccount?.address) return;
    
    setLoading(true);
    try {
      // Находим адрес получателя
      const recipientAddress = selectedChat.participants.find(
        addr => addr !== currentAccount.address
      );
      
      if (!recipientAddress) {
        throw new Error('Получатель не найден');
      }

      const messageData: NewMessage = {
        recipientAddress,
        content: newMessage.trim(),
        messageType: 'text'
      };

      await sendMessage(currentAccount.address, messageData);
      
      setNewMessage('');
      loadMessages();
      loadChats();
      loadUnreadCount();
      
      // Фокусируемся обратно на поле ввода
      messageInputRef.current?.focus();
    } catch (error) {
      console.error('Ошибка отправки сообщения:', error);
      alert('Ошибка при отправке сообщения');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatMessageTime = (timestamp: Date) => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    
    if (now.toDateString() === messageDate.toDateString()) {
      return messageDate.toLocaleTimeString('ru-RU', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else {
      return messageDate.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  const getOtherParticipantNickname = (chat: Chat) => {
    if (!currentAccount?.address) return 'Unknown';
    
    const otherParticipant = chat.participants.find(
      addr => addr !== currentAccount.address
    );
    
    if (!otherParticipant) return 'Unknown';
    
    return getActiveNickname(otherParticipant) || 'Unknown';
  };

  const handleChatStart = (chatId: string) => {
    const chat = chats.find(c => c.id === chatId);
    if (chat) {
      setSelectedChat(chat);
      setShowUserSearch(false);
    }
  };

  if (!currentAccount) {
    return (
      <div className="chat-interface">
        <div className="chat-login-prompt">
          <h3>Подключите кошелек</h3>
          <p>Для использования чата необходимо подключить кошелек</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-interface">
      <div className="chat-sidebar">
        <div className="chat-header">
          <h3>
            Чаты 
            {totalUnread > 0 && (
              <span className="unread-badge">{totalUnread}</span>
            )}
          </h3>
          <button 
            className="new-chat-btn"
            onClick={() => setShowUserSearch(!showUserSearch)}
          >
            ➕ Новый чат
          </button>
        </div>

        {showUserSearch && (
          <div className="user-search-container">
            <UserSearch
              placeholder="Найти пользователя для чата..."
              onChatStart={handleChatStart}
              showStartChatButton={true}
            />
          </div>
        )}

        <div className="chats-list">
          {chats.length === 0 ? (
            <div className="no-chats">
              <p>У вас пока нет чатов</p>
              <p>Найдите пользователя, чтобы начать общение</p>
            </div>
          ) : (
            chats.map((chat) => {
              const otherNickname = getOtherParticipantNickname(chat);
              const unreadCount = currentAccount.address 
                ? chat.unreadCount[currentAccount.address] || 0 
                : 0;

              return (
                <div
                  key={chat.id}
                  className={`chat-item ${selectedChat?.id === chat.id ? 'selected' : ''}`}
                  onClick={() => setSelectedChat(chat)}
                >
                  <div className="chat-item-info">
                    <div className="chat-nickname">
                      @{otherNickname}
                      {unreadCount > 0 && (
                        <span className="chat-unread-badge">{unreadCount}</span>
                      )}
                    </div>
                    {chat.lastMessage && (
                      <div className="chat-last-message">
                        {chat.lastMessage.content.length > 30
                          ? chat.lastMessage.content.substring(0, 30) + '...'
                          : chat.lastMessage.content
                        }
                      </div>
                    )}
                  </div>
                  <div className="chat-time">
                    {chat.lastActivity && formatMessageTime(chat.lastActivity)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="chat-main">
        {selectedChat ? (
          <>
            <div className="chat-main-header">
              <h4>@{getOtherParticipantNickname(selectedChat)}</h4>
              <div className="chat-actions">
                <button className="chat-action-btn">⚙️</button>
              </div>
            </div>

            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="no-messages">
                  <p>Начните разговор!</p>
                  <p>Отправьте первое сообщение @{getOtherParticipantNickname(selectedChat)}</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={`message ${
                      message.senderId === currentAccount.address ? 'own' : 'other'
                    }`}
                  >
                    <div className="message-content">
                      <div className="message-text">{message.content}</div>
                      <div className="message-meta">
                        <span className="message-time">
                          {formatMessageTime(message.timestamp)}
                        </span>
                        {message.senderId === currentAccount.address && (
                          <span className={`message-status ${message.isRead ? 'read' : 'sent'}`}>
                            {message.isRead ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="message-input-container">
              <textarea
                ref={messageInputRef}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Введите сообщение..."
                className="message-input"
                rows={1}
                disabled={loading}
              />
              <button
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || loading}
                className="send-button"
              >
                {loading ? '⏳' : '📤'}
              </button>
            </div>
          </>
        ) : (
          <div className="no-chat-selected">
            <h3>Выберите чат</h3>
            <p>Выберите существующий чат или найдите пользователя для начала общения</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;