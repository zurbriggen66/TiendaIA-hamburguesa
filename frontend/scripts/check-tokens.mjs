/**
 * Busca variables CSS que se usan pero nunca se definen.
 *
 * Nace de un bug real: `.inicio-card` pintaba con `var(--card-bg, #163a30)` y
 * `--card-bg` no existia en ningun lado, asi que las tarjetas del inicio caian
 * siempre al fallback verde oscuro — tambien en modo claro, donde quedaban como
 * tres manchas negras. Falla en silencio: el navegador usa el fallback y no avisa.
 *
 *   node scripts/check-tokens.mjs
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const archivos = [];
const recorrer = (dir) => {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) recorrer(ruta);
    else if (/\.(css|jsx?)$/.test(nombre)) archivos.push(ruta);
  }
};
recorrer('src');

// Las que define index.css, más las que un componente setea en línea vía `style`
// (la tienda pinta su tema así) y las que se pasan como `--x` en un objeto de estilo.
const definidas = new Set();
for (const ruta of archivos) {
  const texto = readFileSync(ruta, 'utf8');
  for (const m of texto.matchAll(/^\s*(--[a-z0-9-]+)\s*:/gim)) definidas.add(m[1]);
  for (const m of texto.matchAll(/['"](--[a-z0-9-]+)['"]\s*:/g)) definidas.add(m[1]);
}

const faltantes = new Map();
for (const ruta of archivos) {
  const texto = readFileSync(ruta, 'utf8');
  texto.split('\n').forEach((linea, i) => {
    for (const m of linea.matchAll(/var\((--[a-z0-9-]+)/g)) {
      if (!definidas.has(m[1])) {
        if (!faltantes.has(m[1])) faltantes.set(m[1], []);
        faltantes.get(m[1]).push(`${ruta}:${i + 1}`);
      }
    }
  });
}

if (faltantes.size === 0) {
  console.log(`OK: ${definidas.size} variables definidas, ninguna usada sin definir.`);
  process.exit(0);
}

console.error(`${faltantes.size} variable(s) CSS usadas pero nunca definidas:\n`);
for (const [nombre, lugares] of faltantes) {
  console.error(`  ${nombre}`);
  for (const lugar of lugares) console.error(`      ${lugar}`);
}
console.error('\nCada una cae a su fallback en silencio, sin importar el tema.');
process.exit(1);
