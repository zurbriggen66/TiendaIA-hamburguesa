import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import AbrirCajaModal from './AbrirCajaModal';
import CerrarCajaModal from './CerrarCajaModal';
import CajaDetalleModal from './CajaDetalleModal';
import DesgloseMetodos from './DesgloseMetodos';
import MovimientosCaja from './MovimientosCaja';
import MoverEfectivoModal from './MoverEfectivoModal';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const formatearFechaHora = (fecha) =>
  new Date(fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const formatearDia = (dia) =>
  new Date(`${dia}T00:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' });

/** Tarjeta de cifra: la barra de color de la izquierda es la única decoración. */
function Kpi({ etiqueta, valor, detalle, icono, tono = 'neutro' }) {
  return (
    <div className={`kpi kpi-${tono}`}>
      <div className="kpi-texto">
        <span className="kpi-etiqueta">{etiqueta}</span>
        <strong className="kpi-valor">{valor}</strong>
        {detalle && <span className="kpi-detalle">{detalle}</span>}
      </div>
      <span className="kpi-icono" aria-hidden="true">{icono}</span>
    </div>
  );
}

export default function CajasPage() {
  const navigate = useNavigate();
  const [cajaActual, setCajaActual] = useState(undefined); // undefined = cargando, null = ninguna abierta
  const [historial, setHistorial] = useState([]);
  const [movimientos, setMovimientos] = useState([]);
  const [cargandoMovimientos, setCargandoMovimientos] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [mostrarAbrir, setMostrarAbrir] = useState(false);
  const [mostrarCerrar, setMostrarCerrar] = useState(false);
  const [cajaDetalleId, setCajaDetalleId] = useState(null);
  const [moverEfectivo, setMoverEfectivo] = useState(null); // 'ingreso' | 'retiro' | null
  const [tab, setTab] = useState('resumen');
  // '' = todos los meses. Con cuatro turnos no molesta, pero al año son 300 y sin
  // filtro no hay forma de encontrar un día puntual.
  const [mes, setMes] = useState('');

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [resActual, resHistorial] = await Promise.all([
        api.get('/cajas/actual/'),
        api.get('/cajas/', { params: mes ? { mes } : {} }),
      ]);
      setCajaActual(resActual.data);
      setHistorial(resHistorial.data);
    } catch (error) {
      console.error('Error al cargar las cajas:', error);
    } finally {
      setCargando(false);
    }
  }, [mes]);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  // Los movimientos se piden aparte: son del turno abierto y cambian con cada cobro,
  // mientras que el historial de cajas cerradas casi nunca cambia.
  const cargarMovimientos = useCallback(async (cajaId) => {
    if (!cajaId) {
      setMovimientos([]);
      return;
    }
    setCargandoMovimientos(true);
    try {
      const { data } = await api.get(`/cajas/${cajaId}/movimientos/`);
      setMovimientos(data);
    } catch (error) {
      console.error('Error al cargar los movimientos:', error);
      setMovimientos([]);
    } finally {
      setCargandoMovimientos(false);
    }
  }, []);

  useEffect(() => {
    cargarMovimientos(cajaActual?.id);
  }, [cajaActual?.id, cajaActual?.total_cobrado, cargarMovimientos]);

  const historialSinActual = historial.filter((c) => c.id !== cajaActual?.id);

  const eliminarCaja = async (caja) => {
    if (!window.confirm(`¿Eliminar la caja del ${formatearDia(caja.dia)}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/cajas/${caja.id}/`);
      cargarDatos();
    } catch (error) {
      console.error('Error al eliminar la caja:', error);
      toast.error('No se pudo eliminar la caja.');
    }
  };

  const porCobrar = cajaActual
    ? Number(cajaActual.total_ventas) - Number(cajaActual.total_cobrado)
    : 0;

  return (
    <div className="cajas-page">
      <header className="pagina-header">
        <div>
          <h2>Caja</h2>
          <p className="pagina-subtitulo">Efectivo, cobros y gastos del turno abierto.</p>
        </div>
        <div className="pagina-header-acciones">
          {cajaActual && (
            <button type="button" className="btn-vibrante" onClick={() => setMostrarCerrar(true)}>
              Cerrar caja
            </button>
          )}
          <div className="avatar">A</div>
        </div>
      </header>

      <div className="scroll-area">
        {cargando ? (
          <p className="estado-vacio">Cargando...</p>
        ) : (
          <>
            {cajaActual ? (
              <>
                <div className="kpi-grid">
                  <Kpi
                    etiqueta="Efectivo en el cajón"
                    valor={formatearPrecio(cajaActual.efectivo_en_cajon)}
                    detalle={
                      Number(cajaActual.descuadre_efectivo) > 0
                        ? `⚠️ Las salidas superan lo que entró por ${formatearPrecio(cajaActual.descuadre_efectivo)}`
                        : 'Debería haber en el cajón'
                    }
                    icono="👛"
                    tono={Number(cajaActual.descuadre_efectivo) > 0 ? 'alerta' : 'exito'}
                  />
                  <Kpi
                    etiqueta="Cobrado del turno"
                    valor={formatearPrecio(cajaActual.total_cobrado)}
                    detalle={`${cajaActual.total_pedidos} pedido${cajaActual.total_pedidos === 1 ? '' : 's'}`}
                    icono="📈"
                    tono="info"
                  />
                  <Kpi
                    etiqueta="Gastos del turno"
                    valor={formatearPrecio(cajaActual.total_gastos)}
                    detalle="Cargados en este turno"
                    icono="🧾"
                    tono="alerta"
                  />
                </div>

                <div className="tabs">
                  <button
                    type="button"
                    className={`tab${tab === 'resumen' ? ' tab-activa' : ''}`}
                    onClick={() => setTab('resumen')}
                  >
                    Resumen
                  </button>
                  <button
                    type="button"
                    className={`tab${tab === 'historial' ? ' tab-activa' : ''}`}
                    onClick={() => setTab('historial')}
                  >
                    Historial de cajas
                  </button>
                </div>
              </>
            ) : (
              <div className="panel panel-vacio">
                <span className="panel-vacio-icono" aria-hidden="true">🔒</span>
                <div className="panel-vacio-texto">
                  <strong>No hay ninguna caja abierta</strong>
                  <p>Abrí la caja para empezar a registrar el turno.</p>
                </div>
                <button type="button" className="btn-vibrante" onClick={() => setMostrarAbrir(true)}>
                  Abrir caja
                </button>
              </div>
            )}

            {cajaActual && tab === 'resumen' && (
              <div className="caja-columnas">
                <div className="caja-columna">
                  <section className="panel">
                    <h3 className="panel-titulo">Acciones rápidas</h3>
                    <div className="acciones-rapidas">
                      <button type="button" className="accion-rapida" onClick={() => navigate('/admin/pedidos')}>
                        <span className="accion-rapida-icono accion-exito" aria-hidden="true">💰</span>
                        <span className="accion-rapida-texto">
                          <strong>Cobrar pedido</strong>
                          <span>Registrar el pago de un pedido</span>
                        </span>
                      </button>
                      <button type="button" className="accion-rapida" onClick={() => navigate('/admin/gastos')}>
                        <span className="accion-rapida-icono accion-alerta" aria-hidden="true">🧾</span>
                        <span className="accion-rapida-texto">
                          <strong>Nuevo gasto</strong>
                          <span>Sale del cajón del turno</span>
                        </span>
                      </button>
                      <button type="button" className="accion-rapida" onClick={() => setMoverEfectivo('ingreso')}>
                        <span className="accion-rapida-icono accion-info" aria-hidden="true">💵</span>
                        <span className="accion-rapida-texto">
                          <strong>Mover efectivo</strong>
                          <span>Agregar o retirar del cajón</span>
                        </span>
                      </button>
                      <button type="button" className="accion-rapida" onClick={() => setMostrarCerrar(true)}>
                        <span className="accion-rapida-icono accion-exito" aria-hidden="true">🔐</span>
                        <span className="accion-rapida-texto">
                          <strong>Cerrar y arquear</strong>
                          <span>Contar el cajón y cerrar</span>
                        </span>
                      </button>
                    </div>
                  </section>

                  <section className="panel">
                    <div className="panel-encabezado">
                      <h3 className="panel-titulo">Movimientos del turno</h3>
                      <span className="panel-subtitulo">
                        {formatearDia(cajaActual.dia)} · desde las {formatearFechaHora(cajaActual.abierta_en)}
                      </span>
                    </div>
                    <MovimientosCaja movimientos={movimientos} cargando={cargandoMovimientos} />
                  </section>
                </div>

                <div className="caja-columna">
                  <section className="panel">
                    <h3 className="panel-titulo">Estado del turno</h3>
                    <dl className="datos-lista">
                      <div>
                        <dt>Fondo inicial · {cajaActual.metodo_inicial_label}</dt>
                        <dd>{formatearPrecio(cajaActual.monto_inicial)}</dd>
                      </div>
                      <div>
                        <dt>Vendido</dt>
                        <dd>{formatearPrecio(cajaActual.total_ventas)}</dd>
                      </div>
                      <div>
                        <dt>Cobrado</dt>
                        <dd>{formatearPrecio(cajaActual.total_cobrado)}</dd>
                      </div>
                      {Number(cajaActual.total_propinas) > 0 && (
                        <div>
                          <dt>Propinas</dt>
                          <dd>{formatearPrecio(cajaActual.total_propinas)}</dd>
                        </div>
                      )}
                    </dl>
                    {/* "Vendido" incluye pedidos confirmados que todavía no se cobraron.
                        Leerlo como plata que tiene que estar en el cajón es lo que hacía
                        que la caja nunca cerrara. */}
                    {porCobrar > 0 && (
                      <p className="caja-por-cobrar">
                        ⏳ Quedan {formatearPrecio(porCobrar)} sin cobrar
                      </p>
                    )}
                  </section>

                  <section className="panel">
                    <h3 className="panel-titulo">Dónde está la plata</h3>
                    <DesgloseMetodos desglose={cajaActual.desglose} titulo={null} />
                    <p className="panel-pie">
                      El efectivo se cuenta del cajón; el resto se compara contra el banco o Mercado Pago.
                    </p>
                  </section>
                </div>
              </div>
            )}

            {(!cajaActual || tab === 'historial') && (
              <section className="panel">
                <div className="panel-encabezado">
                  <h3 className="panel-titulo">Historial de cajas</h3>
                  <div className="caja-historial-filtro">
                    <input
                      type="month"
                      className="input-vibrante"
                      value={mes}
                      onChange={(e) => setMes(e.target.value)}
                      aria-label="Filtrar por mes"
                    />
                    {mes && (
                      <button type="button" className="btn-secundario" onClick={() => setMes('')}>
                        Ver todas
                      </button>
                    )}
                  </div>
                </div>

                {historialSinActual.length === 0 ? (
                  <p className="estado-vacio-chico">
                    {mes ? 'No hubo cajas en ese mes.' : 'Todavía no hay cajas cerradas.'}
                  </p>
                ) : (
                  <div className="cajas-historial">
                    {historialSinActual.map((caja) => (
                      <div key={caja.id} className="caja-historial-fila">
                        <button
                          type="button"
                          className="caja-historial-fila-link"
                          onClick={() => setCajaDetalleId(caja.id)}
                        >
                          <div className="caja-historial-horario">
                            <strong>{formatearDia(caja.dia)}</strong>
                            <span className="caja-historial-horario-detalle">
                              {formatearFechaHora(caja.abierta_en)}
                              {caja.cerrada_en && <> → {formatearFechaHora(caja.cerrada_en)}</>}
                            </span>
                          </div>
                          <span className="caja-historial-pedidos">{caja.total_pedidos} pedidos</span>
                          {caja.diferencia_efectivo === null ? (
                            <span className="badge-arqueo badge-arqueo-neutro" title="Se cerró sin contar el cajón">
                              Sin arquear
                            </span>
                          ) : (
                            <span
                              className={`badge-arqueo ${Number(caja.diferencia_efectivo) === 0 ? 'badge-arqueo-ok' : 'badge-arqueo-mal'}`}
                              title="Arqueo del efectivo al cerrar"
                            >
                              {Number(caja.diferencia_efectivo) === 0
                                ? '✅ Cuadró'
                                : `⚠️ ${Number(caja.diferencia_efectivo) > 0 ? '+' : '−'}${formatearPrecio(Math.abs(Number(caja.diferencia_efectivo)))}`}
                            </span>
                          )}
                          <span className="caja-historial-total">{formatearPrecio(caja.total_cobrado)}</span>
                        </button>
                        <button
                          type="button"
                          className="btn-eliminar-caja"
                          title="Eliminar caja"
                          onClick={() => eliminarCaja(caja)}
                        >
                          🗑
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      {mostrarAbrir && (
        <AbrirCajaModal
          onClose={() => setMostrarAbrir(false)}
          onSaved={() => { setMostrarAbrir(false); cargarDatos(); }}
        />
      )}

      {mostrarCerrar && cajaActual && (
        <CerrarCajaModal
          caja={cajaActual}
          onClose={() => setMostrarCerrar(false)}
          onSaved={() => { setMostrarCerrar(false); cargarDatos(); }}
        />
      )}

      {moverEfectivo && cajaActual && (
        <MoverEfectivoModal
          caja={cajaActual}
          tipoInicial={moverEfectivo}
          onClose={() => setMoverEfectivo(null)}
          onSaved={() => { setMoverEfectivo(null); cargarDatos(); }}
        />
      )}

      {cajaDetalleId && (
        <CajaDetalleModal cajaId={cajaDetalleId} onClose={() => setCajaDetalleId(null)} />
      )}
    </div>
  );
}
