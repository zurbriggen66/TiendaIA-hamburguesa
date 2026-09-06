/**
 * Verifica que cada pantalla del panel pueda hacer scroll interno.
 *
 * Nace de dos bugs seguidos: primero el scroll se escapaba al body y arrastraba el
 * sidebar; despues, al arreglarlo con un `.main-content > *`, la regla le pegaba
 * tambien al <style> inline de una pantalla y su CSS se veia como texto en la pagina.
 *
 * La estructura valida es una de dos:
 *   A) un wrapper que contiene <header> + .scroll-area   (lo cubre la regla :has)
 *   B) un Fragment con <header> + .scroll-area sueltos   (ya son hijos de .main-content)
 * Lo que no vale es una pantalla sin .scroll-area: quedaria recortada sin poder bajar.
 *
 *   node scripts/check-layout.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const paginas = [];
const recorrer = (dir) => {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) recorrer(ruta);
    else if (/Page\.jsx$|Inicio\/Inicio\.jsx$|Dashboard\.jsx$/.test(ruta)) paginas.push(ruta);
  }
};
recorrer('src/VistaNegocio');

const problemas = [];
for (const ruta of paginas) {
  const texto = readFileSync(ruta, 'utf8');
  if (!texto.includes('scroll-area')) {
    problemas.push(`${ruta}: no tiene .scroll-area — su contenido queda recortado sin poder bajar`);
  }
}

if (problemas.length === 0) {
  console.log(`OK: ${paginas.length} pantallas del panel, todas con scroll interno.`);
  process.exit(0);
}
console.error(`${problemas.length} pantalla(s) sin scroll interno:\n`);
for (const p of problemas) console.error(`  ${p}`);
process.exit(1);
