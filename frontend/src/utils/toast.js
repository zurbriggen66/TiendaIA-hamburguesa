/**
 * Avisos del panel.
 *
 * Reemplaza a `alert()`, que bloquea el navegador entero: en medio de un cobro, con
 * un cliente esperando, el cajero tenía que ir a buscar el botón "Aceptar" antes de
 * poder seguir. Un toast avisa sin frenar la caja.
 *
 * Store a nivel de módulo en vez de context: así se puede avisar desde cualquier lado
 * (incluso fuera de un componente) sin tener que cablear un provider en cada pantalla.
 */
let siguienteId = 1;
let toasts = [];
const oyentes = new Set();

const emitir = () => {
  const copia = toasts;
  oyentes.forEach((fn) => fn(copia));
};

export const quitarToast = (id) => {
  toasts = toasts.filter((t) => t.id !== id);
  emitir();
};

const agregar = (tipo, mensaje, duracion) => {
  // Un mensaje que ya está en pantalla no se apila: reintentar tres veces la misma
  // acción fallida llenaba la esquina con el mismo texto repetido.
  const repetido = toasts.find((t) => t.mensaje === mensaje && t.tipo === tipo);
  if (repetido) return repetido.id;

  const id = siguienteId++;
  toasts = [...toasts, { id, tipo, mensaje: String(mensaje ?? '') }];
  emitir();
  if (duracion > 0) setTimeout(() => quitarToast(id), duracion);
  return id;
};

export const toast = {
  exito: (mensaje) => agregar('exito', mensaje, 4000),
  // Los errores duran más: suelen traer un motivo que hay que alcanzar a leer.
  error: (mensaje) => agregar('error', mensaje, 7000),
  alerta: (mensaje) => agregar('alerta', mensaje, 5000),
  info: (mensaje) => agregar('info', mensaje, 4000),
};

export const suscribirToasts = (fn) => {
  oyentes.add(fn);
  fn(toasts);
  return () => oyentes.delete(fn);
};
