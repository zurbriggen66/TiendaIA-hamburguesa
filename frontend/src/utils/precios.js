// Precio de un producto según la presentación elegida (o el de lista si no hay
// ninguna), sin ningún descuento aplicado todavía.
export const precioBaseSinDescuento = (producto, presentacion) =>
  Number(presentacion ? presentacion.precio : producto.precio);

// El Antojo del día es OTRO origen de descuento, además del propio del producto y el
// del insumo de la presentación: compite igual que los demás y gana el que le dé más
// descuento al cliente (así decide el servidor al cobrar, en calcular_precio_producto).
// Si el antojo apunta a una variante puntual (ej. "Doble"), solo aplica cuando el
// pedido es justo esa variante; si no especifica ninguna, aplica a cualquiera.
// `solo_base`: la clasica, la que no lleva ninguna presentacion extra (esa variante no
// tiene fila propia en la base, es el producto suelto, por eso no alcanza con el id).
const antojoAplica = (producto, presentacion, antojo) => {
  if (!antojo || !antojo.producto || antojo.producto.id !== producto.id) return false;
  if (antojo.solo_base) return !presentacion?.id;
  if (antojo.presentacion) return presentacion?.id === antojo.presentacion.id;
  return true;
};

export const tieneDescuento = (producto, presentacion, antojo) =>
  Boolean(
    producto.descuento_activo
    || (presentacion && Number(presentacion.descuento_pct) > 0)
    || antojoAplica(producto, presentacion, antojo)
  );

// El % a mostrar en los badges "-X%": el que efectivamente gana (el más grande de
// los que estén activos), no cualquiera de ellos.
export const mejorPorcentajeDescuento = (producto, presentacion, antojo) => {
  const candidatos = [];
  if (producto.descuento_activo) candidatos.push(Number(producto.descuento_pct));
  if (presentacion && Number(presentacion.descuento_pct) > 0) candidatos.push(Number(presentacion.descuento_pct));
  if (antojoAplica(producto, presentacion, antojo)) candidatos.push(Number(antojo.descuento_pct));
  return candidatos.length > 0 ? Math.max(...candidatos) : 0;
};

export const precioBaseConDescuento = (producto, presentacion, antojo) => {
  const base = precioBaseSinDescuento(producto, presentacion);
  const candidatos = [];
  if (producto.descuento_activo) {
    candidatos.push(Math.round(base * (1 - Number(producto.descuento_pct) / 100)));
  }
  if (presentacion && Number(presentacion.descuento_pct) > 0) {
    candidatos.push(Math.round(base * (1 - Number(presentacion.descuento_pct) / 100)));
  }
  if (antojoAplica(producto, presentacion, antojo)) {
    candidatos.push(Math.round(base * (1 - Number(antojo.descuento_pct) / 100)));
  }
  return candidatos.length > 0 ? Math.min(...candidatos) : base;
};
