import React, { useState } from 'react';
import api from '../services/api';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const precioUnitarioLinea = (linea) =>
  Number(linea.item.precio) + (linea.extras || []).reduce((acc, e) => acc + Number(e.precio) * e.cantidad, 0);

const textoExtras = (extras) =>
  (extras || []).map((e) => `${e.cantidad > 1 ? `${e.cantidad}x ` : ''}${e.nombre}`).join(', ');

function armarMensajeWhatsapp({ nombre, telefono, tipoEntrega, direccion, items, total }) {
  const lineas = [
    '🍔 *Nuevo pedido - ANTOJO Burger*',
    '',
    `Cliente: ${nombre}`,
    `Teléfono: ${telefono}`,
    `Entrega: ${tipoEntrega === 'delivery' ? 'Delivery' : 'Retiro en local'}`,
  ];
  if (tipoEntrega === 'delivery') {
    lineas.push(`Dirección: ${direccion}`);
    lineas.push('(El envío tiene un costo adicional a coordinar)');
  }
  lineas.push('', 'Productos:');
  items.forEach((linea) => {
    const extrasTexto = linea.extras && linea.extras.length > 0
      ? ` (+ ${textoExtras(linea.extras)})`
      : '';
    lineas.push(`${linea.cantidad}x ${linea.item.nombre}${extrasTexto} - ${formatearPrecio(precioUnitarioLinea(linea) * linea.cantidad)}`);
  });
  lineas.push('', `*Total: ${formatearPrecio(total)}*`);
  return lineas.join('\n');
}

export default function CarritoDrawer({ items, whatsapp, onClose, onCambiarCantidad, onQuitar, onVaciar }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState('retiro');
  const [direccion, setDireccion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);

  const total = items.reduce((acc, linea) => acc + precioUnitarioLinea(linea) * linea.cantidad, 0);

  const enviarPedido = async (e) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Agregá al menos un producto al pedido.');
      return;
    }
    if (!nombre.trim() || !telefono.trim()) {
      alert('Completá tu nombre y teléfono.');
      return;
    }
    if (tipoEntrega === 'delivery' && !direccion.trim()) {
      alert('Completá la dirección para el delivery.');
      return;
    }

    setEnviando(true);
    try {
      await api.post('/pedidos/', {
        cliente: nombre.trim(),
        telefono: telefono.trim(),
        tipo_entrega: tipoEntrega,
        direccion: tipoEntrega === 'delivery' ? direccion.trim() : '',
        items: items.map((linea) =>
          linea.tipo === 'combo'
            ? { combo: linea.item.id, cantidad: linea.cantidad }
            : {
                producto: linea.item.id,
                cantidad: linea.cantidad,
                extras: (linea.extras || []).map((e) => ({ producto: e.id, cantidad: e.cantidad })),
              }
        ),
      });
    } catch (error) {
      // No bloqueamos el envío por WhatsApp aunque falle el guardado en el sistema.
      console.error('Error al registrar el pedido:', error);
    }

    const mensaje = armarMensajeWhatsapp({ nombre, telefono, tipoEntrega, direccion, items, total });
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`, '_blank');

    setEnviando(false);
    setExito(true);
    onVaciar();
  };

  return (
    <div className="carrito-overlay" onClick={onClose}>
      <aside className="carrito-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="carrito-header">
          <h3>Tu pedido</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        {exito ? (
          <div className="carrito-exito">
            <span className="carrito-exito-icono">✅</span>
            <p>¡Pedido enviado! Te vamos a contactar por WhatsApp para confirmarlo.</p>
            <button type="button" className="btn-vibrante" onClick={onClose}>Cerrar</button>
          </div>
        ) : items.length === 0 ? (
          <p className="carrito-vacio">Todavía no agregaste productos.</p>
        ) : (
          <form onSubmit={enviarPedido} className="carrito-form">
            <div className="carrito-items">
              {items.map((linea) => (
                <div key={linea.lineaId} className="carrito-item">
                  <div className="carrito-item-info">
                    <strong>
                      {linea.item.nombre}
                      {linea.tipo === 'combo' && <span className="carrito-item-badge-combo">Combo</span>}
                    </strong>
                    {linea.extras && linea.extras.length > 0 && (
                      <span className="carrito-item-extras">+ {textoExtras(linea.extras)}</span>
                    )}
                    <span>{formatearPrecio(precioUnitarioLinea(linea))} c/u</span>
                  </div>
                  <div className="carrito-item-cantidad">
                    <button type="button" onClick={() => onCambiarCantidad(linea.lineaId, linea.cantidad - 1)}>−</button>
                    <span>{linea.cantidad}</span>
                    <button type="button" onClick={() => onCambiarCantidad(linea.lineaId, linea.cantidad + 1)}>+</button>
                  </div>
                  <button type="button" className="carrito-item-quitar" onClick={() => onQuitar(linea.lineaId)}>🗑</button>
                </div>
              ))}
            </div>

            <div className="carrito-total">
              <span>Total</span>
              <strong>{formatearPrecio(total)}</strong>
            </div>

            <div className="form-group">
              <label className="form-label">Nombre</label>
              <input type="text" className="input-vibrante" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Tu nombre" />
            </div>

            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input type="tel" className="input-vibrante" value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder="Tu WhatsApp o teléfono" />
            </div>

            <div className="form-group">
              <label className="form-label">¿Cómo lo recibís?</label>
              <div className="tipo-entrega-selector">
                <button type="button" className={tipoEntrega === 'retiro' ? 'activo' : ''} onClick={() => setTipoEntrega('retiro')}>
                  Retiro en local
                </button>
                <button type="button" className={tipoEntrega === 'delivery' ? 'activo' : ''} onClick={() => setTipoEntrega('delivery')}>
                  Delivery
                </button>
              </div>
            </div>

            {tipoEntrega === 'delivery' && (
              <>
                <div className="form-group">
                  <label className="form-label">Dirección</label>
                  <input type="text" className="input-vibrante" value={direccion} onChange={(e) => setDireccion(e.target.value)} placeholder="Calle, número y referencia" />
                </div>
                <p className="aviso-envio">🛵 El envío tiene un costo adicional que coordinamos por WhatsApp.</p>
              </>
            )}

            <button type="submit" className="btn-vibrante btn-whatsapp" disabled={enviando}>
              {enviando ? 'Enviando...' : '📲 Enviar pedido por WhatsApp'}
            </button>
          </form>
        )}
      </aside>
    </div>
  );
}
