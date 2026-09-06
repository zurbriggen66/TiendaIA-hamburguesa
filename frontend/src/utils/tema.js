/**
 * Tema claro/oscuro del panel de administración.
 *
 * Se guarda POR DISPOSITIVO, no por cuenta: la tablet del mostrador puede ir en claro
 * y el celular del dueño en oscuro sin pisarse. La tienda del cliente no se ve afectada
 * — redeclara sus propios colores sobre `.cliente-container`.
 */
const CLAVE = 'antojo_tema_admin';

export const TEMAS = [
  { valor: 'claro', etiqueta: 'Claro', icono: '☀️' },
  { valor: 'oscuro', etiqueta: 'Oscuro', icono: '🌙' },
  { valor: 'sistema', etiqueta: 'Según el sistema', icono: '🖥️' },
];

// Oscuro por defecto: es como venía el panel, así que quien no toque nada no ve
// ningún cambio de un día para el otro.
const POR_DEFECTO = 'oscuro';

const consultaClaro = () =>
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-color-scheme: light)')
    : null;

export const leerTema = () => {
  try {
    const guardado = localStorage.getItem(CLAVE);
    return TEMAS.some((t) => t.valor === guardado) ? guardado : POR_DEFECTO;
  } catch {
    // Incógnito o storage bloqueado: el tema dura lo que dura la pestaña.
    return POR_DEFECTO;
  }
};

/** Traduce la preferencia a lo que realmente se pinta ('light' | 'dark'). */
export const temaEfectivo = (tema) => {
  if (tema === 'sistema') return consultaClaro()?.matches ? 'light' : 'dark';
  return tema === 'claro' ? 'light' : 'dark';
};

export const aplicarTema = (tema) => {
  document.documentElement.setAttribute('data-theme', temaEfectivo(tema));
};

export const guardarTema = (tema) => {
  try {
    localStorage.setItem(CLAVE, tema);
  } catch {
    /* sin storage: igual se aplica en esta pestaña */
  }
  aplicarTema(tema);
};

/**
 * Mientras la preferencia sea "según el sistema", seguir los cambios del SO en vivo
 * (Windows y los celulares alternan solos de día a noche).
 * Devuelve la función para desuscribirse.
 */
export const escucharCambioDelSistema = (obtenerTema) => {
  const consulta = consultaClaro();
  if (!consulta) return () => {};
  const alCambiar = () => {
    if (obtenerTema() === 'sistema') aplicarTema('sistema');
  };
  consulta.addEventListener('change', alCambiar);
  return () => consulta.removeEventListener('change', alCambiar);
};
