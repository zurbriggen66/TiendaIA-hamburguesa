import React, { useState } from 'react';
import api from '../../services/api';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

export default function PedidoEnvioDescuentoModal({ pedido, localidades, onClose, onSaved }) {
  const [localidadId, setLocalidadId] = useState(pedido.localidad ? String(pedido.localidad) : '');
  const [costoEnvio, setCostoEnvio] = useState(pedido.costo_envio || 0);
  const [aplicarDescuento, setAplicarDescuento] = useState(Number(pedido.descuento_pct) > 0);
  const [descuentoPct, setDescuentoPct] = useState(pedido.descuento_pct || '');
  const [horaSalida, setHoraSalida] = useState(pedido.hora_salida ? pedido.hora_salida.slice(0, 5) : '');
  const [guardando, setGuardando] = useState(false);

  const esDelivery = pedido.tipo_entrega === 'delivery';

  const elegirLocalidad = (id) => {
    setLocalidadId(id);
    const localidad = localidades.find((l) => String(l.id) === id);
    if (localidad) setCostoEnvio(localidad.costo_envio);
  };

  const guardar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api.patch(`/pedidos/${pedido.id}/`, {
        localidad: localidadId || null,
        costo_envio: esDelivery ? (costoEnvio || 0) : 0,
        descuento_pct: aplicarDescuento ? Number(descuentoPct) || 0 : 0,
        hora_salida: horaSalida || null,
      });
      onSaved();
    } catch (error) {
      console.error('Error al actualizar envío/descuento:', error);
      alert('Hubo un problema al guardar los cambios.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Envío, descuento y hora de salida</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={guardar}>
          <p className="pedido-envio-contexto">
            {pedido.cliente || `Pedido #${pedido.id}`} · {esDelivery ? '🛵 Delivery' : '🏠 Retiro en local'}
          </p>

          {esDelivery ? (
            <>
              <div className="form-group">
                <label className="form-label">Localidad (opcional)</label>
                <select className="input-vibrante" value={localidadId} onChange={(e) => elegirLocalidad(e.target.value)}>
                  <option value="">Sin localidad específica</option>
                  {localidades.map((l) => (
                    <option key={l.id} value={l.id}>{l.nombre} — {formatearPrecio(l.costo_envio)}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Costo de envío</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-vibrante"
                  value={costoEnvio}
                  onChange={(e) => setCostoEnvio(e.target.value)}
                />
              </div>
            </>
          ) : (
            <p className="aviso-sin-insumos">Este pedido es "Retiro en local", no lleva costo de envío.</p>
          )}

          <div className="form-group">
            <label className="checkbox-vibrante">
              <input type="checkbox" checked={aplicarDescuento} onChange={(e) => setAplicarDescuento(e.target.checked)} />
              <span>💸 Aplicar descuento</span>
            </label>
          </div>

          {aplicarDescuento && (
            <div className="form-group">
              <label className="form-label">Porcentaje de descuento</label>
              <input
                type="number"
                min="0"
                max="100"
                className="input-vibrante"
                placeholder="Ej: 5"
                value={descuentoPct}
                onChange={(e) => setDescuentoPct(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Hora de salida (opcional)</label>
            <input
              type="time"
              className="input-vibrante"
              value={horaSalida}
              onChange={(e) => setHoraSalida(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
