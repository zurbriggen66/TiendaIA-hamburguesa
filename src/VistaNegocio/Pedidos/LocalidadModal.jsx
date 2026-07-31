import React, { useState } from 'react';
import api from '../../services/api';

export default function LocalidadModal({ localidad, onClose, onSaved }) {
  const [nombre, setNombre] = useState(localidad ? localidad.nombre : '');
  const [costoEnvio, setCostoEnvio] = useState(localidad ? localidad.costo_envio : '');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('Ponele un nombre a la localidad.');
      return;
    }

    setGuardando(true);
    try {
      const datos = { nombre: nombre.trim(), costo_envio: costoEnvio || 0 };
      if (localidad) {
        await api.patch(`/localidades/${localidad.id}/`, datos);
      } else {
        await api.post('/localidades/', datos);
      }
      onSaved();
    } catch (error) {
      console.error('Error al guardar la localidad:', error);
      alert('Hubo un problema al guardar la localidad.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{localidad ? 'Editar localidad' : 'Nueva localidad'}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={guardar}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              type="text"
              className="input-vibrante"
              placeholder="Ej: Centro"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Costo de envío</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-vibrante"
              placeholder="0.00"
              value={costoEnvio}
              onChange={(e) => setCostoEnvio(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar localidad'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
