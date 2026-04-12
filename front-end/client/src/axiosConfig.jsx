import axios from 'axios';

// 1. Create a custom instance of axios
const api = axios.create({
  baseURL: 'http://localhost:9876/api',
});

// 2. Add the "Interceptor"
// This function runs automatically BEFORE every request leaves your computer
api.interceptors.request.use(
  (config) => {
    // A. Check local storage
    const token = localStorage.getItem('token');
    
    // B. If token exists, attach it to the header
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // C. Return the modified config so the request can proceed
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default api;
