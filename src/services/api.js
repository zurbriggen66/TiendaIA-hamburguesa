import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
});

export const CLAVE_TOKEN = 'antojo_token_cliente';

// localStorage puede tirar SecurityError (modo incógnito, la web embebida en un iframe,
// cookies de terceros bloqueadas). Sin este guard, un fallo ahí rompe TODAS las llamadas.
export const leerToken = () => {
  try {
    return localStorage.getItem(CLAVE_TOKEN);
  } catch {
    return null;
  }
};

export const guardarToken = (token) => {
  try {
    if (token) localStorage.setItem(CLAVE_TOKEN, token);
    else localStorage.removeItem(CLAVE_TOKEN);
  } catch {
    /* sin almacenamiento: la sesión dura lo que dura la pestaña */
  }
};

// Único lugar donde se adjunta el token: todas las llamadas ya pasan por acá.
api.interceptors.request.use((config) => {
  const token = leerToken();
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

export default api;
