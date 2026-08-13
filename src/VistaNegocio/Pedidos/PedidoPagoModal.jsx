import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { METODOS_PAGO as METODOS } from '../../utils/metodosPago';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const formatearHora = (iso) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

const calcularFalta = (pedido) =>
  pedido ? Math.max(Number(pedido.total) - Number(pedido.cobrado), 0) : 0;

export default function PedidoPagoModal({ pedidoId, onClose, onSaved }) {
  const [pedido, setPedido] = useState(null);
  const [metodo, setMetodo] = useState('efectivo');
  const [monto, setMonto] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarPedido = useCallback(async () => {
    const { data } = await api.get(`/pedidos/${pedidoId}/`);
    setPedido(data);
    return data;
  }, [pedidoId]);

  // Al abrir, el monto viene precargado con lo que falta: el caso normal (cobrar todo
  // de una) es apretar un botón, sin escribir nada.
  useEffect(() => {
    cargarPedido().then((data) => {
      const restante = calcularFalta(data);
      if (restante > 0) setMonto(String(restante));
    });
  }, [cargarPedido]);

  const falta = calcularFalta(pedido);
  const estaPagado = pedido !== null && falta <= 0;

  const agregarPago = async (e) => {
    e.preventDefault();
    if (!monto || Number(monto) <= 0) {
      alert('Ingresá un monto válido.');
      return;
    }
    setGuardando(true);
    try {
      await api.post('/pagos/', { pedido: pedidoId, metodo, monto: Number(monto) });
      const actualizado = await cargarPedido();
      onSaved();

      // Si con este pago el pedido quedó saldado, no hay nada más que hacer acá: se cierra solo.
      if (calcularFalta(actualizado) <= 0) {
        onClose();
        return;
      }
      setMonto(String(calcularFalta(actualizado)));
    } catch (error) {
      console.error('Error al registrar el pago:', error);
      alert('Hubo un problema al registrar el pago.');
    } finally {
      setGuardando(false);
    }
  };

  const eliminarPago = async (pago) => {
    if (!window.confirm(`¿Eliminar el pago de ${formatearPrecio(pago.monto)} (${pago.metodo_label})?`)) return;
    try {
      await api.delete(`/pagos/${pago.id}/`);
      await cargarPedido();
      onSaved();
    } catch (error) {
      console.error('Error al eliminar el pago:', error);
      alert('No se pudo eliminar el pago.');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Cobrar pedido</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        {!pedido ? (
          <p className="estado-vacio">Cargando...</p>
        ) : (
          <>
            <p className="pedido-envio-contexto">{pedido.cliente || `Pedido #${pedido.id}`}</p>

            {/* Lo que falta cobrar es EL dato del modal, así que va grande y solo */}
            <div className={`pago-falta-destacado ${estaPagado ? 'pago-falta-saldado' : ''}`}>
              <span>{estaPagado ? 'Este pedido ya está pagado' : 'Falta cobrar'}</span>
              <strong>{estaPagado ? '✅' : formatearPrecio(falta)}</strong>
            </div>

            <div className="pago-resumen">
              <div>
                <span>Total del pedido</span>
                <strong>{formatearPrecio(pedido.total)}</strong>
              </div>
              <div>
                <span>Ya cobrado</span>
                <strong className="pago-resumen-cobrado">{formatearPrecio(pedido.cobrado)}</strong>
              </div>
            </div>

            {pedido.pagos.length > 0 && (
              <div className="pago-lista">
                <span className="pago-lista-titulo">Pagos registrados</span>
                {pedido.pagos.map((pago) => (
                  <div key={pago.id} className="pago-fila-registrado">
                    <span>{pago.metodo_label}</span>
                    <span>{formatearPrecio(pago.monto)}</span>
                    <span className="pago-fila-hora">{formatearHora(pago.creado)}</span>
                    <button type="button" onClick={() => eliminarPago(pago)} title="Eliminar pago">✕</button>
                  </div>
                ))}
              </div>
            )}

            {!estaPagado && (
              <form onSubmit={agregarPago} className="pago-form-nuevo">
                <div className="form-group">
                  <label className="form-label">¿Con qué te pagan?</label>
                  <select className="input-vibrante" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                    {METODOS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">¿Cuánto te pagan?</label>
                  <div className="pago-monto-fila">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-vibrante"
                      placeholder="0.00"
                      value={monto}
                      onChange={(e) => setMonto(e.target.value)}
                    />
                    {Number(monto) !== falta && (
                      <button type="button" className="btn-secundario pago-btn-todo" onClick={() => setMonto(String(falta))}>
                        Todo
                      </button>
                    )}
                  </div>
                  {Number(monto) > 0 && Number(monto) < falta && (
                    <p className="pago-aviso-parcial">
                      Es un pago parcial: van a quedar {formatearPrecio(falta - Number(monto))} sin cobrar.
                    </p>
                  )}
                </div>

                <button type="submit" className="btn-vibrante pago-btn-confirmar" disabled={guardando}>
                  {guardando
                    ? 'Registrando...'
                    : Number(monto) >= falta
                      ? `💰 Cobrar todo (${formatearPrecio(falta)})`
                      : `💰 Cobrar ${formatearPrecio(monto || 0)}`}
                </button>
              </form>
            )}

            <div className="modal-actions">
              <button type="button" className="btn-secundario" onClick={onClose}>Cerrar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
