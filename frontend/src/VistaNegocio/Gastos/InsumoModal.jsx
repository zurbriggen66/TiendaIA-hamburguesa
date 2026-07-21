import React, { useState } from 'react';
import api from '../../services/api';

const UNIDADES = ['kg', 'litros', 'unidades', 'otro'];

export default function InsumoModal({ onClose, onSaved }) {
  const [nombre, setNombre] = useState('');
  const [unidad, setUnidad] = useState('kg');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('Ponele un nombre al insumo.');
      return;
    }

    setGuardando(true);
    try {
      await api.post('/insumos/', { nombre: nombre.trim(), unidad });
      onSaved();
    } catch (error) {
      console.error('Error al guardar el insumo:', error);
      alert('Hubo un problema al guardar el insumo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Nuevo insumo</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={guardar}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              type="text"
              className="input-vibrante"
              placeholder="Ej: Carne"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Unidad de medida</label>
            <select className="input-vibrante" value={unidad} onChange={(e) => setUnidad(e.target.value)}>
              {UNIDADES.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar insumo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
