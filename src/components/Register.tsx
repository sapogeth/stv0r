import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCurrentAccount } from '@mysten/dapp-kit';
import { generateNicknameOptions } from '../utils/nicknameGenerator';
import { createUser } from '../services/userService';
import '../styles/AuthForms.css';

const Register = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nicknameOptions, setNicknameOptions] = useState<string[]>([]);
  const [selectedNickname, setSelectedNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'form' | 'nickname'>('form');
  
  const account = useCurrentAccount();
  const navigate = useNavigate();

  useEffect(() => {
    if (step === 'nickname') {
      generateNicknameVariants();
    }
  }, [step]);

  const generateNicknameVariants = () => {
    const options = generateNicknameOptions(5);
    setNicknameOptions(options);
    setSelectedNickname(options[0]);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password !== confirmPassword) {
      alert('Пароли не совпадают');
      return;
    }
    
    if (!account?.address) {
      alert('Подключите кошелек для регистрации');
      return;
    }
    
    setStep('nickname');
  };

  const handleRegistration = async () => {
    if (!account?.address || !selectedNickname) return;
    
    setLoading(true);
    try {
      const user = await createUser(email, account.address);
      
      // Обновляем никнейм пользователя на выбранный
      if (selectedNickname !== user.nickname) {
        // В реальном приложении здесь будет обновление через API
        console.log(`Никнейм обновлен с ${user.nickname} на ${selectedNickname}`);
      }
      
      alert(`Регистрация успешна! Ваш никнейм: ${selectedNickname}`);
      navigate('/');
      
    } catch (error) {
      console.error('Ошибка регистрации:', error);
      alert('Ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'nickname') {
    return (
      <div className="auth-container">
        <div className="auth-form-card">
          <h2 className="auth-title">Выберите никнейм</h2>
          <p className="nickname-description">
            Мы сгенерировали для вас несколько вариантов никнеймов. 
            Выберите понравившийся или сгенерируйте новые варианты.
          </p>
          
          <div className="nickname-options">
            {nicknameOptions.map((nickname, index) => (
              <div 
                key={index}
                className={`nickname-option ${selectedNickname === nickname ? 'selected' : ''}`}
                onClick={() => setSelectedNickname(nickname)}
              >
                {nickname}
              </div>
            ))}
          </div>
          
          <div className="nickname-actions">
            <button 
              type="button" 
              className="generate-button"
              onClick={generateNicknameVariants}
              disabled={loading}
            >
              Сгенерировать новые
            </button>
            
            <button 
              type="button" 
              className="auth-button"
              onClick={handleRegistration}
              disabled={loading || !selectedNickname}
            >
              {loading ? 'Регистрация...' : 'Завершить регистрацию'}
            </button>
          </div>
          
          <button 
            type="button" 
            className="back-button"
            onClick={() => setStep('form')}
            disabled={loading}
          >
            Назад
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-form-card">
        <h2 className="auth-title">Регистрация</h2>
        <form className="auth-form" onSubmit={handleFormSubmit}>
          <div className="input-group">
            <label htmlFor="email">Электронная почта</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              placeholder="Введите email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="password">Пароль</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              placeholder="Придумайте пароль"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="confirmPassword">Подтвердите пароль</label>
            <input 
              type="password" 
              id="confirmPassword" 
              name="confirmPassword" 
              placeholder="Подтвердите пароль"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          
          {!account?.address && (
            <div className="wallet-warning">
              ⚠️ Подключите кошелек для продолжения регистрации
            </div>
          )}
          
          <button 
            type="submit" 
            className="auth-button"
            disabled={!account?.address}
          >
            Продолжить
          </button>
        </form>
        <p className="auth-footer">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;