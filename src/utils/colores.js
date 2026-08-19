// Mezcla un color hex con blanco para obtener una variante más clara (usada para
// armar el degradé del color de acento sin pedirle un segundo color al usuario).
export function aclararColor(hex, cantidad = 0.28) {
  const limpio = (hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) return hex;
  const num = parseInt(limpio, 16);
  const mezclar = (canal) => Math.min(255, Math.round(canal + (255 - canal) * cantidad));
  const r = mezclar((num >> 16) & 0xff);
  const g = mezclar((num >> 8) & 0xff);
  const b = mezclar(num & 0xff);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}

// Devuelve el texto (oscuro o blanco) que mejor contrasta sobre un color de fondo,
// para que un botón siga siendo legible aunque el admin elija un color muy claro u oscuro.
export function colorContraste(hex, oscuro = '#1a1410', claro = '#ffffff') {
  const limpio = (hex || '').replace('#', '');
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) return oscuro;
  const num = parseInt(limpio, 16);
  const r = (num >> 16) & 0xff;
  const g = (num >> 8) & 0xff;
  const b = num & 0xff;
  const luminancia = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminancia > 0.6 ? oscuro : claro;
}
