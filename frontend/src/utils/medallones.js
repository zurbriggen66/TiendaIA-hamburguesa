// Cuántos medallones implica el nombre de una presentación ("Doble" = 2).
// Se deduce del nombre a propósito: el dueño ya escribe "Doble"/"Triple" al cargar
// la presentación, y pedirle además un número sería duplicar el mismo dato.
// Si usa un nombre que no está acá, no se muestra nada — nunca inventa una cifra.
// ponytail: si algún día quiere nombres libres con cantidad, esto pasa a ser un
// campo del modelo Presentacion.
const POR_NOMBRE = {
  simple: 1,
  clasica: 1,
  clásica: 1,
  sencilla: 1,
  doble: 2,
  triple: 3,
  cuadruple: 4,
  cuádruple: 4,
};

export const medallonesDe = (nombre) => {
  if (!nombre) return 0;
  const limpio = nombre.trim().toLowerCase();
  // Coincidencia por palabra suelta: sirve para "Doble", "DOBLE CHEDDAR", "La triple".
  for (const palabra of limpio.split(/[\s-]+/)) {
    if (POR_NOMBRE[palabra]) return POR_NOMBRE[palabra];
  }
  return 0;
};
