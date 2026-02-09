import axios from 'axios';

// Determine API URL based on environment
// If VITE_API_URL is set, use it; otherwise use relative URL for same-origin requests
// For external access, set VITE_API_URL in .env file to http://<server-ip>:3001/api
let API_BASE_URL = import.meta.env.VITE_API_URL;

if (!API_BASE_URL) {
  // If no explicit API URL, use relative path (works for same-origin)
  // For external access, you need to set VITE_API_URL in frontend/.env
  API_BASE_URL = '/api';
  
  // Auto-detect if we're accessing from a different origin
  // If accessing via IP address, try to construct API URL
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    // If not localhost, assume we need to connect to backend on same host but port 3001
    if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
      API_BASE_URL = `http://${hostname}:3001/api`;
    }
  }
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle token expiration
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
