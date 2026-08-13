import React, { useState } from 'react';
import api from '../../services/api';
import { METODOS_PAGO } from '../../utils/metodosPago';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

export default function GastoFijoPagarModal({ gastoFijo, onClose, onSaved }) {
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [guardando, setGuardando] = useState(false);

  const pagar = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api.post(`/gastos-fijos/${gastoFijo.id}/pagar/`, { metodo_pago: metodoPago });
      onSaved();
    } catch (error) {
      console.error('Error al pagar el gasto fijo:', error);
      alert('No se pudo marcar el gasto como pagado.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Pagar {gastoFijo.nombre}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={pagar}>
          <p className="aviso-envio">
            Se registra un gasto de <strong>{formatearPrecio(gastoFijo.monto)}</strong> y la fecha salta
            al próximo vencimiento ({gastoFijo.frecuencia_label.toLowerCase()}).
          </p>

          <div className="form-group">
            <label className="form-label">¿Con qué lo pagás?</label>
            <select className="input-vibrante" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)} autoFocus>
              {METODOS_PAGO.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante" disabled={guardando}>
              {guardando ? 'Registrando...' : '✓ Confirmar pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
