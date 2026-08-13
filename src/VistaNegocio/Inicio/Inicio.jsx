import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import AbrirCajaModal from '../Cajas/AbrirCajaModal';
import CerrarCajaModal from '../Cajas/CerrarCajaModal';
import PedidoModal from '../Pedidos/PedidoModal';
import PedidoCard from '../Pedidos/PedidoCard';
import PedidoPagoModal from '../Pedidos/PedidoPagoModal';
import PedidoEnvioDescuentoModal from '../Pedidos/PedidoEnvioDescuentoModal';
import { imprimirPedido } from '../../utils/impresion';

const formatearPrecio = (valor) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(valor);

const formatearHora = (fecha) =>
  new Date(fecha).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

const ORDEN_ESTADOS = ['pendiente', 'en_preparacion', 'listo', 'entregado'];

export default function Inicio() {
  const [reloj, setReloj] = useState(new Date());
  const [ventasHoy, setVentasHoy] = useState(0);
  const [ticketPromedio, setTicketPromedio] = useState(0);
  const [totalPedidosCaja, setTotalPedidosCaja] = useState(0);
  const [cajaInfo, setCajaInfo] = useState(null);
  const [pedidosRecientes, setPedidosRecientes] = useState([]);
  const [cajaAbierta, setCajaAbierta] = useState(true);
  const [porConfirmar, setPorConfirmar] = useState([]);
  const [confirmando, setConfirmando] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  const [gastosFijos, setGastosFijos] = useState([]);
  const [totalGastosFijos, setTotalGastosFijos] = useState(0);

  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [mostrarAbrirCaja, setMostrarAbrirCaja] = useState(false);
  const [mostrarCerrarCaja, setMostrarCerrarCaja] = useState(false);
  const [mostrarNuevoPedido, setMostrarNuevoPedido] = useState(false);
  const [modalPago, setModalPago] = useState(null);
  const [modalEnvio, setModalEnvio] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => setReloj(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const cargarInicio = async () => {
    setCargando(true);
    try {
      const [resHoy, resPorConfirmar, resRecientes, resProductos, resCategorias, resLocalidades, resFijos] = await Promise.all([
        api.get('/estadisticas/hoy/'),
        // page_size alto: ambas listas se muestran enteras, no queremos que un día
        // movido las recorte a los 20 por defecto de la paginación.
        api.get('/pedidos/', { params: { confirmado: 'false', origen: 'web', page_size: 100 } }),
        api.get('/pedidos/', { params: { ultimas_horas: 24, confirmado: 'true', page_size: 100 } }),
        api.get('/productos/'),
        api.get('/categorias/'),
        api.get('/localidades/'),
        api.get('/gastos-fijos/alertas/'),
      ]);
      const data = resHoy.data;
      setVentasHoy(data.ventas_totales || 0);
      setTicketPromedio(data.ticket_promedio || 0);
      setTotalPedidosCaja(data.total_pedidos || 0);
      setCajaInfo(data.caja);
      setCajaAbierta(Boolean(data.caja_abierta));
      setPorConfirmar((resPorConfirmar.data.results || []).filter((p) => p.estado !== 'cancelado'));
      setPedidosRecientes(resRecientes.data.results || []);
      setProductos(resProductos.data);
      setCategorias(resCategorias.data);
      setLocalidades(resLocalidades.data);
      setGastosFijos(resFijos.data.gastos || []);
      setTotalGastosFijos(Number(resFijos.data.total_pendiente) || 0);
      setError(null);
    } catch (err) {
      console.error('Error cargando datos de Inicio:', err);
      setError('No se pudieron cargar los datos de hoy.');
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarInicio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const confirmarPedido = async (pedido) => {
    setConfirmando(pedido.id);
    try {
      await api.post(`/pedidos/${pedido.id}/confirmar/`);
      await cargarInicio();
    } catch (err) {
      console.error('Error al confirmar el pedido:', err);
      alert('No se pudo confirmar el pedido.');
    } finally {
      setConfirmando(null);
    }
  };

  const cancelarPedido = async (pedido) => {
    if (!window.confirm(`¿Cancelar el pedido de ${pedido.cliente || 'este cliente'}? Esto asume que nunca llegó por WhatsApp.`)) return;
    setConfirmando(pedido.id);
    try {
      await api.patch(`/pedidos/${pedido.id}/`, { estado: 'cancelado' });
      await cargarInicio();
    } catch (err) {
      console.error('Error al cancelar el pedido:', err);
      alert('No se pudo cancelar el pedido.');
    } finally {
      setConfirmando(null);
    }
  };

  const avanzarEstadoReciente = async (pedido) => {
    const siguiente = ORDEN_ESTADOS[ORDEN_ESTADOS.indexOf(pedido.estado) + 1];
    if (!siguiente) return;
    try {
      const { data } = await api.patch(`/pedidos/${pedido.id}/`, { estado: siguiente });
      setPedidosRecientes((prev) => prev.map((p) => (p.id === pedido.id ? data : p)));
    } catch (err) {
      console.error('Error al cambiar el estado del pedido:', err);
      alert('No se pudo cambiar el estado del pedido.');
    }
  };

  const cancelarPedidoReciente = async (pedido) => {
    if (!window.confirm('¿Cancelar este pedido?')) return;
    try {
      const { data } = await api.patch(`/pedidos/${pedido.id}/`, { estado: 'cancelado' });
      setPedidosRecientes((prev) => prev.map((p) => (p.id === pedido.id ? data : p)));
    } catch (err) {
      console.error('Error al cancelar el pedido:', err);
      alert('No se pudo cancelar el pedido.');
    }
  };

  const eliminarPedidoReciente = async (pedido) => {
    if (!window.confirm(`¿Eliminar definitivamente el pedido de "${pedido.cliente || `Pedido #${pedido.id}`}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/pedidos/${pedido.id}/`);
      setPedidosRecientes((prev) => prev.filter((p) => p.id !== pedido.id));
    } catch (err) {
      console.error('Error al eliminar el pedido:', err);
      alert('No se pudo eliminar el pedido.');
    }
  };

  const porVencer = gastosFijos.filter((g) => g.esta_por_vencer);
  const hayVencidos = gastosFijos.some((g) => g.dias_restantes < 0);
  const faltaJuntar = Math.max(0, totalGastosFijos - Number(ventasHoy || 0));

  const horas = String(reloj.getHours()).padStart(2, '0');
  const minutos = String(reloj.getMinutes()).padStart(2, '0');
  const segundos = String(reloj.getSeconds()).padStart(2, '0');
  const fechaLegible = reloj.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <header className="main-header">
        <h2>Inicio</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        <div className="inicio-resumen-grid">
          {/* Tarjeta: Reloj en vivo, o Pedidos por confirmar cuando hay alguno esperando */}
          {!cargando && !error && porConfirmar.length > 0 ? (
            <div className="inicio-card inicio-card-confirmar">
              <div className="inicio-card-encabezado">
                <span className="inicio-card-icono">📥</span>
                <h3 className="inicio-card-titulo">Pedidos por confirmar</h3>
                <span className="inicio-contador-pedidos inicio-contador-confirmar">{porConfirmar.length}</span>
              </div>
              <p className="inicio-card-subtexto inicio-confirmar-aviso">
                Llegaron desde la tienda web. Confirmalos cuando el cliente te haya mandado el WhatsApp — recién ahí se suman a la caja.
              </p>

              <div className="inicio-pedidos-lista inicio-confirmar-lista">
                {porConfirmar.map((pedido) => (
                  <div key={pedido.id} className="inicio-pedido-confirmar-item">
                    <div className="inicio-pedido-info">
                      <div className="inicio-pedido-info-top">
                        <h4>{pedido.cliente || `Pedido #${pedido.id}`}</h4>
                      </div>
                      <div className="inicio-pedido-info-bottom">
                        <span>🕐 {formatearHora(pedido.creado)}</span>
                        <span>{pedido.tipo_entrega === 'delivery' ? '🛵 Delivery' : '🏠 Retiro'}</span>
                        <span>{formatearPrecio(pedido.total)}</span>
                      </div>
                    </div>
                    <div className="inicio-pedido-confirmar-acciones">
                      <button
                        type="button"
                        className="inicio-btn-cancelar"
                        onClick={() => cancelarPedido(pedido)}
                        disabled={confirmando === pedido.id}
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        className="btn-vibrante inicio-btn-confirmar"
                        onClick={() => confirmarPedido(pedido)}
                        disabled={confirmando === pedido.id}
                      >
                        {confirmando === pedido.id ? 'Confirmando...' : '✓ Confirmar pedido'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="inicio-card inicio-card-reloj">
              <div className="inicio-card-encabezado">
                <span className="inicio-card-icono">🕐</span>
                <h3 className="inicio-card-titulo">Reloj en vivo</h3>
              </div>
              <div className="inicio-reloj-numeros">
                <span>{horas}</span>
                <span className="inicio-reloj-separador">:</span>
                <span>{minutos}</span>
                <span className="inicio-reloj-separador">:</span>
                <span className="inicio-reloj-segundos">{segundos}</span>
              </div>
              <p className="inicio-card-subtexto inicio-fecha-capitalizada">{fechaLegible}</p>
            </div>
          )}

          {/* Tarjeta: Caja actual */}
          <div className="inicio-card inicio-card-ventas">
            <div className="inicio-card-encabezado">
              <span className="inicio-card-icono">💰</span>
              <h3 className="inicio-card-titulo">Caja actual</h3>
            </div>
            {!cargando && !error && !cajaAbierta ? (
              <>
                <p className="inicio-sin-caja">Sin caja abierta</p>
                <p className="inicio-card-subtexto">
                  <Link to="/admin/cajas" className="inicio-link-caja">ver historial de cajas →</Link>
                </p>
                <button type="button" className="btn-vibrante inicio-btn-caja" onClick={() => setMostrarAbrirCaja(true)}>
                  Abrir caja
                </button>
              </>
            ) : (
              <>
                <p className="inicio-monto-grande">{formatearPrecio(ventasHoy)}</p>
                <p className="inicio-card-subtexto">
                  {cargando ? (
                    <span className="inicio-punteo-cargando">Actualizando</span>
                  ) : (
                    <>
                      Abierta desde las {cajaInfo ? formatearHora(cajaInfo.abierta_en) : '--:--'} ·{' '}
                      <Link to="/admin/cajas" className="inicio-link-caja">ver caja →</Link>
                    </>
                  )}
                </p>
                {!cargando && (
                  <div className="inicio-caja-stats">
                    <div>
                      <span>Ticket promedio</span>
                      <strong>{formatearPrecio(ticketPromedio)}</strong>
                    </div>
                    <div>
                      <span>Pedidos</span>
                      <strong>{totalPedidosCaja}</strong>
                    </div>
                  </div>
                )}
                <div className="inicio-caja-acciones">
                  <button type="button" className="inicio-btn-cerrar-caja" onClick={() => setMostrarCerrarCaja(true)}>
                    Cerrar caja
                  </button>
                  <button type="button" className="btn-vibrante inicio-btn-caja" onClick={() => setMostrarNuevoPedido(true)}>
                    + Nuevo pedido
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Tarjeta: Gastos fijos por pagar — solo si hay alguno cargado */}
          {!cargando && !error && gastosFijos.length > 0 && (
            <div className={`inicio-card inicio-card-gastos-fijos ${hayVencidos ? 'inicio-card-alerta' : ''}`}>
              <div className="inicio-card-encabezado">
                <span className="inicio-card-icono">📅</span>
                <h3 className="inicio-card-titulo">Gastos fijos por pagar</h3>
                {porVencer.length > 0 && (
                  <span className="inicio-contador-pedidos inicio-contador-alerta">{porVencer.length}</span>
                )}
              </div>

              <p className="inicio-monto-grande">{formatearPrecio(totalGastosFijos)}</p>

              {faltaJuntar > 0 ? (
                <p className="inicio-card-subtexto inicio-falta-juntar">
                  Te faltan <strong>{formatearPrecio(faltaJuntar)}</strong> para cubrirlos con la caja de hoy.
                </p>
              ) : (
                <p className="inicio-card-subtexto inicio-cubierto">
                  ✅ La caja de hoy ya cubre todos los gastos fijos.
                </p>
              )}

              <div className="inicio-gastos-fijos-lista">
                {gastosFijos.slice(0, 4).map((fijo) => (
                  <div key={fijo.id} className="inicio-gasto-fijo-item">
                    <div className="inicio-gasto-fijo-info">
                      <strong>{fijo.nombre}</strong>
                      <span className={fijo.esta_por_vencer ? 'inicio-gasto-fijo-alerta' : ''}>
                        {fijo.dias_restantes < 0
                          ? `¡Vencido hace ${Math.abs(fijo.dias_restantes)} ${Math.abs(fijo.dias_restantes) === 1 ? 'día' : 'días'}!`
                          : fijo.dias_restantes === 0
                            ? '¡Vence hoy!'
                            : fijo.dias_restantes === 1
                              ? 'Vence mañana'
                              : `Faltan ${fijo.dias_restantes} días`}
                      </span>
                    </div>
                    <span className="inicio-gasto-fijo-monto">{formatearPrecio(fijo.monto)}</span>
                  </div>
                ))}
              </div>

              <p className="inicio-card-subtexto">
                <Link to="/admin/gastos" className="inicio-link-caja">gestionar gastos fijos →</Link>
              </p>
            </div>
          )}
        </div>

        <div className="inicio-card inicio-card-pedidos">
          <div className="inicio-card-encabezado">
            <span className="inicio-card-icono">🧾</span>
            <h3 className="inicio-card-titulo">Pedidos de las últimas 24 horas</h3>
            {!cargando && !error && pedidosRecientes.length > 0 && (
              <span className="inicio-contador-pedidos">{pedidosRecientes.length}</span>
            )}
          </div>

          {cargando ? (
            <p className="estado-vacio">Cargando...</p>
          ) : error ? (
            <p className="estado-vacio">{error}</p>
          ) : pedidosRecientes.length === 0 ? (
            <div className="estado-vacio">
              <p>Todavía no entró ningún pedido en las últimas 24 horas.</p>
            </div>
          ) : (
            <div className="pedidos-grid inicio-pedidos-grid">
              {pedidosRecientes.map((pedido) => (
                <PedidoCard
                  key={pedido.id}
                  pedido={pedido}
                  onCobrar={(p) => setModalPago(p.id)}
                  onDetalle={setModalEnvio}
                  onImprimir={imprimirPedido}
                  onEliminar={eliminarPedidoReciente}
                  onAvanzarEstado={avanzarEstadoReciente}
                  onCancelar={cancelarPedidoReciente}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {mostrarAbrirCaja && (
        <AbrirCajaModal
          onClose={() => setMostrarAbrirCaja(false)}
          onSaved={() => { setMostrarAbrirCaja(false); cargarInicio(); }}
        />
      )}

      {mostrarCerrarCaja && cajaInfo && (
        <CerrarCajaModal
          caja={{ id: cajaInfo.id, abierta_en: cajaInfo.abierta_en, total_ventas: ventasHoy, total_pedidos: totalPedidosCaja }}
          onClose={() => setMostrarCerrarCaja(false)}
          onSaved={() => { setMostrarCerrarCaja(false); cargarInicio(); }}
        />
      )}

      {mostrarNuevoPedido && (
        <PedidoModal
          productos={productos}
          categorias={categorias}
          localidades={localidades}
          onClose={() => setMostrarNuevoPedido(false)}
          onSaved={() => { setMostrarNuevoPedido(false); cargarInicio(); }}
        />
      )}

      {modalPago && (
        <PedidoPagoModal
          pedidoId={modalPago}
          onClose={() => setModalPago(null)}
          onSaved={cargarInicio}
        />
      )}

      {modalEnvio && (
        <PedidoEnvioDescuentoModal
          pedido={modalEnvio}
          localidades={localidades}
          onClose={() => setModalEnvio(null)}
          onSaved={() => { setModalEnvio(null); cargarInicio(); }}
        />
      )}

      <style>
        {`
          .inicio-resumen-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
          }

          .inicio-card {
            position: relative;
            background: linear-gradient(160deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 60%),
                        var(--card-bg, #1a1410);
            border: 1px solid rgba(255, 158, 0, 0.15);
            border-radius: 16px;
            padding: 24px 26px;
            overflow: hidden;
            transition: border-color 0.25s ease, transform 0.25s ease;
          }

          .inicio-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(180deg, rgba(255,158,0,0.9), rgba(255,158,0,0.1));
          }

          .inicio-card:hover {
            border-color: rgba(255, 158, 0, 0.35);
          }

          .inicio-card-encabezado {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 4px;
          }

          .inicio-card-icono {
            font-size: 1.1rem;
            filter: drop-shadow(0 0 6px rgba(255, 158, 0, 0.35));
          }

          .inicio-card-titulo {
            margin: 0;
            font-size: 0.85rem;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.65);
          }

          .inicio-card-subtexto {
            color: var(--text-muted, rgba(255,255,255,0.5));
            margin-top: 10px;
            font-size: 0.85rem;
          }

          .inicio-fecha-capitalizada {
            text-transform: capitalize;
          }

          .inicio-reloj-numeros {
            font-family: 'Courier New', ui-monospace, monospace;
            font-size: 1.9rem;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            letter-spacing: 1px;
            margin: 12px 0 0;
            color: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: baseline;
          }

          .inicio-reloj-separador {
            color: rgba(255, 255, 255, 0.35);
            margin: 0 1px;
          }

          .inicio-reloj-segundos {
            font-size: 1.9rem;
            color: rgba(255, 255, 255, 0.9);
          }

          .inicio-monto-grande {
            font-size: 2.4rem;
            font-weight: 800;
            margin: 12px 0 0;
            background: linear-gradient(90deg, #ffb347, #ff9e00);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }

          .inicio-sin-caja {
            font-size: 1.5rem;
            font-weight: 800;
            margin: 12px 0 0;
            color: rgba(255, 255, 255, 0.55);
          }

          .inicio-btn-caja {
            margin-top: 16px;
            font-size: 0.85rem;
            padding: 10px 18px;
          }

          .inicio-caja-acciones {
            display: flex;
            align-items: center;
            gap: 14px;
            margin-top: 16px;
          }

          .inicio-btn-cerrar-caja {
            background: none;
            border: none;
            color: var(--text-muted, rgba(255,255,255,0.5));
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            padding: 6px 4px;
          }
          .inicio-btn-cerrar-caja:hover {
            color: #f87171;
          }

          .inicio-link-caja {
            color: #ff9e00;
            text-decoration: none;
            font-weight: 600;
          }
          .inicio-link-caja:hover {
            text-decoration: underline;
          }

          .inicio-punteo-cargando::after {
            content: '...';
            animation: inicioPunteo 1.2s steps(4, end) infinite;
          }

          .inicio-caja-stats {
            display: flex;
            gap: 24px;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
          }

          .inicio-caja-stats div {
            display: flex;
            flex-direction: column;
            gap: 2px;
          }

          .inicio-caja-stats span {
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            color: var(--text-muted, rgba(255,255,255,0.5));
          }

          .inicio-caja-stats strong {
            font-size: 1.05rem;
            color: rgba(255, 255, 255, 0.9);
          }

          .inicio-card-confirmar {
            border-color: rgba(251, 191, 36, 0.35);
          }

          .inicio-contador-confirmar {
            background: rgba(251, 191, 36, 0.18);
            color: #fbbf24;
            border-color: rgba(251, 191, 36, 0.4);
          }

          .inicio-confirmar-aviso {
            margin-top: 4px;
            margin-bottom: 18px;
          }

          .inicio-pedido-confirmar-item {
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            justify-content: space-between;
            gap: 14px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 12px;
            padding: 14px 18px;
          }

          .inicio-pedido-confirmar-acciones {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .inicio-btn-cancelar {
            background: none;
            border: none;
            color: var(--text-muted, rgba(255,255,255,0.5));
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            padding: 6px 8px;
          }
          .inicio-btn-cancelar:hover {
            color: #f87171;
          }

          .inicio-btn-confirmar {
            font-size: 0.85rem;
            padding: 9px 16px;
          }

          @keyframes inicioPunteo {
            0% { content: ''; }
            25% { content: '.'; }
            50% { content: '..'; }
            75% { content: '...'; }
            100% { content: ''; }
          }

          .inicio-card-pedidos .inicio-card-encabezado {
            margin-bottom: 18px;
          }

          .inicio-contador-pedidos {
            margin-left: auto;
            background: rgba(255, 158, 0, 0.15);
            color: #ff9e00;
            border: 1px solid rgba(255, 158, 0, 0.35);
            border-radius: 20px;
            padding: 2px 12px;
            font-size: 0.8rem;
            font-weight: 700;
          }

          .inicio-pedidos-lista {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .inicio-pedido-info {
            flex: 1;
            min-width: 0;
          }

          .inicio-pedido-info-top {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .inicio-pedido-info-top h4 {
            margin: 0;
            font-size: 0.95rem;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .inicio-pedido-info-bottom {
            display: flex;
            gap: 14px;
            margin-top: 4px;
            font-size: 0.8rem;
            color: var(--text-muted, rgba(255,255,255,0.5));
          }

          .inicio-pedidos-grid {
            margin-top: 4px;
          }

          .inicio-confirmar-lista {
            max-height: 420px;
            overflow-y: auto;
            padding-right: 4px;
          }

          .inicio-card-alerta {
            border-color: rgba(239, 68, 68, 0.4);
          }
          .inicio-card-alerta::before {
            background: linear-gradient(180deg, rgba(239,68,68,0.9), rgba(239,68,68,0.1));
          }

          .inicio-contador-alerta {
            background: rgba(239, 68, 68, 0.18);
            color: #f87171;
            border-color: rgba(239, 68, 68, 0.4);
          }

          .inicio-falta-juntar {
            color: #fbbf24;
          }
          .inicio-falta-juntar strong {
            color: #fbbf24;
          }

          .inicio-cubierto {
            color: #4ade80;
          }

          .inicio-gastos-fijos-lista {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 16px;
            padding-top: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.08);
          }

          .inicio-gasto-fijo-item {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
          }

          .inicio-gasto-fijo-info {
            display: flex;
            flex-direction: column;
            gap: 1px;
            min-width: 0;
          }

          .inicio-gasto-fijo-info strong {
            font-size: 0.9rem;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .inicio-gasto-fijo-info span {
            font-size: 0.76rem;
            color: var(--text-muted, rgba(255,255,255,0.5));
          }

          .inicio-gasto-fijo-alerta {
            color: #f87171 !important;
            font-weight: 700;
          }

          .inicio-gasto-fijo-monto {
            font-size: 0.9rem;
            font-weight: 700;
            white-space: nowrap;
          }
        `}
      </style>
    </>
  );
}