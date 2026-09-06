import React, { useState } from 'react';
import api from '../../services/api';
import DesgloseMetodos from './DesgloseMetodos';
import { toast } from '../../utils/toast';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const formatearHora = (fecha) =>
  new Date(fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function CerrarCajaModal({ caja, onClose, onSaved }) {
  const [nota, setNota] = useState('');
  const [contado, setContado] = useState('');
  const [guardando, setGuardando] = useState(false);

  // Lo que debería haber en el cajón: inicial + cobros y propinas en efectivo, menos los
  // gastos pagados en efectivo y los vueltos que salieron por otra vía. Lo calcula el
  // backend; acá solo se compara contra lo que se contó a mano.
  const esperadoEfectivo = Number(
    (caja.desglose || []).find((d) => d.metodo === 'efectivo')?.monto || 0,
  );
  const porCobrar = Number(caja.total_ventas) - Number(caja.total_cobrado);
  const seConto = contado.trim() !== '';
  const diferencia = seConto ? Number(contado) - esperadoEfectivo : 0;
  // El min del input no frena a quien tipea el signo a mano: contar menos de cero
  // billetes no existe, y guardarlo daria una diferencia inventada.
  const conteoInvalido = seConto && Number(contado) < 0;

  const cerrar = async (e) => {
    e.preventDefault();
    if (conteoInvalido) {
      toast.alerta('El efectivo contado no puede ser negativo: poné lo que contaste.');
      return;
    }
    setGuardando(true);
    try {
      await api.post(`/cajas/${caja.id}/cerrar/`, {
        nota_cierre: nota.trim(),
        efectivo_contado: seConto ? contado : '',
      });
      onSaved();
    } catch (error) {
      console.error('Error al cerrar la caja:', error);
      toast.error(error.response?.data?.detail || 'No se pudo cerrar la caja.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Cerrar caja</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={cerrar}>
          <p className="caja-cerrar-resumen">
            Vas a cerrar la caja abierta desde las <strong>{formatearHora(caja.abierta_en)}</strong>.
            <br />
            Vendido: <strong>{formatearPrecio(caja.total_ventas)}</strong> en{' '}
            <strong>{caja.total_pedidos}</strong> pedido{caja.total_pedidos === 1 ? '' : 's'}.
            <br />
            Cobrado: <strong>{formatearPrecio(caja.total_cobrado)}</strong>.
            {porCobrar > 0 && (
              <>
                {' '}Quedan <strong>{formatearPrecio(porCobrar)}</strong> sin cobrar.
              </>
            )}
            {Number(caja.total_propinas) > 0 && (
              <>
                <br />
                Propinas: <strong>{formatearPrecio(caja.total_propinas)}</strong> — están en el
                cajón pero no son venta, por eso van aparte.
              </>
            )}
          </p>

          <DesgloseMetodos desglose={caja.desglose} />

          <div className="form-group">
            <label className="form-label">¿Cuánto efectivo contaste en el cajón? (opcional)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input-vibrante"
              placeholder={String(esperadoEfectivo)}
              value={contado}
              onChange={(e) => setContado(e.target.value)}
              autoFocus
            />
            {/* Contarlo cada turno es lo que permite ubicar una diferencia el día que
                pasa. Sin esto se descubre a fin de mes y ya no se sabe de dónde salió. */}
            {conteoInvalido ? (
              <p className="caja-arqueo-resultado caja-arqueo-mal">
                ⚠️ No se puede contar menos de cero. Poné lo que hay en el cajón.
              </p>
            ) : seConto && (
              <p className={`caja-arqueo-resultado ${diferencia === 0 ? 'caja-arqueo-ok' : 'caja-arqueo-mal'}`}>
                {diferencia === 0
                  ? '✅ Cuadra exacto.'
                  : diferencia > 0
                    ? `⚠️ Sobran ${formatearPrecio(diferencia)} contra los ${formatearPrecio(esperadoEfectivo)} esperados.`
                    : `⚠️ Faltan ${formatearPrecio(Math.abs(diferencia))} contra los ${formatearPrecio(esperadoEfectivo)} esperados.`}
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label">Nota de cierre (opcional)</label>
            <textarea
              className="input-vibrante"
              rows={3}
              placeholder="Ej: todo cuadró"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante btn-cerrar-caja" disabled={guardando || conteoInvalido}>
              {guardando ? 'Cerrando...' : 'Cerrar caja'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
