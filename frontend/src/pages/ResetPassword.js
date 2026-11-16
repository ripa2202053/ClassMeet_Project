import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { forgotPassword, resetPassword } from '../utils/api';
import './ResetPassword.css';

const ResetPassword = ({ onBackToLogin }) => {
  const navigate = useNavigate();

  // Step 1: Request OTP | Step 2: Enter OTP & New Password
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleBack = () => {
    if (onBackToLogin) {
      onBackToLogin();
    } else {
      navigate('/login');
    }
  };

  // Step 1: Send verification code
  const handleSendCode = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');

    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await forgotPassword({ email });
      setLoading(false);
      setStep(2);

      if (data.isDevMode && data.devOtp) {
        setStatusMsg(`Verification code: ${data.devOtp}`);
      } else {
        setStatusMsg('Verification code sent! Please check your email inbox.');
      }
    } catch (err) {
      setLoading(false);
      const msg = err.response?.data?.message || 'Could not send verification code. Please check your email and try again.';
      setErrorMsg(msg);
    }
  };

  // Step 2: Reset Password with OTP
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setStatusMsg('');

    if (!otp || otp.trim().length < 4) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setLoading(true);
    try {
      const { data } = await resetPassword({ email, otp: otp.trim(), newPassword });
      setLoading(false);
      setStatusMsg(data.message || 'Password reset successful! Redirecting to login...');
      setTimeout(() => {
        handleBack();
      }, 1500);
    } catch (err) {
      setLoading(false);
      const msg = err.response?.data?.message || 'Failed to reset password. Please check the code and try again.';
      setErrorMsg(msg);
    }
  };

  return (
    <div className="reset-password-wrapper">
      <div className="reset-password-card">
        <h2 className="reset-password-title">Reset Password</h2>
        <p className="reset-password-subtitle">
          ClassMeet - The Smarter Way to Learn, Teach &amp; Connect
        </p>

        {statusMsg && (
          <div className="reset-banner-success">{statusMsg}</div>
        )}

        {errorMsg && (
          <div className="reset-banner-error">{errorMsg}</div>
        )}

        {step === 1 ? (
          <form onSubmit={handleSendCode} className="reset-password-form">
            <div className="reset-input-field">
              <label className="reset-input-label" htmlFor="reset-email">
                Email Address
              </label>
              <input
                id="reset-email"
                className="reset-input"
                type="email"
                placeholder="Enter your registered email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="reset-submit-btn"
              disabled={loading}
            >
              {loading ? 'Sending Code...' : 'Send Verification Code'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="reset-password-form">
            <div className="reset-email-chip">
              <span>Code sent to: <strong>{email}</strong></span>
              <button
                type="button"
                className="reset-change-link"
                onClick={() => {
                  setStep(1);
                  setErrorMsg('');
                  setStatusMsg('');
                }}
              >
                Change
              </button>
            </div>

            <div className="reset-input-field">
              <label className="reset-input-label" htmlFor="reset-otp">
                Verification Code
              </label>
              <input
                id="reset-otp"
                className="reset-input"
                type="text"
                placeholder="Enter 6-digit code"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                disabled={loading}
                maxLength={6}
                style={{ letterSpacing: '4px', fontWeight: '700' }}
              />
            </div>

            <div className="reset-input-field">
              <label className="reset-input-label" htmlFor="reset-new-pass">
                New Password
              </label>
              <input
                id="reset-new-pass"
                className="reset-input"
                type="password"
                placeholder="Enter new password (min 6 chars)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="reset-input-field" style={{ marginBottom: '16px' }}>
              <label className="reset-input-label" htmlFor="reset-confirm-pass">
                Confirm Password
              </label>
              <input
                id="reset-confirm-pass"
                className="reset-input"
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              className="reset-submit-btn"
              disabled={loading}
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>
          </form>
        )}

        <button
          type="button"
          className="reset-back-btn"
          onClick={handleBack}
        >
          Back to Login
        </button>
      </div>
    </div>
  );
};

export default ResetPassword;
