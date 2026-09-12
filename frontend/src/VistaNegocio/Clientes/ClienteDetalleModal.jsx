import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { textoExtras } from '../../utils/extras';

const formatearPrecio = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(v);

const formatearFecha = (iso) => new Date(iso).toLocaleDateString('es-AR');

const formatearFechaHora = (iso) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

const ORIGEN = { web: '🌐 Web', admin: '🏪 Local' };

// Ficha de un cliente registrado: cuánto compró, qué pide más y cada pedido que hizo
// con su cuenta. Solo suman al total los pedidos confirmados y no cancelados.
export default function ClienteDetalleModal({ cliente, onClose }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api.get(`/clientes/${cliente.id}/resumen/`)
      .then((res) => setDatos(res.data))
      .catch((err) => {
        console.error('Error al cargar el resumen del cliente:', err);
        setError(true);
      });
  }, [cliente.id]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card cliente-detalle" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{cliente.nombre || cliente.email}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>
        <p className="cliente-detalle-contacto">
          {cliente.email}{cliente.telefono && ` · 📞 ${cliente.telefono}`} · cliente desde {formatearFecha(cliente.creado)}
        </p>

        {error ? (
          <p className="estado-vacio">No se pudo cargar el historial de este cliente.</p>
        ) : !datos ? (
          <p className="estado-vacio">Cargando...</p>
        ) : (
          <>
            <div className="cliente-detalle-stats">
              <div><span>Total comprado</span><strong>{formatearPrecio(datos.total_comprado)}</strong></div>
              <div><span>Pedidos</span><strong>{datos.cantidad_pedidos}</strong></div>
              <div><span>Ticket promedio</span><strong>{formatearPrecio(datos.ticket_promedio)}</strong></div>
              <div><span>Puntos</span><strong>⭐ {datos.cliente.puntos}</strong></div>
            </div>
            {datos.ultima_compra && (
              <p className="cliente-detalle-nota">
                Primera compra: {formatearFecha(datos.primera_compra)} · Última: {formatearFecha(datos.ultima_compra)}
                {datos.puntos_canjeados > 0 && ` · Canjeó ${datos.puntos_canjeados} pts`}
              </p>
            )}

            {datos.favoritos.length > 0 && (
              <>
                <h4 className="cliente-detalle-titulo">Lo que más pide</h4>
                <div className="cliente-detalle-favoritos">
                  {datos.favoritos.map((f) => (
                    <div key={f.nombre}>
                      <span>{f.nombre}</span>
                      <span>{f.unidades} u.</span>
                      <strong>{formatearPrecio(f.gastado)}</strong>
                    </div>
                  ))}
                </div>
              </>
            )}

            <h4 className="cliente-detalle-titulo">Pedidos con su cuenta ({datos.pedidos.length})</h4>
            {datos.pedidos.length === 0 ? (
              <p className="estado-vacio">Todavía no hizo pedidos con su cuenta.</p>
            ) : (
              <>
                <div className="cliente-detalle-pedidos">
                  {datos.pedidos.map((p) => (
                    <div key={p.id} className={`cliente-detalle-pedido${p.cuenta_como_compra ? '' : ' cliente-detalle-no-suma'}`}>
                      <div className="cliente-detalle-pedido-cabecera">
                        <span>#{p.id} · {formatearFechaHora(p.creado)} · {ORIGEN[p.origen] || p.origen}</span>
                        {p.estado === 'cancelado' ? (
                          <span className="badge-estado estado-cancelado">Cancelado</span>
                        ) : !p.confirmado ? (
                          <span className="badge-estado estado-pendiente">Sin confirmar</span>
                        ) : null}
                        <strong>{formatearPrecio(p.total)}</strong>
                      </div>
                      <ul>
                        {p.items.map((item) => (
                          <li key={item.id}>
                            {item.cantidad} × {item.combo_nombre || [item.producto_nombre, item.presentacion_nombre].filter(Boolean).join(' ')}
                            {item.extras_detalle?.length > 0 && ` + ${textoExtras(item.extras_detalle, item.cantidad)}`}
                          </li>
                        ))}
                      </ul>
                      {(p.recompensa_nombre || p.puntos_usados > 0) && (
                        <p className="cliente-detalle-nota">
                          {p.recompensa_nombre && `🎁 Canjeó: ${p.recompensa_nombre}`}
                          {p.recompensa_nombre && p.puntos_usados > 0 && ' · '}
                          {p.puntos_usados > 0 && `Usó ${p.puntos_usados} pts de descuento`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <p className="cliente-detalle-nota">Los cancelados y los pedidos web sin confirmar se muestran atenuados y no suman al total.</p>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
