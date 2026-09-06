import React, { useState } from 'react';
import api from '../../services/api';
import { METODOS_PAGO } from '../../utils/metodosPago';
import { toast } from '../../utils/toast';

const CATEGORIAS = [
  { value: 'insumos', label: 'Insumos / Stock' },
  { value: 'servicios', label: 'Servicios' },
  { value: 'sueldos', label: 'Sueldos' },
  { value: 'otros', label: 'Otros' },
];

export default function GastoModal({ insumos, hayCajaAbierta = false, onClose, onSaved }) {
  const [categoria, setCategoria] = useState('insumos');
  const [descripcion, setDescripcion] = useState('');
  const [monto, setMonto] = useState('');
  const [metodoPago, setMetodoPago] = useState('efectivo');
  const [insumoId, setInsumoId] = useState(insumos[0] ? insumos[0].id : '');
  const [cantidad, setCantidad] = useState('');
  // Marcado por defecto solo si el gasto es en efectivo y hay un turno abierto: es el
  // caso típico (sacar plata del cajón para comprar). El alquiler pagado por
  // transferencia es un gasto igual, pero no toca el cajón.
  const [saleDelCajon, setSaleDelCajon] = useState(hayCajaAbierta);
  const [guardando, setGuardando] = useState(false);

  const esInsumo = categoria === 'insumos';
  // Solo el efectivo sale de un cajón. Con otro método la pregunta no aplica.
  const puedeSalirDelCajon = hayCajaAbierta && metodoPago === 'efectivo';

  const guardar = async (e) => {
    e.preventDefault();
    if (!descripcion.trim() || !monto) {
      toast.alerta('Completá al menos la descripción y el monto.');
      return;
    }
    if (esInsumo && insumos.length > 0 && (!insumoId || !cantidad)) {
      toast.alerta('Elegí el insumo y la cantidad comprada.');
      return;
    }

    const payload = {
      categoria,
      descripcion: descripcion.trim(),
      monto,
      metodo_pago: metodoPago,
      sale_del_cajon: puedeSalirDelCajon && saleDelCajon,
    };
    if (esInsumo && insumoId && cantidad) {
      payload.insumo = insumoId;
      payload.cantidad = cantidad;
    }

    setGuardando(true);
    try {
      await api.post('/gastos/', payload);
      onSaved();
    } catch (error) {
      console.error('Error al guardar el gasto:', error);
      toast.error('Hubo un problema al guardar el gasto.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Nuevo gasto</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={guardar}>
          <div className="form-group">
            <label className="form-label">Categoría</label>
            <select className="input-vibrante" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <input
              type="text"
              className="input-vibrante"
              placeholder="Ej: Compra de carne al proveedor"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Monto</label>
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
            <div className="form-group">
              <label className="form-label">¿Con qué lo pagaste?</label>
              <select className="input-vibrante" value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                {METODOS_PAGO.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Un gasto siempre es un costo del negocio, pero eso no dice de dónde salió
              la plata. Solo lo que sale del cajón afecta el conteo al cerrar la caja;
              adivinarlo por el método de pago marcaba faltantes que no existían. */}
          {puedeSalirDelCajon && (
            <label className="checkbox-vibrante checkbox-cajon">
              <input
                type="checkbox"
                checked={saleDelCajon}
                onChange={(e) => setSaleDelCajon(e.target.checked)}
              />
              <span>
                <strong>Salió del cajón de la caja</strong>
                <small>Se descuenta del efectivo que tenés que contar al cerrar el turno.</small>
              </span>
            </label>
          )}

          {esInsumo && (
            insumos.length === 0 ? (
              <p className="aviso-sin-insumos">Todavía no cargaste ningún insumo. Creá uno primero para poder sumar stock.</p>
            ) : (
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Insumo</label>
                  <select className="input-vibrante" value={insumoId} onChange={(e) => setInsumoId(e.target.value)}>
                    {insumos.map((i) => (
                      <option key={i.id} value={i.id}>{i.nombre}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Cantidad comprada</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-vibrante"
                    placeholder="0"
                    value={cantidad}
                    onChange={(e) => setCantidad(e.target.value)}
                  />
                </div>
              </div>
            )
          )}

          <div className="modal-actions">
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar gasto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
