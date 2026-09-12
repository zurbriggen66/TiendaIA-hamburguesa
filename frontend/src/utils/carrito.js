// Con extensión: este archivo también lo importa el chequeo de node (scripts/test-carrito.mjs).
import { precioBaseConDescuento } from './precios.js';

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

/**
 * Convierte un pedido anterior en líneas de carrito ("Repetir pedido"), con los precios y
 * descuentos de HOY: el cliente paga lo que sale ahora, no lo que salía aquella vez.
 *
 * Lo que ya no se vende (producto oculto o borrado, una variante o un extra que dejó de
 * existir) no se agrega: se devuelve en `faltantes` para avisarle al cliente, en vez de
 * mandar al local un pedido con algo que no puede hacer.
 */
export function lineasParaRepetir(pedido, productos, combos, antojo) {
  const productoPorId = new Map(productos.filter((p) => p.activo !== false).map((p) => [p.id, p]));
  const comboPorId = new Map((combos || []).filter((c) => c.activo !== false).map((c) => [c.id, c]));
  const lineas = [];
  const faltantes = [];

  for (const item of pedido.items || []) {
    if (item.combo) {
      const combo = comboPorId.get(item.combo);
      if (combo) lineas.push({ tipo: 'combo', item: combo, cantidad: item.cantidad, extras: [] });
      else faltantes.push(item.combo_nombre || 'Un combo');
      continue;
    }

    const producto = productoPorId.get(item.producto);
    const presentacion = item.presentacion
      ? (producto?.presentaciones || []).find((pr) => pr.id === item.presentacion)
      : null;
    if (!producto || (item.presentacion && !presentacion)) {
      faltantes.push([item.producto_nombre, item.presentacion_nombre].filter(Boolean).join(' ') || 'Un producto');
      continue;
    }

    const extras = [];
    for (const e of item.extras_detalle || []) {
      const extra = productoPorId.get(e.producto);
      if (extra) extras.push({ ...extra, cantidad: e.cantidad });
      else faltantes.push(`${e.nombre} (extra de ${producto.nombre})`);
    }

    lineas.push({
      tipo: 'producto',
      // Misma forma que arma el modal del menú al tocar "Agregar al pedido".
      item: {
        ...producto,
        precio: precioBaseConDescuento(producto, presentacion, antojo),
        presentacion_id: presentacion?.id ?? null,
        presentacion_nombre: presentacion?.nombre ?? null,
      },
      cantidad: item.cantidad,
      extras,
    });
  }
  return { lineas, faltantes };
}
