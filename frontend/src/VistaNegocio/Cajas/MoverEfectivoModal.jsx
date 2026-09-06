import React, { useState } from 'react';
import api from '../../services/api';
import { toast } from '../../utils/toast';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

/**
 * Ingreso o retiro de efectivo del cajón, sin que sea una venta ni un gasto.
 *
 * Poner cambio al empezar, agregar billetes para poder dar vuelto, o retirar plata al
 * banco a mitad del turno. Sin esto el cajón solo podía subir vendiendo, y un gasto
 * grande lo dejaba en un negativo imposible.
 */
export default function MoverEfectivoModal({ caja, tipoInicial = 'ingreso', onClose, onSaved }) {
  const [tipo, setTipo] = useState(tipoInicial);
  const [monto, setMonto] = useState('');
  const [motivo, setMotivo] = useState('');
  const [guardando, setGuardando] = useState(false);

  const enCajon = Number(caja.efectivo_en_cajon);
  const valor = Number(monto) || 0;
  const esRetiro = tipo === 'retiro';
  // No se puede sacar plata que no está: se avisa antes de mandar, no después del error.
  const excedeElCajon = esRetiro && valor > enCajon;

  const guardar = async (e) => {
    e.preventDefault();
    if (valor <= 0) {
      toast.alerta('Poné cuánto efectivo estás moviendo.');
      return;
    }
    if (excedeElCajon) {
      toast.alerta(`En el cajón hay ${formatearPrecio(enCajon)}. No podés retirar más que eso.`);
      return;
    }
    setGuardando(true);
    try {
      await api.post(`/cajas/${caja.id}/mover-efectivo/`, { tipo, monto: valor, motivo: motivo.trim() });
      toast.exito(
        esRetiro
          ? `Retiraste ${formatearPrecio(valor)} del cajón.`
          : `Agregaste ${formatearPrecio(valor)} al cajón.`,
      );
      onSaved();
    } catch (error) {
      console.error('Error al mover efectivo:', error);
      toast.error(error.response?.data?.monto || error.response?.data?.detail || 'No se pudo registrar el movimiento.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Mover efectivo del cajón</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={guardar}>
          <div className="tabs" style={{ marginBottom: 16 }}>
            <button
              type="button"
              className={`tab${!esRetiro ? ' tab-activa' : ''}`}
              onClick={() => setTipo('ingreso')}
            >
              ⬇️ Ingresar
            </button>
            <button
              type="button"
              className={`tab${esRetiro ? ' tab-activa' : ''}`}
              onClick={() => setTipo('retiro')}
            >
              ⬆️ Retirar
            </button>
          </div>

          <p className="pedido-envio-contexto">
            En el cajón hay <strong>{formatearPrecio(enCajon)}</strong>.
          </p>

          <div className="form-group">
            <label className="form-label">¿Cuánto?</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-vibrante"
              placeholder="0.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              autoFocus
            />
            {excedeElCajon && (
              <p className="pago-aviso-parcial">
                En el cajón hay {formatearPrecio(enCajon)}: no podés retirar más que eso.
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">¿Por qué? (opcional)</label>
            <input
              type="text"
              className="input-vibrante"
              placeholder={esRetiro ? 'Ej: lo llevé al banco' : 'Ej: cambio para dar vuelto'}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante" disabled={guardando || excedeElCajon}>
              {guardando ? 'Guardando...' : esRetiro ? 'Retirar del cajón' : 'Agregar al cajón'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
