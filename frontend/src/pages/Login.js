import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import './Auth.css';

const Login = () => {
  const navigate = useNavigate();
  const [urlParams] = useSearchParams();
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const redirect = urlParams.get('redirect') || '/';

  const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    setLoading(true);
    const user = await login(form.email, form.password);

    toast.success(`Welcome back, ${user.name.split(' ')[0]}!`);

    if (user.role === 'ADMIN') {
      navigate('/admin');
    } else {
      navigate(redirect);
    }

  } catch (err) {
    toast.error(err.response?.data?.message || 'Login failed');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="sky-page auth-page">
      <div className="clouds-wrap">
        <div className="cloud c1" style={{ left: '5%' }} />
        <div className="cloud c2" style={{ left: '60%' }} />
      </div>
      <div className="auth-wrap">
        <div className="auth-logo">
          <div className="auth-logo-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M21 16v-2l-8-5V3.5A1.5 1.5 0 0 0 11.5 2h0A1.5 1.5 0 0 0 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5L21 16z" fill="white"/>
            </svg>
          </div>
          <span>FlyWise</span>
        </div>

        <div className="card-glass auth-card">
          <h2 className="auth-title">Welcome back</h2>
          <p className="auth-sub">Sign in to manage your bookings</p>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                className="form-input"
                type="email"
                placeholder="you@example.com"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Password</label>
              <input
                className="form-input"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                required
                autoComplete="current-password"
              />
            </div>
            <button className="btn btn-primary btn-lg btn-full" type="submit" disabled={loading}>
              {loading ? <><div className="spinner" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div className="auth-divider"><span>or</span></div>

          <div className="demo-accounts">
            <p className="demo-label">Demo Accounts</p>
            <div className="demo-btns">
              <button className="demo-btn" onClick={() => setForm({ email: 'user@flywise.com', password: 'user1234' })}>
                <span className="demo-role">User</span>
                user@flywise.com
              </button>
              <button className="demo-btn admin" onClick={() => setForm({ email: 'admin@flywise.com', password: 'admin123' })}>
                <span className="demo-role">Admin</span>
                admin@flywise.com
              </button>
            </div>
          </div>

          <p className="auth-switch">
            Don't have an account? <Link to="/register">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
