import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api' });

api.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem('vm_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  } catch {
    /* storage unavailable */
  }
  return config;
});

export const errMsg = (e) => e?.response?.data?.message || e?.message || 'Something went wrong. Please try again.';

export default api;
