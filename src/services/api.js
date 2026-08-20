import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/api',
});

export const CLAVE_TOKEN = 'antojo_token_cliente';
export const CLAVE_TOKEN_ADMIN = 'antojo_token_admin';

// localStorage puede tirar SecurityError (modo incógnito, la web embebida en un iframe,
// cookies de terceros bloqueadas). Sin este guard, un fallo ahí rompe TODAS las llamadas.
const leerStorage = (clave) => {
  try {
    return localStorage.getItem(clave);
  } catch {
    return null;
  }
};

const guardarStorage = (clave, valor) => {
  try {
    if (valor) localStorage.setItem(clave, valor);
    else localStorage.removeItem(clave);
  } catch {
    /* sin almacenamiento: la sesión dura lo que dura la pestaña */
  }
};

export const leerToken = () => leerStorage(CLAVE_TOKEN);
export const guardarToken = (token) => guardarStorage(CLAVE_TOKEN, token);

// Token del panel de administración: es una sesión aparte de la del cliente que
// compra (misma pestaña puede tener las dos guardadas a la vez, cada una en su ruta).
export const leerTokenAdmin = () => leerStorage(CLAVE_TOKEN_ADMIN);
export const guardarTokenAdmin = (token) => guardarStorage(CLAVE_TOKEN_ADMIN, token);

// Único lugar donde se adjunta el token: todas las llamadas ya pasan por acá. Se decide
// cuál mandar según la ruta actual, ya que /admin y el resto del sitio nunca conviven
// en la misma pantalla.
api.interceptors.request.use((config) => {
  const esAdmin = window.location.pathname.startsWith('/admin');
  const token = esAdmin ? leerTokenAdmin() : leerToken();
  if (token) config.headers.Authorization = `Token ${token}`;
  return config;
});

// Si el token de admin dejó de ser válido (lo borraron a mano, o cambió el password),
// lo limpiamos automáticamente para que la próxima carga muestre el login de nuevo en
// vez de quedar mostrando pantallas rotas por llamadas que fallan en silencio.
api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    if (error.response?.status === 401 && window.location.pathname.startsWith('/admin')) {
      guardarTokenAdmin(null);
    }
    return Promise.reject(error);
  }
);

export default api;
