import React, { useState } from 'react';
import api from '../../services/api';

const UNIDADES = ['kg', 'litros', 'unidades', 'otro'];

export default function InsumoModal({ insumo, onClose, onSaved }) {
  const [nombre, setNombre] = useState(insumo ? insumo.nombre : '');
  const [unidad, setUnidad] = useState(insumo ? insumo.unidad : 'kg');
  const [stockMinimo, setStockMinimo] = useState(insumo ? insumo.stock_minimo : '');
  const [cantidad, setCantidad] = useState(insumo ? insumo.cantidad_disponible : '');
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('Ponele un nombre al insumo.');
      return;
    }

    setGuardando(true);
    try {
      if (Number(cantidad) < 0) {
        alert('El stock no puede ser negativo.');
        setGuardando(false);
        return;
      }
      const datos = {
        nombre: nombre.trim(),
        unidad,
        stock_minimo: stockMinimo || 0,
        cantidad_disponible: cantidad || 0,
      };
      if (insumo) {
        await api.patch(`/insumos/${insumo.id}/`, datos);
      } else {
        await api.post('/insumos/', datos);
      }
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
          <h3>{insumo ? 'Editar insumo' : 'Nuevo insumo'}</h3>
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

          <div className="form-group">
            <label className="form-label">Stock actual</label>
            <div className="input-con-sufijo">
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-vibrante"
                placeholder="0"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
              />
              <span>{unidad}</span>
            </div>
            <p className="form-ayuda">Corregilo a mano cuando hagas un recuento. Los pedidos lo descuentan solos.</p>
          </div>

          <div className="form-group">
            <label className="form-label">Avisar cuando queden menos de (opcional)</label>
            <div className="input-con-sufijo">
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-vibrante"
                placeholder="0"
                value={stockMinimo}
                onChange={(e) => setStockMinimo(e.target.value)}
              />
              <span>{unidad}</span>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante" disabled={guardando}>
              {guardando ? 'Guardando...' : insumo ? 'Guardar cambios' : 'Guardar insumo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
