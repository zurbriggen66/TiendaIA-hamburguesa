import React, { useState } from 'react';
import api from '../../services/api';

const CATEGORIAS = [
  { valor: 'servicios', etiqueta: 'Servicios' },
  { valor: 'sueldos', etiqueta: 'Sueldos' },
  { valor: 'insumos', etiqueta: 'Insumos / Stock' },
  { valor: 'otros', etiqueta: 'Otros' },
];

const FRECUENCIAS = [
  { valor: 'mensual', etiqueta: 'Mensual' },
  { valor: 'quincenal', etiqueta: 'Quincenal (cada 14 días)' },
  { valor: 'semanal', etiqueta: 'Semanal' },
];

const pad2 = (n) => String(n).padStart(2, '0');
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

export default function GastoFijoModal({ gastoFijo, onClose, onSaved }) {
  const [nombre, setNombre] = useState(gastoFijo ? gastoFijo.nombre : '');
  const [monto, setMonto] = useState(gastoFijo ? gastoFijo.monto : '');
  const [categoria, setCategoria] = useState(gastoFijo ? gastoFijo.categoria : 'servicios');
  const [frecuencia, setFrecuencia] = useState(gastoFijo ? gastoFijo.frecuencia : 'mensual');
  const [proximoVencimiento, setProximoVencimiento] = useState(
    gastoFijo ? gastoFijo.proximo_vencimiento : hoyISO()
  );
  const [diasAviso, setDiasAviso] = useState(gastoFijo ? gastoFijo.dias_aviso : 5);
  const [guardando, setGuardando] = useState(false);

  const guardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) {
      alert('Ponele un nombre al gasto fijo (ej: Alquiler).');
      return;
    }
    if (!Number(monto) || Number(monto) <= 0) {
      alert('Poné cuánto hay que pagar.');
      return;
    }
    if (!proximoVencimiento) {
      alert('Elegí cuándo vence la próxima vez.');
      return;
    }

    setGuardando(true);
    try {
      const datos = {
        nombre: nombre.trim(),
        monto: Number(monto),
        categoria,
        frecuencia,
        proximo_vencimiento: proximoVencimiento,
        dias_aviso: Number(diasAviso) || 0,
      };
      if (gastoFijo) {
        await api.patch(`/gastos-fijos/${gastoFijo.id}/`, datos);
      } else {
        await api.post('/gastos-fijos/', datos);
      }
      onSaved();
    } catch (error) {
      console.error('Error al guardar el gasto fijo:', error);
      alert('Hubo un problema al guardar el gasto fijo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{gastoFijo ? 'Editar gasto fijo' : 'Nuevo gasto fijo'}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={guardar}>
          <p className="aviso-envio">
            Los gastos fijos se repiten solos. Cuando lo marques como pagado se registra en Gastos
            y la fecha salta automáticamente al próximo vencimiento.
          </p>

          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              type="text"
              className="input-vibrante"
              placeholder="Ej: Alquiler del local"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
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
              <label className="form-label">Categoría</label>
              <select className="input-vibrante" value={categoria} onChange={(e) => setCategoria(e.target.value)}>
                {CATEGORIAS.map((c) => (
                  <option key={c.valor} value={c.valor}>{c.etiqueta}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Cada cuánto se paga</label>
              <select className="input-vibrante" value={frecuencia} onChange={(e) => setFrecuencia(e.target.value)}>
                {FRECUENCIAS.map((f) => (
                  <option key={f.valor} value={f.valor}>{f.etiqueta}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Próximo vencimiento</label>
              <input
                type="date"
                className="input-vibrante"
                value={proximoVencimiento}
                onChange={(e) => setProximoVencimiento(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Avisarme con cuántos días de anticipación</label>
            <div className="input-con-sufijo">
              <input
                type="number"
                min="0"
                max="60"
                className="input-vibrante"
                value={diasAviso}
                onChange={(e) => setDiasAviso(e.target.value)}
              />
              <span>días antes</span>
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante" disabled={guardando}>
              {guardando ? 'Guardando...' : gastoFijo ? 'Guardar cambios' : 'Guardar gasto fijo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
