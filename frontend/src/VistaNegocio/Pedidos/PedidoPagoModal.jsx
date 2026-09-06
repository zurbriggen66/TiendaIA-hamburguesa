import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { METODOS_PAGO as METODOS } from '../../utils/metodosPago';
import { toast } from '../../utils/toast';

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
  const [dejaVuelto, setDejaVuelto] = useState(false);
  // Vacío = el vuelto sale por el mismo método del cobro (el caso normal, no hay nada
  // que anotar). Solo se registra cuando sale por otra vía, porque ahí la plata física
  // deja de coincidir con lo que dice el sistema en cada método.
  const [vueltoMetodo, setVueltoMetodo] = useState('');
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
  // Lo que el cliente entrega en la mano, que no es lo mismo que lo que vale el pedido.
  const entregado = Number(monto) || 0;
  const vuelto = Math.max(entregado - falta, 0);
  // El vuelto solo se anota si vuelve por otra vía: si sale por el mismo método, entra
  // y sale del mismo lado y el saldo ya queda bien sin registrar nada.
  const vueltoPorOtraVia = vuelto > 0 && !dejaVuelto && !!vueltoMetodo && vueltoMetodo !== metodo;

  const agregarPago = async (e) => {
    e.preventDefault();
    if (entregado <= 0) {
      toast.alerta('Ingresá un monto válido.');
      return;
    }
    setGuardando(true);
    try {
      // Al pedido se le aplica como mucho lo que falta. El excedente es vuelto (sale
      // del cajón, no se registra) o propina (se queda, pero no es venta del pedido).
      // Mandarlo todo como `monto` era lo que dejaba la caja inflada y sin cerrar.
      await api.post('/pagos/', {
        pedido: pedidoId,
        metodo,
        monto: Math.min(entregado, falta),
        propina: dejaVuelto ? vuelto : 0,
        // Sin esto el cajón quedaba con los $30.000 que entregó el cliente mientras el
        // sistema anotaba $27.325, y la transferencia del vuelto no figuraba en ningún lado.
        vuelto_monto: vueltoPorOtraVia ? vuelto : 0,
        vuelto_metodo: vueltoPorOtraVia ? vueltoMetodo : '',
      });
      const actualizado = await cargarPedido();
      onSaved();

      // Si con este pago el pedido quedó saldado, no hay nada más que hacer acá: se cierra solo.
      if (calcularFalta(actualizado) <= 0) {
        onClose();
        return;
      }
      setDejaVuelto(false);
      setVueltoMetodo('');
      setMonto(String(calcularFalta(actualizado)));
    } catch (error) {
      console.error('Error al registrar el pago:', error);
      toast.error('Hubo un problema al registrar el pago.');
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
      toast.error('No se pudo eliminar el pago.');
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
                    <span>
                      {pago.metodo_label}
                      {Number(pago.vuelto_monto) > 0 && (
                        <span className="pago-fila-vuelto">
                          {' '}(vuelto {formatearPrecio(pago.vuelto_monto)} por {pago.vuelto_metodo_label})
                        </span>
                      )}
                    </span>
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
                  <select
                    className="input-vibrante"
                    value={metodo}
                    // Cambiar el método del cobro invalida la vía del vuelto elegida antes.
                    onChange={(e) => { setMetodo(e.target.value); setVueltoMetodo(''); }}
                  >
                    {METODOS.map((m) => (
                      <option key={m.value} value={m.value}>{m.label}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">¿Con cuánto te paga?</label>
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
                    {entregado !== falta && (
                      <button type="button" className="btn-secundario pago-btn-todo" onClick={() => setMonto(String(falta))}>
                        Todo
                      </button>
                    )}
                  </div>
                  {entregado > 0 && entregado < falta && (
                    <p className="pago-aviso-parcial">
                      Es un pago parcial: van a quedar {formatearPrecio(falta - entregado)} sin cobrar.
                    </p>
                  )}

                  {vuelto > 0 && (
                    <>
                      <label className="checkbox-vibrante">
                        <input
                          type="checkbox"
                          checked={dejaVuelto}
                          onChange={(e) => setDejaVuelto(e.target.checked)}
                        />
                        <span>Se deja los {formatearPrecio(vuelto)} de vuelto</span>
                      </label>
                      {!dejaVuelto && (
                        <>
                          <label className="form-label">¿Por dónde le devolvés el vuelto?</label>
                          <select
                            className="input-vibrante"
                            value={vueltoMetodo}
                            onChange={(e) => setVueltoMetodo(e.target.value)}
                          >
                            <option value="">
                              {METODOS.find((m) => m.value === metodo)?.label} — igual que el cobro
                            </option>
                            {METODOS.filter((m) => m.value !== metodo).map((m) => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                        </>
                      )}
                      <p className="pago-aviso-parcial">
                        {dejaVuelto
                          ? `Quedan ${formatearPrecio(vuelto)} en la caja como propina.`
                          : vueltoPorOtraVia
                            ? `Entran ${formatearPrecio(entregado)} por ${METODOS.find((m) => m.value === metodo)?.label} y salen ${formatearPrecio(vuelto)} por ${METODOS.find((m) => m.value === vueltoMetodo)?.label}.`
                            : `Devolvele ${formatearPrecio(vuelto)} de vuelto.`}
                      </p>
                    </>
                  )}
                </div>

                <button type="submit" className="btn-vibrante pago-btn-confirmar" disabled={guardando}>
                  {guardando
                    ? 'Registrando...'
                    : entregado >= falta
                      ? `💰 Cobrar todo (${formatearPrecio(falta)})`
                      : `💰 Cobrar ${formatearPrecio(entregado)}`}
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
