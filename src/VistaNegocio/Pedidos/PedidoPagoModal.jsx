import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';

const METODOS = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta_debito', label: 'Tarjeta de débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta de crédito' },
  { value: 'mercado_pago', label: 'Mercado Pago' },
  { value: 'otro', label: 'Otro' },
];

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const formatearHora = (iso) =>
  new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

export default function PedidoPagoModal({ pedidoId, onClose, onSaved }) {
  const [pedido, setPedido] = useState(null);
  const [metodo, setMetodo] = useState('efectivo');
  const [monto, setMonto] = useState('');
  const [guardando, setGuardando] = useState(false);

  const cargarPedido = useCallback(async () => {
    const { data } = await api.get(`/pedidos/${pedidoId}/`);
    setPedido(data);
  }, [pedidoId]);

  useEffect(() => {
    cargarPedido();
  }, [cargarPedido]);

  const falta = pedido ? Math.max(Number(pedido.total) - Number(pedido.cobrado), 0) : 0;

  const agregarPago = async (e) => {
    e.preventDefault();
    if (!monto || Number(monto) <= 0) {
      alert('Ingresá un monto válido.');
      return;
    }
    setGuardando(true);
    try {
      await api.post('/pagos/', { pedido: pedidoId, metodo, monto: Number(monto) });
      setMonto('');
      await cargarPedido();
      onSaved();
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

            <div className="pago-resumen">
              <div>
                <span>Total</span>
                <strong>{formatearPrecio(pedido.total)}</strong>
              </div>
              <div>
                <span>Cobrado</span>
                <strong className="pago-resumen-cobrado">{formatearPrecio(pedido.cobrado)}</strong>
              </div>
              <div>
                <span>Falta</span>
                <strong className={falta > 0 ? 'pago-resumen-falta' : 'pago-resumen-cobrado'}>{formatearPrecio(falta)}</strong>
              </div>
            </div>

            {pedido.pagos.length > 0 && (
              <div className="pago-lista">
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

            <form onSubmit={agregarPago} className="pago-form">
              <select className="input-vibrante" value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                {METODOS.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-vibrante"
                placeholder={falta > 0 ? `Ej: ${falta}` : '0.00'}
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
              />
              <button type="submit" className="btn-vibrante" disabled={guardando}>
                {guardando ? 'Agregando...' : '+ Agregar pago'}
              </button>
            </form>

            <div className="modal-actions">
              <button type="button" className="btn-secundario" onClick={onClose}>Cerrar</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
