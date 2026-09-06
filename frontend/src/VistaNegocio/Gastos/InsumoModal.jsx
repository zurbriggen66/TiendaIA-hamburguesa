import React, { useState } from 'react';
import api from '../../services/api';
import { toast } from '../../utils/toast';

const UNIDADES = ['kg', 'litros', 'unidades', 'otro'];

const pad2 = (n) => String(n).padStart(2, '0');

const aDatetimeLocal = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

export default function InsumoModal({ insumo, onClose, onSaved }) {
  const [nombre, setNombre] = useState(insumo ? insumo.nombre : '');
  const [unidad, setUnidad] = useState(insumo ? insumo.unidad : 'kg');
  const [stockMinimo, setStockMinimo] = useState(insumo ? insumo.stock_minimo : '');
  const [cantidad, setCantidad] = useState(insumo ? insumo.cantidad_disponible : '');
  const [precio, setPrecio] = useState(insumo ? insumo.precio : '');
  // Lo que a MI me cuesta una unidad. Es el dato con el que se calcula cuánto cuesta
  // hacer cada producto, y sin él no hay forma de saber si deja plata.
  const [costoManual, setCostoManual] = useState(
    insumo && Number(insumo.costo_manual) > 0 ? insumo.costo_manual : '',
  );
  const [descuentoPct, setDescuentoPct] = useState(insumo && insumo.descuento_pct > 0 ? insumo.descuento_pct : '');
  const [descuentoHasta, setDescuentoHasta] = useState(aDatetimeLocal(insumo ? insumo.descuento_hasta : null));
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      toast.error('Ponele un nombre al insumo.');
      return;
    }
    if (Number(descuentoPct) > 0 && !descuentoHasta) {
      toast.alerta('Elegí hasta cuándo dura el descuento del insumo.');
      return;
    }

    setGuardando(true);
    try {
      if (Number(cantidad) < 0) {
        toast.alerta('El stock no puede ser negativo.');
        setGuardando(false);
        return;
      }
      const datos = {
        nombre: nombre.trim(),
        unidad,
        stock_minimo: stockMinimo || 0,
        cantidad_disponible: cantidad || 0,
        precio: precio || 0,
        costo_manual: costoManual || 0,
        descuento_pct: Number(descuentoPct) > 0 ? Number(descuentoPct) : 0,
        descuento_hasta: Number(descuentoPct) > 0 ? new Date(descuentoHasta).toISOString() : null,
      };
      if (insumo) {
        await api.patch(`/insumos/${insumo.id}/`, datos);
      } else {
        await api.post('/insumos/', datos);
      }
      onSaved();
    } catch (error) {
      console.error('Error al guardar el insumo:', error);
      toast.error('Hubo un problema al guardar el insumo.');
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
            <label className="form-label">💲 ¿Cuánto te cuesta 1 {unidad}?</label>
            <div className="input-con-prefijo">
              <span className="input-prefijo">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-vibrante"
                placeholder={
                  insumo?.origen_del_costo === 'compra'
                    ? `${insumo.costo_unitario} (deducido de la última compra)`
                    : '0,00'
                }
                value={costoManual}
                onChange={(e) => setCostoManual(e.target.value)}
              />
            </div>
            <p className="form-ayuda">
              Con esto se calcula cuánto cuesta hacer cada producto: si una hamburguesa
              lleva 2 fetas de cheddar a $200 y 1 disco de carne a $300, cuesta $500.
              {insumo?.origen_del_costo === 'compra' && (
                <> Dejalo vacío para seguir usando el costo de la última compra.</>
              )}
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Precio como insumo extra (opcional)</label>
            <div className="input-con-sufijo">
              <span>$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-vibrante"
                placeholder="0"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </div>
            <p className="form-ayuda">
              Lo que se le suma al precio del producto cuando este insumo se agrega como extra de una variante (ej. "Doble" = precio del producto + este valor).
            </p>
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

          <div className="form-group">
            <label className="form-label">🏷️ Descuento sobre este insumo (opcional)</label>
            <p className="form-ayuda" style={{ marginTop: 0 }}>
              Si este insumo se usa como extra de alguna presentación (ej. "Doble"), el descuento se aplica solo en esas variantes.
            </p>
            <div className="form-row">
              <input
                type="number"
                min="1"
                max="99"
                className="input-vibrante"
                placeholder="% de descuento"
                value={descuentoPct}
                onChange={(e) => setDescuentoPct(e.target.value)}
              />
              <input
                type="datetime-local"
                className="input-vibrante"
                value={descuentoHasta}
                onChange={(e) => setDescuentoHasta(e.target.value)}
              />
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
