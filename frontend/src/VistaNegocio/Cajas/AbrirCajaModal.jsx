import React, { useState } from 'react';
import api from '../../services/api';

const pad2 = (n) => String(n).padStart(2, '0');
// OJO: no usar toISOString() acá — convierte a UTC y en Argentina (UTC-3) eso hace
// que "hoy" salte al día siguiente a partir de las 21:00 hora local.
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

export default function AbrirCajaModal({ onClose, onSaved }) {
  const [dia, setDia] = useState(hoyISO());
  const [nota, setNota] = useState('');
  const [guardando, setGuardando] = useState(false);

  const abrir = async (e) => {
    e.preventDefault();
    setGuardando(true);
    try {
      await api.post('/cajas/abrir/', { dia, nota_apertura: nota.trim() });
      onSaved();
    } catch (error) {
      console.error('Error al abrir la caja:', error);
      alert(error.response?.data?.detail || 'No se pudo abrir la caja.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Abrir caja</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={abrir}>
          <div className="form-group">
            <label className="form-label">Día de apertura</label>
            <input
              type="date"
              className="input-vibrante"
              value={dia}
              onChange={(e) => setDia(e.target.value)}
            />
            <p className="form-ayuda">Todo lo que se venda mientras esta caja esté abierta se va a atribuir a este día, aunque el cierre cruce la medianoche.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Nota de apertura (opcional)</label>
            <textarea
              className="input-vibrante"
              rows={3}
              placeholder="Ej: arranco con $5.000 de fondo de caja"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              autoFocus
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante" disabled={guardando}>
              {guardando ? 'Abriendo...' : 'Abrir caja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
