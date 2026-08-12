import React, { useState } from 'react';
import api from '../../services/api';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const formatearHora = (fecha) =>
  new Date(fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function CerrarCajaModal({ caja, onClose, onSaved }) {
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cerrar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api.post(`/cajas/${caja.id}/cerrar/`, { nota_cierre: nota.trim() });
      onSaved();
    } catch (error) {
      console.error('Error al cerrar la caja:', error);
      alert(error.response?.data?.detail || 'No se pudo cerrar la caja.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Cerrar caja</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={cerrar}>
          <p className="caja-cerrar-resumen">
            Vas a cerrar la caja abierta desde las <strong>{formatearHora(caja.abierta_en)}</strong>.
            <br />
            Ventas: <strong>{formatearPrecio(caja.total_ventas)}</strong> en{' '}
            <strong>{caja.total_pedidos}</strong> pedido{caja.total_pedidos === 1 ? '' : 's'}.
          </p>

          <div className="form-group">
            <label className="form-label">Nota de cierre (opcional)</label>
            <textarea
              className="input-vibrante"
              rows={3}
              placeholder="Ej: todo cuadró"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              autoFocus
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante btn-cerrar-caja" disabled={guardando}>
              {guardando ? 'Cerrando...' : 'Cerrar caja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
