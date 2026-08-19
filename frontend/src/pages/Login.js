import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { login, googleLogin } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { data } = await login({ email, password });
      loginUser(data);
      if (data.role === 'teacher') {
        navigate('/teacher-dashboard');
      } else {
        navigate('/student-dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.code === 'ERR_NETWORK') {
        setError('Cannot reach server at localhost:5000. Make sure the backend is running.');
      } else if (err.response?.status === 401) {
        setError(err.response?.data?.message || 'Invalid email or password');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.message || 'Please enter a valid email and password');
      } else if (err.response?.status === 404) {
        setError(err.response?.data?.message || 'Login endpoint not found');
      } else {
        setError(err.response?.data?.message || 'Login failed');
      }
    }
    setLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    try {
      const { data } = await googleLogin({
        credential: credentialResponse.credential,
        role: 'student'
      });
      loginUser(data);
      if (data.role === 'teacher') {
        navigate('/teacher-dashboard');
      } else {
        navigate('/student-dashboard');
      }
    } catch (err) {
      console.error('Google login error:', err);
      setError('Google login failed');
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>🎓</h1>
        <h2 style={styles.title}>ClassMeet</h2>
        <h3 style={styles.subtitle}>Welcome Back!</h3>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <input
            style={styles.input}
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            style={styles.input}
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or</span>
          <div style={styles.dividerLine} />
        </div>

        <div style={styles.googleBtn}>
          <GoogleLogin
            onSuccess={handleGoogleSuccess}
            onError={() => setError('Google login failed')}
            useOneTap
            theme="filled_black"
            shape="pill"
            width="100%"
            text="continue_with"
            locale="en"
          />
        </div>

        <p style={styles.link}>
          Don't have an account?{' '}
          <Link to="/register" style={styles.linkText}>Register</Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '100vh',
    backgroundColor: '#0a0e1a',
    padding: '16px',
    boxSizing: 'border-box'
  },
  card: {
    backgroundColor: '#0d1b2a',
    padding: '30px 20px',
    borderRadius: '15px',
    border: '1px solid #00d4ff',
    boxShadow: '0 0 30px rgba(0,212,255,0.2)',
    width: '92%',
    maxWidth: '400px',
    boxSizing: 'border-box',
    textAlign: 'center'
  },
  logo: { fontSize: '50px', margin: '0 0 10px 0' },
  title: { color: '#00d4ff', fontSize: '28px', margin: '0 0 5px 0' },
  subtitle: { color: '#7ecfff', fontSize: '16px', margin: '0 0 25px 0', fontWeight: 'normal' },
  input: {
    width: '100%',
    padding: '12px',
    marginBottom: '15px',
    borderRadius: '8px',
    border: '1px solid #00d4ff',
    fontSize: '16px',
    backgroundColor: '#0a0e1a',
    color: '#ffffff',
    boxSizing: 'border-box'
  },
  button: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#00d4ff',
    color: '#0a0e1a',
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    cursor: 'pointer',
    fontWeight: 'bold',
    marginTop: '5px'
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    margin: '20px 0'
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#1a3a5c'
  },
  dividerText: {
    color: '#7ecfff',
    fontSize: '13px'
  },
  googleBtn: {
    display: 'flex',
    justifyContent: 'center',
    marginBottom: '15px'
  },
  error: {
    color: '#ff4444',
    marginBottom: '15px',
    backgroundColor: 'rgba(255,68,68,0.1)',
    padding: '10px',
    borderRadius: '5px'
  },
  link: { color: '#7ecfff', marginTop: '15px' },
  linkText: { color: '#00d4ff', fontWeight: 'bold' }
};

export default Login;