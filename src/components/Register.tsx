import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/AuthForms.css';

const Register = () => {
  return (
    <div className="auth-container">
      <div className="auth-form-card">
        <h2 className="auth-title">Register</h2>
        <form className="auth-form">
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <input type="email" id="email" name="email" placeholder="Enter your email" />
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input type="password" id="password" name="password" placeholder="Create a password" />
          </div>
          <div className="input-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input type="password" id="confirmPassword" name="confirmPassword" placeholder="Confirm your password" />
          </div>
          <button type="submit" className="auth-button">Create Account</button>
        </form>
        <p className="auth-footer">
          Already have an account? <Link to="/login">Log In</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;