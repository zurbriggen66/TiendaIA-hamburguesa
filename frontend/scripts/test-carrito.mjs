/**
 * Chequeo del carrito: colgar un extra tiene que poder ir a UNA sola unidad.
 *
 * Nace del caso real: pedir 2 hamburguesas iguales y querer el topping en una sola era
 * imposible, porque el extra se cobra y descuenta stock por unidad y se lo llevaban las
 * dos. Partir la línea, fusionarla con una gemela y mantener el orden son tres cosas
 * fáciles de romper sin que se note en pantalla.
 *
 *   node scripts/test-carrito.mjs
 */
import assert from 'node:assert/strict';
import { agregarExtraALinea, armarLineaId } from '../src/utils/carrito.js';

const DIP = { id: 9, nombre: 'DIP', precio_sugerido_carrito: 1425, categoria: 1 };
const HUEVO = { id: 8, nombre: 'HUEVO', precio_sugerido_carrito: 570, categoria: 1 };

const linea = (nombre, cantidad, extras = []) => ({
  lineaId: armarLineaId('producto', nombre.length, extras, false, null),
  tipo: 'producto',
  cantidad,
  extras,
  item: { id: nombre.length, nombre, categoria: 1, presentacion_id: null },
});

const casos = [];
const test = (nombre, fn) => casos.push([nombre, fn]);

test('a una sola de dos: la linea se parte', () => {
  const antes = [linea('ARGENTA', 2)];
  const d = agregarExtraALinea(antes, antes[0].lineaId, DIP, 1);
  assert.equal(d.length, 2, 'tendrian que quedar dos lineas');
  assert.equal(d[0].cantidad, 1);
  assert.equal(d[0].extras.length, 0, 'la que queda no lleva el extra');
  assert.equal(d[1].cantidad, 1);
  assert.equal(d[1].extras[0].id, DIP.id);
  // El total de unidades no puede cambiar por agregar un topping.
  assert.equal(d.reduce((a, l) => a + l.cantidad, 0), 2);
});

test('a las dos: no se parte nada', () => {
  const antes = [linea('ARGENTA', 2)];
  const d = agregarExtraALinea(antes, antes[0].lineaId, DIP, 2);
  assert.equal(d.length, 1);
  assert.equal(d[0].cantidad, 2);
  assert.equal(d[0].extras[0].id, DIP.id);
});

test('el extra se cobra con el precio de venta cruzada', () => {
  const antes = [linea('ARGENTA', 1)];
  const d = agregarExtraALinea(antes, antes[0].lineaId, DIP, 1);
  assert.equal(d[0].extras[0].precio, 1425);
  assert.equal(d[0].extras[0].via_sugerencia, true);
});

test('si ya existe una linea igual, se fusionan en vez de duplicar', () => {
  const conDip = linea('ARGENTA', 1, [{ ...DIP, precio: 1425, cantidad: 1, via_sugerencia: true }]);
  const antes = [linea('ARGENTA', 2), conDip];
  const d = agregarExtraALinea(antes, antes[0].lineaId, DIP, 1);
  assert.equal(d.length, 2, 'no tiene que aparecer una tercera linea');
  const conExtra = d.filter((l) => l.extras.length > 0);
  assert.equal(conExtra.length, 1);
  assert.equal(conExtra[0].cantidad, 2, 'las dos con dip quedan juntas');
  assert.equal(d.reduce((a, l) => a + l.cantidad, 0), 3);
});

test('pedir mas unidades de las que hay no inventa lineas', () => {
  const antes = [linea('ARGENTA', 2)];
  const d = agregarExtraALinea(antes, antes[0].lineaId, DIP, 99);
  assert.equal(d.length, 1);
  assert.equal(d[0].cantidad, 2);
});

test('un segundo extra distinto se apila en la misma unidad', () => {
  const antes = [linea('ARGENTA', 1)];
  const conDip = agregarExtraALinea(antes, antes[0].lineaId, DIP, 1);
  const conAmbos = agregarExtraALinea(conDip, conDip[0].lineaId, HUEVO, 1);
  assert.equal(conAmbos.length, 1);
  assert.equal(conAmbos[0].extras.length, 2);
});

test('el mismo extra dos veces sube su cantidad', () => {
  const antes = [linea('ARGENTA', 1)];
  const uno = agregarExtraALinea(antes, antes[0].lineaId, DIP, 1);
  const dos = agregarExtraALinea(uno, uno[0].lineaId, DIP, 1);
  assert.equal(dos[0].extras.length, 1);
  assert.equal(dos[0].extras[0].cantidad, 2);
});

test('una linea que no existe deja el carrito igual', () => {
  const antes = [linea('ARGENTA', 2)];
  assert.equal(agregarExtraALinea(antes, 'no-existe', DIP, 1), antes);
});

let fallas = 0;
for (const [nombre, fn] of casos) {
  try {
    fn();
    console.log(`  ok    ${nombre}`);
  } catch (e) {
    fallas++;
    console.error(`  FALLA ${nombre}\n        ${e.message}`);
  }
}
console.log(fallas === 0 ? `\n${casos.length} chequeos OK` : `\n${fallas} de ${casos.length} fallaron`);
process.exit(fallas ? 1 : 0);
