import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register, googleLogin } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [googleCredential, setGoogleCredential] = useState(null);

  const { loginUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const cleanRole = String(role || 'student')
      .replace(/[^\w]/g, '')
      .toLowerCase();
    const safeRole = cleanRole === 'teacher' ? 'teacher' : 'student';

    if (!name.trim() || !email.trim() || !password) {
      setError('Please fill all required fields');
      setLoading(false);
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    try {
      const { data } = await register({ name, email, password, role: safeRole });
      loginUser(data);
      if (data.role === 'teacher') {
        navigate('/teacher-dashboard');
      } else {
        navigate('/student-dashboard');
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (err.code === 'ERR_NETWORK') {
        setError('Cannot reach server at localhost:5000. Make sure the backend is running.');
      } else if (err.response?.status === 400) {
        setError(err.response?.data?.message || 'Invalid registration details');
      } else {
        setError(err.response?.data?.message || 'Registration failed');
      }
    }
    setLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleCredential(credentialResponse.credential);
    setShowRoleSelect(true);
  };

  const handleGoogleRoleSubmit = async (selectedRole) => {
    try {
      const { data } = await googleLogin({
        credential: googleCredential,
        role: selectedRole
      });
      loginUser(data);
      if (data.role === 'teacher') {
        navigate('/teacher-dashboard');
      } else {
        navigate('/student-dashboard');
      }
    } catch (err) {
      console.error('Google registration error:', err);
      setError('Google login failed');
      setShowRoleSelect(false);
    }
  };

  if (showRoleSelect) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <h1 style={styles.logo}>🎓</h1>
          <h2 style={styles.title}>ClassMeet</h2>
          <h3 style={styles.subtitle}>Select Your Role</h3>
          <p style={styles.roleDesc}>How will you use ClassMeet?</p>

          <div style={styles.roleGrid}>
            <div
              style={styles.roleCard}
              onClick={() => handleGoogleRoleSubmit('teacher')}
            >
              <span style={styles.roleIcon}>👨‍🏫</span>
              <h4 style={styles.roleName}>Teacher</h4>
              <p style={styles.roleText}>Create and manage live classes</p>
            </div>
            <div
              style={styles.roleCard}
              onClick={() => handleGoogleRoleSubmit('student')}
            >
              <span style={styles.roleIcon}>🎒</span>
              <h4 style={styles.roleName}>Student</h4>
              <p style={styles.roleText}>Join classes and take quizzes</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.logo}>🎓</h1>
        <h2 style={styles.title}>ClassMeet</h2>
        <h3 style={styles.subtitle}>Create Account</h3>

        {error && <p style={styles.error}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <input
            style={styles.input}
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
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
          <select
            style={styles.input}
            value={role}
            onChange={(e) => setRole(e.target.value)}
          >
            <option value="student">🎒 Student</option>
            <option value="teacher">👨‍🏫 Teacher</option>
          </select>

          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? 'Registering...' : 'Create Account'}
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
            theme="filled_black"
            shape="pill"
            width="100%"
            text="continue_with"
            locale="en"
          />
        </div>

        <p style={styles.link}>
          Already have an account?{' '}
          <Link to="/login" style={styles.linkText}>Login</Link>
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
  dividerText: { color: '#7ecfff', fontSize: '13px' },
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
  linkText: { color: '#00d4ff', fontWeight: 'bold' },
  roleDesc: { color: '#7ecfff', fontSize: '13px', marginBottom: '20px' },
  roleGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '20px'
  },
  roleCard: {
    backgroundColor: '#0a0e1a',
    border: '1px solid #00d4ff44',
    borderRadius: '10px',
    padding: '20px',
    cursor: 'pointer',
    transition: 'border-color 0.2s'
  },
  roleIcon: { fontSize: '30px', display: 'block', marginBottom: '8px' },
  roleName: { color: '#00d4ff', fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' },
  roleText: { color: '#7ecfff', fontSize: '11px' }
};

export default Register;