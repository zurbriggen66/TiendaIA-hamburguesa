// Modo dueño / empleado del panel. La idea: el dueño entra con credenciales y,
// antes de prestarle la tablet del mostrador al empleado, toca "Empleado" para
// dejar a la vista solo las secciones que configuró. Volver a dueño exige tipear
// la contraseña de nuevo (ver RequiereAdmin.jsx).
//
// OJO: es un bloqueo VISUAL. El token que se sigue usando es el del dueño, así que
// alguien que sepa abrir las herramientas del navegador puede saltearlo. Cubre el
// uso normal del mostrador, no a un atacante.

const CLAVE_MODO = 'antojo_modo_admin';

export const MODO_DUENO = 'dueno';
export const MODO_EMPLEADO = 'empleado';

// Catálogo único: de acá salen el menú lateral, el guard de rutas y los checkboxes
// de configuración. Las etiquetas son las mismas que ya usaba el sidebar.
// `grupo` reproduce los dos títulos del menú ("Inicio" y "Gestión").
export const SECCIONES = [
  { clave: 'inicio', ruta: '/admin/inicio', etiqueta: 'Inicio', grupo: 'Inicio' },
  { clave: 'cajas', ruta: '/admin/cajas', etiqueta: '🗄️ Caja', grupo: 'Inicio' },
  { clave: 'productos', ruta: '/admin/productos', etiqueta: 'Productos & Stock', grupo: 'Gestión' },
  { clave: 'estadisticas', ruta: '/admin/estadisticas', etiqueta: 'Estadísticas', grupo: 'Gestión' },
  { clave: 'diseno', ruta: '/admin', etiqueta: 'Diseño & Colores', grupo: 'Gestión', exacta: true },
  { clave: 'pedidos', ruta: '/admin/pedidos', etiqueta: 'Ventas & Pedidos', grupo: 'Gestión' },
  { clave: 'combos', ruta: '/admin/combos', etiqueta: 'Combos', grupo: 'Gestión' },
  { clave: 'antojo', ruta: '/admin/antojo', etiqueta: '🔥 Antojo del día', grupo: 'Gestión' },
  { clave: 'cobranzas', ruta: '/admin/cobranzas', etiqueta: '💰 Cobranzas', grupo: 'Gestión' },
  { clave: 'clientes', ruta: '/admin/clientes', etiqueta: '⭐ Clientes', grupo: 'Gestión' },
  { clave: 'gastos', ruta: '/admin/gastos', etiqueta: 'Gastos', grupo: 'Gestión' },
  { clave: 'impresion', ruta: '/admin/impresion', etiqueta: '🖨️ Impresión', grupo: 'Gestión' },
];

// Permisos que no son una sección entera sino algo puntual dentro de una página.
export const PERMISOS_FINOS = [
  { clave: 'ver_montos', etiqueta: 'Ver los montos de caja y ventas', ayuda: 'Total del día, ticket promedio y la tarjeta de gastos fijos en Inicio.' },
  { clave: 'abrir_cerrar_caja', etiqueta: 'Abrir y cerrar la caja', ayuda: 'Cerrar la caja hace el arqueo del turno.' },
  { clave: 'cobrar_pedidos', etiqueta: 'Cobrar pedidos', ayuda: 'Registrar el pago de un pedido.' },
  { clave: 'eliminar_pedidos', etiqueta: 'Eliminar y cancelar pedidos', ayuda: 'Un pedido eliminado no se recupera.' },
];

// Espejo de permisos_empleado_default() en backend/negocio/models.py. Se usa como
// respaldo si /configuracion/ todavía no respondió o no hay ninguna fila cargada
// (mismo criterio que VistaCliente/Inicio.jsx con los colores).
export const PERMISOS_DEFAULT = ['inicio', 'pedidos', 'cobrar_pedidos', 'eliminar_pedidos'];

export function leerModo() {
  try {
    return localStorage.getItem(CLAVE_MODO) === MODO_EMPLEADO ? MODO_EMPLEADO : MODO_DUENO;
  } catch {
    return MODO_DUENO;
  }
}

export function guardarModo(modo) {
  try {
    localStorage.setItem(CLAVE_MODO, modo === MODO_EMPLEADO ? MODO_EMPLEADO : MODO_DUENO);
  } catch {
    // Navegador con el storage bloqueado: el modo dura lo que dura la pestaña.
  }
}

// La sección a la que corresponde una ruta del panel. '/admin' a secas es el
// índice ("Diseño & Colores"); el resto matchea por prefijo para que las subrutas
// futuras hereden el permiso de su sección.
export function seccionDeRuta(pathname) {
  const limpio = pathname.replace(/\/+$/, '') || '/admin';
  if (limpio === '/admin') return SECCIONES.find((s) => s.exacta);
  return SECCIONES.find((s) => !s.exacta && (limpio === s.ruta || limpio.startsWith(`${s.ruta}/`)));
}
