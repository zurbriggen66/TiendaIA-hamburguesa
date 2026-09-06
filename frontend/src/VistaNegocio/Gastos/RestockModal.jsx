import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { METODOS_PAGO } from '../../utils/metodosPago';
import { toast } from '../../utils/toast';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const formatearFecha = (fecha) =>
  new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Atajo para el caso más común de "Gastos": comprar más de un insumo que ya existe.
// Un gasto categoria='insumos' con insumo+cantidad hace las dos cosas a la vez
// (ver GastoSerializer.create en el backend) — acá solo se preselecciona el insumo
// (ya se sabe cuál es, se tocó desde su tarjeta de Stock) y se muestra el historial
// de compras para tener una referencia de precio.
export default function RestockModal({ insumo, onClose, onSaved }) {
  const [cantidad, setCantidad] = useState('');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [guardando, setGuardando] = useState(false);
  const [historial, setHistorial] = useState(null);

  useEffect(() => {
    api.get(`/insumos/${insumo.id}/historial/`).then((res) => setHistorial(res.data)).catch(() => {});
  }, [insumo.id]);

  const precioUnidad = Number(cantidad) > 0 && Number(monto) > 0 ? Number(monto) / Number(cantidad) : null;

  const guardar = async (e) => {
    e.preventDefault();
    if (!cantidad || !monto) {
      toast.alerta('Completá la cantidad comprada y el precio pagado.');
      return;
    }
    setGuardando(true);
    try {
      await api.post('/gastos/', {
        categoria: 'insumos',
        descripcion: `Compra de ${insumo.nombre}`,
        monto,
        metodo_pago: metodoPago,
        insumo: insumo.id,
        cantidad,
      });
      onSaved();
    } catch (error) {
      console.error('Error al registrar la compra:', error);
      toast.error('Hubo un problema al registrar la compra.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Sumar stock — {insumo.nombre}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={guardar}>
          <p className="form-ayuda" style={{ marginTop: 0 }}>
            Stock actual: <strong>{insumo.cantidad_disponible} {insumo.unidad}</strong>
          </p>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Cantidad comprada</label>
              <div className="input-con-sufijo">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  className="input-vibrante"
                  placeholder="0"
                  value={cantidad}
                  onChange={(e) => setCantidad(e.target.value)}
                  autoFocus
                />
                <span>{insumo.unidad}</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Precio pagado (total)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-vibrante"
                placeholder="0.00"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
            </div>
          </div>

          {precioUnidad !== null && (
            <p className="aviso-sin-insumos">
              Sale a {formatearPrecio(precioUnidad)} por {insumo.unidad}
              {historial?.precio_promedio_unidad ? ` · promedio histórico: ${formatearPrecio(historial.precio_promedio_unidad)}` : ''}
            </p>
          )}

          <div className="form-group">
            <label className="form-label">¿Con qué lo pagaste?</label>
            <select className="input-vibrante" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
              {METODOS_PAGO.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {historial && historial.compras.length > 0 && (
            <div className="form-group">
              <label className="form-label">Últimas compras</label>
              <div className="restock-historial">
                {historial.compras.slice(0, 5).map((c) => (
                  <div key={c.id} className="restock-historial-fila">
                    <span>{formatearFecha(c.fecha)}</span>
                    <span>{c.cantidad} {insumo.unidad}</span>
                    <span>{formatearPrecio(c.monto)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Sumar al stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
