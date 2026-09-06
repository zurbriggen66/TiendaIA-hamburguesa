/**
 * Cómo se lee un extra según cuántas unidades tenga su línea.
 *
 * Los extras se preparan POR UNIDAD: "2 x INDIA + PANCETA AHUMADA" son DOS pancetas,
 * una en cada hamburguesa. En cocina eso se leía como "una panceta para las dos" y
 * salían pedidos mal armados, así que cuando la línea tiene más de una unidad se dice
 * explícitamente en vez de dejarlo a interpretación.
 *
 * El total solo se aclara cuando no es obvio: con "2 x INDIA" y "una en cada una" ya se
 * deduce que son dos; con 2 dips en cada una de 2 hamburguesas, no.
 */
export function textoExtra(extra, unidadesDeLinea = 1) {
  const porUnidad = Number(extra.cantidad) || 1;
  const unidades = Number(unidadesDeLinea) || 1;

  if (unidades <= 1) {
    return porUnidad > 1 ? `${porUnidad}x ${extra.nombre}` : extra.nombre;
  }
  if (porUnidad === 1) {
    return `${extra.nombre} (una en cada una)`;
  }
  return `${extra.nombre} (${porUnidad} en cada una, ${porUnidad * unidades} en total)`;
}

/** La lista completa de extras de una línea, ya redactada. */
export const textoExtras = (extras, unidadesDeLinea = 1) =>
  (extras || []).map((e) => textoExtra(e, unidadesDeLinea)).join(', ');
