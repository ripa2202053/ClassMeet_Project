if (typeof window !== 'undefined') {
  window.process = window.process || { env: { DEBUG: undefined } };
  if (!window.process.nextTick) {
    window.process.nextTick = (fn, ...args) => setTimeout(() => fn(...args), 0);
  }
}

import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CLIENT_ID || '603135404698-e83o6c078m12gj88bdn71b54ftv7p8a9.apps.googleusercontent.com';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
    <App />
  </GoogleOAuthProvider>
);