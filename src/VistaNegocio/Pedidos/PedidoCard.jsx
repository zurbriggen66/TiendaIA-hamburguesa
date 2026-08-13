import React from 'react';

const ETIQUETA_ESTADO = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const ETIQUETA_COBRO = {
  pagado: '✅ Pagado',
  parcial: '🟡 Parcial',
  pendiente: '🔴 Pendiente',
};

const ETIQUETA_SIGUIENTE = {
  pendiente: 'Marcar en preparación',
  en_preparacion: 'Marcar listo',
  listo: 'Marcar entregado',
};

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const formatearFechaHora = (iso) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

export default function PedidoCard({ pedido, onCobrar, onDetalle, onImprimir, onEliminar, onAvanzarEstado, onCancelar }) {
  return (
    <div className="pedido-card">
      <div className="pedido-card-header">
        <div>
          <h4>{pedido.cliente || `Pedido #${pedido.id}`}</h4>
          <span className="pedido-fecha-creacion">🕐 {formatearFechaHora(pedido.creado)}</span>
        </div>
        <div className="pedido-card-header-derecha">
          <span className={`badge-estado estado-${pedido.estado}`}>{ETIQUETA_ESTADO[pedido.estado]}</span>
          <span className={`badge-cobro cobro-${pedido.estado_cobro}`}>{ETIQUETA_COBRO[pedido.estado_cobro]}</span>
        </div>
      </div>

      <div className="pedido-acciones-toolbar">
        <button
          type="button"
          className={`pedido-accion pedido-accion-cobrar ${pedido.estado_cobro !== 'pagado' ? 'pedido-accion-cobrar-pendiente' : ''}`}
          title={pedido.estado_cobro === 'pagado' ? 'Ver o corregir el cobro' : 'Cobrar pedido'}
          onClick={() => onCobrar(pedido)}
        >
          <span aria-hidden="true">💰</span>
          {pedido.estado_cobro === 'pagado' ? 'Cobrado' : 'Cobrar'}
        </button>
        <button type="button" className="pedido-accion pedido-accion-detalle" title="Ver detalles del pedido" onClick={() => onDetalle(pedido)}>
          <span aria-hidden="true">📝</span>Detalle
        </button>
        <button type="button" className="pedido-accion pedido-accion-imprimir" title="Imprimir ticket" onClick={() => onImprimir(pedido)}>
          <span aria-hidden="true">🖨️</span>Imprimir
        </button>
        <button type="button" className="pedido-accion pedido-accion-eliminar" title="Eliminar pedido" onClick={() => onEliminar(pedido)}>
          <span aria-hidden="true">🗑</span>Eliminar
        </button>
      </div>

      <div className="pedido-entrega-info">
        <span className={`badge-entrega badge-entrega-${pedido.tipo_entrega}`}>
          {pedido.tipo_entrega === 'delivery' ? '🛵 Delivery' : '🏠 Retiro en local'}
        </span>
        {pedido.telefono && <span className="pedido-entrega-dato">📞 {pedido.telefono}</span>}
        {pedido.tipo_entrega === 'delivery' && pedido.direccion && (
          <span className="pedido-entrega-dato">📍 {pedido.direccion}</span>
        )}
        {pedido.localidad_nombre && (
          <span className="pedido-entrega-dato">🗺️ {pedido.localidad_nombre}</span>
        )}
        {pedido.hora_salida && (
          <span className="pedido-entrega-dato">🕒 Sale {pedido.hora_salida.slice(0, 5)}</span>
        )}
      </div>

      {pedido.nota && (
        <p className="pedido-nota">📝 {pedido.nota}</p>
      )}

      <ul className="pedido-items-lista">
        {pedido.items.map((item) => (
          <li key={item.id}>
            <div className="pedido-item-info">
              <span>
                {item.cantidad} × {item.producto_nombre || item.combo_nombre}
                {item.descuento_pct > 0 && <span className="badge-descuento badge-descuento-chica">🏷️ -{item.descuento_pct}%</span>}
              </span>
              {item.extras_detalle && item.extras_detalle.length > 0 && (
                <span className="pedido-item-extras">
                  + {item.extras_detalle.map((e) => `${e.cantidad > 1 ? `${e.cantidad}x ` : ''}${e.nombre}`).join(', ')}
                </span>
              )}
            </div>
            <span>{formatearPrecio(item.subtotal)}</span>
          </li>
        ))}
      </ul>

      <div className="pedido-card-footer">
        {(Number(pedido.costo_envio) > 0 || Number(pedido.descuento_pct) > 0) && (
          <div className="pedido-desglose">
            <div><span>Subtotal</span><span>{formatearPrecio(pedido.subtotal)}</span></div>
            {Number(pedido.costo_envio) > 0 && (
              <div><span>Envío</span><span>{formatearPrecio(pedido.costo_envio)}</span></div>
            )}
            {Number(pedido.descuento_pct) > 0 && (
              <div><span>Descuento</span><span>-{pedido.descuento_pct}%</span></div>
            )}
          </div>
        )}
        <span className="pedido-total">{formatearPrecio(pedido.total)}</span>
        <div className="pedido-acciones-estado">
          {ETIQUETA_SIGUIENTE[pedido.estado] && (
            <button type="button" className="btn-vibrante btn-siguiente-estado" onClick={() => onAvanzarEstado(pedido)}>
              {ETIQUETA_SIGUIENTE[pedido.estado]}
            </button>
          )}
          {pedido.estado !== 'entregado' && pedido.estado !== 'cancelado' && (
            <button type="button" className="btn-cancelar-pedido" onClick={() => onCancelar(pedido)}>
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
