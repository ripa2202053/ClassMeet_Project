import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { login, register, googleLogin } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import ResetPassword from './ResetPassword';
import './Login.css';

const Login = ({ initialMode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { loginUser } = useAuth();

  // Mode state: true for Register/Sign-Up, false for Login
  const [isSignUp, setIsSignUp] = useState(
    initialMode === 'register' || location.pathname === '/register'
  );
  const [showForgot, setShowForgot] = useState(
    location.pathname === '/forgot-password' || location.pathname === '/reset-password'
  );

  // Sync state if route path changes
  useEffect(() => {
    if (location.pathname === '/register') {
      setIsSignUp(true);
      setShowForgot(false);
    } else if (location.pathname === '/login') {
      setIsSignUp(false);
      setShowForgot(false);
    } else if (location.pathname === '/forgot-password' || location.pathname === '/reset-password') {
      setShowForgot(true);
    }
  }, [location.pathname]);

  // Login Form States
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // Register Form States
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regRole, setRegRole] = useState('student');
  const [regError, setRegError] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Google OAuth Role Selection State
  const [showRoleSelect, setShowRoleSelect] = useState(false);
  const [googleCredential, setGoogleCredential] = useState(null);

  // Switch between Login and Sign Up
  const toggleMode = (targetSignUp) => {
    setIsSignUp(targetSignUp);
    setLoginError('');
    setRegError('');
    window.history.replaceState(null, '', targetSignUp ? '/register' : '/login');
  };

  // Handle Login Submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    try {
      const { data } = await login({ email: loginEmail, password: loginPassword });
      loginUser(data);
      if (data.role === 'teacher') {
        navigate('/teacher-dashboard');
      } else {
        navigate('/student-dashboard');
      }
    } catch (err) {
      console.error('Login error:', err);
      if (err.code === 'ERR_NETWORK') {
        setLoginError('Cannot reach server at localhost:5000. Ensure backend is running.');
      } else if (err.response?.status === 401) {
        setLoginError(err.response?.data?.message || 'Invalid email or password');
      } else if (err.response?.status === 400) {
        setLoginError(err.response?.data?.message || 'Please enter valid email and password');
      } else if (err.response?.status === 503) {
        setLoginError(err.response?.data?.message || 'Database connection error. Please whitelist IP 0.0.0.0/0 in MongoDB Atlas.');
      } else {
        setLoginError(err.response?.data?.message || 'Login failed');
      }
    }
    setLoginLoading(false);
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegLoading(true);
    setRegError('');

    if (!regName.trim() || !regEmail.trim() || !regPassword) {
      setRegError('Please fill all required fields');
      setRegLoading(false);
      return;
    }

    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters long');
      setRegLoading(false);
      return;
    }

    try {
      const { data } = await register({
        name: regName,
        email: regEmail,
        password: regPassword,
        role: regRole
      });
      loginUser(data);
      if (data.role === 'teacher') {
        navigate('/teacher-dashboard');
      } else {
        navigate('/student-dashboard');
      }
    } catch (err) {
      console.error('Registration error:', err);
      if (err.code === 'ERR_NETWORK') {
        setRegError('Cannot reach server at localhost:5000. Ensure backend is running.');
      } else if (err.response?.status === 400) {
        setRegError(err.response?.data?.message || 'Invalid registration details');
      } else if (err.response?.status === 503) {
        setRegError(err.response?.data?.message || 'Database connection error.');
      } else {
        setRegError(err.response?.data?.message || 'Registration failed');
      }
    }
    setRegLoading(false);
  };

  // Google OAuth Success Handler
  const handleGoogleSuccess = async (credentialResponse) => {
    if (isSignUp) {
      setGoogleCredential(credentialResponse.credential);
      setShowRoleSelect(true);
    } else {
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
        setLoginError('Google authentication failed');
      }
    }
  };

  // Google OAuth Role Picker Submit
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
      setRegError('Google registration failed');
      setShowRoleSelect(false);
    }
  };

  if (showForgot) {
    return <ResetPassword onBackToLogin={() => setShowForgot(false)} />;
  }

  return (
    <div className="login-page-container">
      {/* Main Dual Card from Pinterest Pin: https://pin.it/4Cc3kYMK4 */}
      <div className={`login-card-container ${isSignUp ? 'active' : ''}`}>
        
        {/* =================================================================
            1. LOGIN FORM (RIGHT SIDE DURING LOGIN MODE)
            ================================================================= */}
        <div className="form-box login-box">
          <h2 className="form-title">Welcome Back</h2>
          <p className="form-subtitle">The Smarter Way to Learn, Teach &amp; Connect</p>
          {loginError && <div className="form-error-banner">{loginError}</div>}

          <form onSubmit={handleLoginSubmit} className="auth-form">
            <div className="form-input-group">
              <input
                className="form-input"
                type="email"
                placeholder="Username or Email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-input-group">
              <input
                className="form-input"
                type="password"
                placeholder="Password"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            <div className="forgot-password-wrap">
              <a
                href="#forgot"
                onClick={(e) => {
                  e.preventDefault();
                  setShowForgot(true);
                }}
                className="forgot-password-link"
              >
                Forgot Password
              </a>
            </div>

            <button className="form-submit-btn" type="submit" disabled={loginLoading}>
              {loginLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <p className="form-switch-prompt">
            Don't have an account?{' '}
            <button
              type="button"
              className="switch-inline-btn"
              onClick={() => toggleMode(true)}
            >
              Sign Up
            </button>
          </p>

          <div className="form-google-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setLoginError('Google login failed')}
              useOneTap
              shape="pill"
              text="signin_with"
              locale="en"
            />
          </div>
        </div>

        {/* =================================================================
            2. REGISTRATION FORM (LEFT SIDE DURING SIGNUP MODE)
            ================================================================= */}
        <div className="form-box register-box">
          <h2 className="form-title">Create Account</h2>
          {regError && <div className="form-error-banner">{regError}</div>}

          <form onSubmit={handleRegisterSubmit} className="auth-form">
            <div className="form-input-group">
              <input
                className="form-input"
                type="text"
                placeholder="Full Name"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                required
              />
            </div>

            <div className="form-input-group">
              <input
                className="form-input"
                type="email"
                placeholder="Email Address"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
              />
            </div>

            <div className="form-input-group">
              <input
                className="form-input"
                type="password"
                placeholder="Password (min 6 chars)"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                required
              />
            </div>

            <div className="form-input-group">
              <select
                className="form-role-select"
                value={regRole}
                onChange={(e) => setRegRole(e.target.value)}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>
            </div>

            <button className="form-submit-btn" type="submit" disabled={regLoading}>
              {regLoading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <p className="form-switch-prompt">
            Already have an account?{' '}
            <button
              type="button"
              className="switch-inline-btn"
              onClick={() => toggleMode(false)}
            >
              Login
            </button>
          </p>

          <div className="form-google-wrapper">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => setRegError('Google registration failed')}
              shape="pill"
              text="continue_with"
              locale="en"
            />
          </div>
        </div>

        {/* =================================================================
            3. CURVED SLIDING WELCOME PANEL (HAS USER'S DEEP OCEAN DESIGN)
            ================================================================= */}
        <div className="welcome-panel">
          {/* Welcome state during Login mode (panel on the left) */}
          <div className="welcome-content welcome-signin">
            <h2 className="welcome-title welcome-title-brand">ClassMeet</h2>
            <p className="welcome-subtitle">
              An AI-Powered Smart Live Classroom
              for Automated Attendance, Secure Proctoring and
              Pedagogical Collaboration
            </p>
            <button
              type="button"
              className="welcome-pill-btn"
              onClick={() => toggleMode(true)}
            >
              Sign Up
            </button>
          </div>

          {/* Welcome state during Register mode (panel on the right) */}
          <div className="welcome-content welcome-signup">
            <h2 className="welcome-title welcome-title-brand">ClassMeet</h2>
            <p className="welcome-subtitle">
              An AI-Powered Smart Live Classroom
              for Automated Attendance, Secure Proctoring and
              Pedagogical Collaboration
            </p>
            <button
              type="button"
              className="welcome-pill-btn"
              onClick={() => toggleMode(false)}
            >
              Sign in
            </button>
          </div>
        </div>

      </div>

      {/* Google OAuth Role Selection Modal */}
      {showRoleSelect && (
        <div style={roleModalStyles.overlay}>
          <div style={roleModalStyles.card}>
            <h3 style={roleModalStyles.title}>Select Your Role</h3>
            <p style={roleModalStyles.desc}>Choose how you want to use ClassMeet:</p>
            <div style={roleModalStyles.grid}>
              <div
                style={roleModalStyles.option}
                onClick={() => handleGoogleRoleSubmit('teacher')}
              >
                <strong style={{ color: '#38bdf8', fontSize: '18px' }}>Teacher</strong>
              </div>
              <div
                style={roleModalStyles.option}
                onClick={() => handleGoogleRoleSubmit('student')}
              >
                <strong style={{ color: '#38bdf8', fontSize: '18px' }}>Student</strong>
              </div>
            </div>
            <button
              style={roleModalStyles.cancelBtn}
              onClick={() => setShowRoleSelect(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const roleModalStyles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(4, 15, 27, 0.8)',
    backdropFilter: 'blur(16px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px'
  },
  card: {
    backgroundColor: '#081e33',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '20px',
    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
    padding: '32px',
    width: '100%',
    maxWidth: '420px',
    textAlign: 'center'
  },
  title: {
    color: '#ffffff',
    fontSize: '22px',
    fontWeight: '800',
    margin: '0 0 8px 0'
  },
  desc: {
    color: '#8b9ea8',
    fontSize: '13px',
    margin: '0 0 24px 0'
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '20px'
  },
  option: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1.5px solid rgba(56, 189, 248, 0.3)',
    borderRadius: '16px',
    padding: '20px 14px',
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  cancelBtn: {
    padding: '10px 24px',
    borderRadius: '40px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    backgroundColor: 'transparent',
    color: '#8b9ea8',
    cursor: 'pointer',
    fontSize: '13px'
  }
};

export default Login;
