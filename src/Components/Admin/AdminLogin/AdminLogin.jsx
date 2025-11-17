import React, { useState } from 'react';
import './AdminLogin.css';
import AdminDashboard from '../AdminDashboard';

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'adminlogin',
};

function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    if (
      username === ADMIN_CREDENTIALS.username &&
      password === ADMIN_CREDENTIALS.password
    ) {
      setError('');
      // Redirect to the actual Vite app (APP - Copy) dashboard
      window.location.href = 'http://localhost:5173/';
    } else {
      setError('Invalid admin credentials.');
    }
  };

  // Note: after successful login we redirect to the actual dashboard app,
  // so no local render of AdminDashboard here.

  return (
    <div className="container login-bg">
      <div className="admin-login-flex">
        <div className="admin-login-left">
          <div className="admin-login-logo-row">
            <img
              src="/Images/Logo Without Caption.png"
              alt="Logo"
              className="admin-login-logo"
            />
            <span className="admin-login-title">CROWD CONTROL</span>
          </div>
          <div className="admin-login-subtitle">
            Don’t Crowd My Style — Let AI Guide the Aisle
          </div>
          <form
            className="admin-login-form"
            onSubmit={handleLogin}
            autoComplete="off"
          >
            {error && <div className="error-message">{error}</div>}
            <input
              className="input-field"
              type="text"
              placeholder="Admin Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
            <div className="input-password-wrapper">
              <input
                className="input-field"
                type={showPassword ? 'text' : 'password'}
                placeholder="Admin Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <span
                className="input-password-eye"
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? (
                  <svg
                    height="1em"
                    viewBox="0 0 576 512"
                    fill="currentColor"
                  >
                    <path d="M572.52 241.4C518.7 135.5 410.7 64 288 64S57.3 135.5 3.48 241.4a48.35 48.35 0 0 0 0 29.2C57.3 376.5 165.3 448 288 448s230.7-71.5 284.52-177.4a48.35 48.35 0 0 0 0-29.2zM288 400c-97.2 0-189.7-57.8-238.8-144C98.3 169.8 190.8 112 288 112s189.7 57.8 238.8 144C477.7 342.2 385.2 400 288 400zm0-272a128 128 0 1 0 128 128A128 128 0 0 0 288 128zm0 208a80 80 0 1 1 80-80 80 80 0 0 1-80 80z" />
                  </svg>
                ) : (
                  <svg
                    height="1em"
                    viewBox="0 0 640 512"
                    fill="currentColor"
                  >
                    <path d="M320 400c-97.2 0-189.7-57.8-238.8-144C98.3 169.8 190.8 112 288 112c23.6 0 46.2 3.4 67.6 9.7l-39.2 30.2A128 128 0 0 0 320 384c-23.6 0-46.2-3.4-67.6-9.7l39.2-30.2A128 128 0 0 0 320 128c23.6 0 46.2 3.4 67.6 9.7l-39.2 30.2A128 128 0 0 0 320 384zM633.8 458.1l-86.6-67.1C582.7 376.5 474.7 448 352 448c-23.6 0-46.2-3.4-67.6-9.7l-39.2 30.2A128 128 0 0 0 320 384c23.6 0 46.2-3.4 67.6-9.7l39.2-30.2A128 128 0 0 0 320 128c-23.6 0-46.2 3.4-67.6 9.7l-39.2 30.2A128 128 0 0 0 320 384c97.2 0 189.7-57.8 238.8-144a48.35 48.35 0 0 0 0-29.2c-13.2-25.2-31.2-48.2-52.2-67.1l86.6 67.1a16 16 0 0 1 0 25.8z" />
                  </svg>
                )}
              </span>
            </div>
            <button className="primary-btn admin-login-btn" type="submit">
              Admin Login
            </button>
          </form>
        </div>
        <div className="admin-login-right">
          <div className="admin-login-marquee-row">
            <span className="admin-login-marquee">
              Less Stress, More Success — AI Crowd Control
            </span>
          </div>
          <div className="admin-login-marquee-row">
            <span className="admin-login-marquee admin-login-marquee-emoji">
              🏃‍♂️  🏃‍♀️  🏃  🏃‍♂️  🏃‍♀️  🏃  🏃‍♂️
            </span>
          </div>
          <div className="admin-login-marquee-row">
            <span className="admin-login-marquee">
              From Chaos to Chill — AI’s Got Crowd Control Skills
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminLogin;
