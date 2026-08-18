import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
});

export const CLAVE_TOKEN = 'antojo_token_cliente';

// Único lugar donde se adjunta el token: todas las llamadas ya pasan por acá.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(CLAVE_TOKEN);
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

export default api;