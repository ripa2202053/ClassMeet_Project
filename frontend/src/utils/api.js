import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';

const API = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  headers: { 'Content-Type': 'application/json' }
});

API.interceptors.request.use((req) => {
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    if (user && user.token) {
      req.headers.authorization = `Bearer ${user.token}`;
    }
  } catch (e) {
    console.log('Error reading auth token from localStorage:', e);
    localStorage.removeItem('user');
  }
  return req;
});

export const register = (data) => API.post('/auth/register', data);
export const login = (data) => API.post('/auth/login', data);
export const createRoom = (data) => API.post('/rooms/create', data);
export const startRoom = (id) => API.put(`/rooms/start/${id}`);
export const endRoom = (id) => API.put(`/rooms/end/${id}`);
export const joinRoom = (data) => API.post('/rooms/join', data);
export const getMyRooms = () => API.get('/rooms/my-rooms');
export const googleLogin = (data) => API.post('/auth/google', data);