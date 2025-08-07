import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/AuthForms.css';

const Register = () => {
  return (
    <div className="auth-container">
      <div className="auth-form-card">
        <h2 className="auth-title">Регистрация</h2>
        <form className="auth-form">
          <div className="input-group">
            <label htmlFor="email">Электронная почта</label>
            <input type="email" id="email" name="email" placeholder="Введите email" />
          </div>
          <div className="input-group">
            <label htmlFor="password">Пароль</label>
            <input type="password" id="password" name="password" placeholder="Придумайте пароль" />
          </div>
          <div className="input-group">
            <label htmlFor="confirmPassword">Подтвердите пароль</label>
            <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Подтвердите пароль" />
          </div>
          <button type="submit" className="auth-button">Создать аккаунт</button>
        </form>
        <p className="auth-footer">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;