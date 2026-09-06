/**
 * Chequeo de cómo se redacta un extra en el ticket.
 *
 * Nace de un pedido mal armado en cocina: "2 x INDIA + PANCETA AHUMADA" se leyó como
 * una sola panceta para las dos hamburguesas, cuando el sistema cobra y descuenta
 * stock por unidad — eran dos.
 *
 *   node scripts/test-extras.mjs
 */
import assert from 'node:assert/strict';
import { textoExtra, textoExtras } from '../src/utils/extras.js';

const casos = [];
const test = (n, f) => casos.push([n, f]);

test('una unidad, un extra: sin ruido', () => {
  assert.equal(textoExtra({ nombre: 'PANCETA', cantidad: 1 }, 1), 'PANCETA');
});

test('una unidad, dos extras iguales', () => {
  assert.equal(textoExtra({ nombre: 'DIP', cantidad: 2 }, 1), '2x DIP');
});

test('dos unidades: aclara que va en cada una', () => {
  const t = textoExtra({ nombre: 'PANCETA', cantidad: 1 }, 2);
  assert.equal(t, 'PANCETA (una en cada una)');
  assert.ok(!t.includes('2 en total'), 'con "una en cada una" el total ya se deduce');
});

test('dos unidades con dos extras: dice el total, que no es obvio', () => {
  assert.equal(textoExtra({ nombre: 'DIP', cantidad: 2 }, 2), 'DIP (2 en cada una, 4 en total)');
});

test('el caso que fallo en cocina no queda ambiguo', () => {
  const t = textoExtra({ nombre: 'PANCETA AHUMADA', cantidad: 1 }, 2);
  assert.ok(t.includes('cada una'), 'tiene que decir que va en cada una');
});

test('varios extras se separan con coma', () => {
  const t = textoExtras([{ nombre: 'DIP', cantidad: 1 }, { nombre: 'HUEVO', cantidad: 1 }], 2);
  assert.equal(t, 'DIP (una en cada una), HUEVO (una en cada una)');
});

test('sin extras devuelve vacio', () => {
  assert.equal(textoExtras([], 3), '');
  assert.equal(textoExtras(undefined, 3), '');
});

let fallas = 0;
for (const [n, f] of casos) {
  try { f(); console.log(`  ok    ${n}`); }
  catch (e) { fallas++; console.error(`  FALLA ${n}\n        ${e.message}`); }
}
console.log(fallas === 0 ? `\n${casos.length} chequeos OK` : `\n${fallas} de ${casos.length} fallaron`);
process.exit(fallas ? 1 : 0);
