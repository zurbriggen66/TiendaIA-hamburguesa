/**
 * Lógica del carrito que vale la pena tener aparte y poder probar.
 *
 * `armarLineaId` es la identidad de una línea: dos líneas con el mismo producto, la
 * misma variante y los mismos extras SON la misma línea y se fusionan. Por eso agregar
 * un extra cambia el id: pasa a ser otra línea distinta.
 */
export const armarLineaId = (tipo, id, extras, sugerido, presentacionId) =>
  `${tipo}-${id}-${presentacionId || ''}-${(extras || []).map((e) => `${e.id}x${e.cantidad}`).sort().join('_')}${sugerido ? '-carrito' : ''}`;

/**
 * Cuelga un extra de `unidades` de una línea y devuelve el carrito nuevo.
 *
 * Si la línea tiene más unidades que eso, se PARTE en dos: el extra se cobra y descuenta
 * stock por unidad, así que pedir dos hamburguesas iguales y el topping en una sola era
 * imposible — se lo llevaban las dos.
 *
 * Función pura para poder probarla: partir, fusionar con una línea gemela y mantener el
 * orden son tres cosas fáciles de romper sin que se note en pantalla.
 */
export function agregarExtraALinea(items, lineaId, extra, unidades = 1) {
  const linea = items.find((i) => i.lineaId === lineaId);
  if (!linea) return items;

  const cuantas = Math.min(Math.max(Number(unidades) || 1, 1), linea.cantidad);
  const extrasPrevios = linea.extras || [];
  const nuevosExtras = extrasPrevios.some((e) => e.id === extra.id)
    ? extrasPrevios.map((e) => (e.id === extra.id ? { ...e, cantidad: e.cantidad + 1 } : e))
    : [...extrasPrevios, {
        ...extra,
        precio: Number(extra.precio_sugerido_carrito),
        cantidad: 1,
        // Habilita el descuento de venta cruzada al mandar el pedido: el mismo extra
        // elegido desde el modal del producto se sigue cobrando a precio de lista.
        via_sugerencia: true,
      }];

  const nuevoLineaId = armarLineaId(
    linea.tipo, linea.item.id, nuevosExtras, linea.sugerido, linea.item.presentacion_id,
  );
  // Si el carrito ya tenía otra línea con esta misma combinación, se fusionan en vez de
  // quedar duplicadas.
  const gemela = items.find((i) => i.lineaId === nuevoLineaId && i.lineaId !== lineaId);

  // Va a TODAS las unidades: no hace falta partir nada.
  if (cuantas === linea.cantidad) {
    if (gemela) {
      return items
        .filter((i) => i.lineaId !== lineaId)
        .map((i) => (i.lineaId === nuevoLineaId ? { ...i, cantidad: i.cantidad + linea.cantidad } : i));
    }
    return items.map((i) => (i.lineaId === lineaId ? { ...i, lineaId: nuevoLineaId, extras: nuevosExtras } : i));
  }

  // Va a algunas: la línea original se queda con el resto.
  const resto = { ...linea, cantidad: linea.cantidad - cuantas };
  if (gemela) {
    return items.map((i) => {
      if (i.lineaId === lineaId) return resto;
      if (i.lineaId === nuevoLineaId) return { ...i, cantidad: i.cantidad + cuantas };
      return i;
    });
  }
  // La línea nueva va pegada a la original, para que se vea de dónde salió.
  return items.flatMap((i) => (
    i.lineaId === lineaId
      ? [resto, { ...linea, lineaId: nuevoLineaId, extras: nuevosExtras, cantidad: cuantas }]
      : [i]
  ));
}
