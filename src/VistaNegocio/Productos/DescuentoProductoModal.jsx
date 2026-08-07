import React, { useState } from 'react';
import api from '../../services/api';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const pad2 = (n) => String(n).padStart(2, '0');

const aDatetimeLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export default function DescuentoProductoModal({ producto, onClose, onSaved }) {
  const [descuentoPct, setDescuentoPct] = useState(producto.descuento_pct > 0 ? producto.descuento_pct : 15);
  const [hasta, setHasta] = useState(aDatetimeLocal(producto.descuento_hasta));
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    if (!hasta) {
      alert('Elegí hasta cuándo dura el descuento.');
      return;
    }
    if (Number(descuentoPct) <= 0) {
      alert('El porcentaje tiene que ser mayor a 0.');
      return;
    }

    setGuardando(true);
    try {
      await api.patch(`/productos/${producto.id}/`, {
        descuento_pct: Number(descuentoPct),
        descuento_hasta: new Date(hasta).toISOString(),
      });
      onSaved();
    } catch (error) {
      console.error('Error al guardar el descuento:', error);
      alert('Hubo un problema al guardar el descuento.');
    } finally {
      setGuardando(false);
    }
  };

  const quitar = async () => {
    if (!window.confirm('¿Quitar el descuento de este producto?')) return;
    setGuardando(true);
    try {
      await api.patch(`/productos/${producto.id}/`, { descuento_pct: 0, descuento_hasta: null });
      onSaved();
    } catch (error) {
      console.error('Error al quitar el descuento:', error);
      alert('Hubo un problema al quitar el descuento.');
    } finally {
      setGuardando(false);
    }
  };

  const precioConDescuento = Number(descuentoPct) > 0
    ? producto.precio * (1 - Number(descuentoPct) / 100)
    : producto.precio;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>🏷️ Descuento — {producto.nombre}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={guardar}>
          {producto.descuento_activo && (
            <p className="aviso-envio">
              Este producto ya tiene un descuento activo. Se apaga solo cuando pase la fecha de abajo — no hace falta que te acuerdes de sacarlo.
            </p>
          )}

          <div className="form-group">
            <label className="form-label">Porcentaje de descuento</label>
            <input
              type="number"
              min="1"
              max="100"
              className="input-vibrante"
              value={descuentoPct}
              onChange={(e) => setDescuentoPct(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Hasta cuándo</label>
            <input
              type="datetime-local"
              className="input-vibrante"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
            />
          </div>

          {Number(descuentoPct) > 0 && (
            <p className="aviso-sin-insumos">
              Precio con descuento: {formatearPrecio(precioConDescuento)} (antes {formatearPrecio(producto.precio)})
            </p>
          )}

          <div className="modal-actions">
            {producto.descuento_activo && (
              <button type="button" className="btn-secundario" style={{ marginRight: 'auto' }} onClick={quitar} disabled={guardando}>
                Quitar descuento
              </button>
            )}
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar descuento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
