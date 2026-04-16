import React, { useState } from 'react';
import './Login.css';

const Login = ({ onLogin, adminPassword }) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    if (inputValue === adminPassword) {
      onLogin({ role: 'admin' });
    } else {
      setError('Invalid admin password.');
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2>Admin Login</h2>
        <form className="login-form" onSubmit={handleLogin}>
          <input 
            type="password" 
            className="login-input" 
            placeholder="Enter Admin Password" 
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
          />

          {error && <p style={{ color: '#ef4444', margin: 0, fontSize: '0.9rem' }}>{error}</p>}

          <button type="submit" className="login-btn">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
