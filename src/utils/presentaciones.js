// Las presentaciones son variantes CON RECARGO sobre el producto (ej. "Doble" = la
// hamburguesa + un medallón extra). Si el producto tiene alguna cargada pero ninguna
// es igual o más barata que el precio de lista, se agrega "CLASICA" (el precio base)
// como primera opción — si no, quedaría obligado a pagar siempre el recargo, sin
// poder pedir el producto tal cual. La usan tanto el menú público (Menu.jsx) como el
// "Nuevo pedido" del admin (PedidoModal.jsx), para que las opciones sean siempre las
// mismas en los dos lados.
export const presentacionesConBase = (producto) => {
  const reales = producto.presentaciones || [];
  if (reales.length === 0) return [];
  const masBarataReal = Math.min(...reales.map((p) => Number(p.precio)));
  if (masBarataReal <= Number(producto.precio)) return reales;
  return [{ id: null, nombre: 'CLASICA', precio: producto.precio }, ...reales];
};
