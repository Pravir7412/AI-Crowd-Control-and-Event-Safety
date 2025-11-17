import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const ADMIN_CREDENTIALS = {
  username: 'admin',
  password: 'adminlogin',
};

const AdminLogin: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
      setError('');
      navigate('/dashboard');
    } else {
      setError('Invalid admin credentials.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="w-full max-w-md bg-white/10 backdrop-blur border border-white/20 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src="/logo.png" alt="Logo" className="h-10 w-10" onError={(e)=>{(e.target as HTMLImageElement).style.display='none';}} />
          <span className="text-xl font-semibold text-white tracking-wide">CROWD CONTROL</span>
        </div>
        <p className="text-center text-white/80 mb-6">Don’t Crowd My Style — Let AI Guide the Aisle</p>
        <form onSubmit={handleLogin} className="space-y-4">
          {error && <div className="text-sm text-red-300 bg-red-900/30 px-3 py-2 rounded">{error}</div>}
          <input
            className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            type="text"
            placeholder="Admin Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
          <div className="relative">
            <input
              className="w-full px-4 py-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-400"
              type={showPassword ? 'text' : 'password'}
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button type="button" className="absolute inset-y-0 right-3 text-white/70 hover:text-white" onClick={() => setShowPassword(v => !v)}>
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          <button type="submit" className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition">
            Admin Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
