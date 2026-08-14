import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import AbrirCajaModal from './AbrirCajaModal';
import CerrarCajaModal from './CerrarCajaModal';
import CajaDetalleModal from './CajaDetalleModal';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const formatearFechaHora = (fecha) =>
  new Date(fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const formatearDia = (dia) =>
  new Date(`${dia}T00:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' });

export default function CajasPage() {
  const [cajaActual, setCajaActual] = useState(undefined); // undefined = cargando, null = ninguna abierta
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarAbrir, setMostrarAbrir] = useState(false);
  const [mostrarCerrar, setMostrarCerrar] = useState(false);
  const [cajaDetalleId, setCajaDetalleId] = useState(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [resActual, resHistorial] = await Promise.all([
        api.get('/cajas/actual/'),
        api.get('/cajas/'),
      ]);
      setCajaActual(resActual.data);
      setHistorial(resHistorial.data);
    } catch (error) {
      console.error('Error al cargar las cajas:', error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const historialSinActual = historial.filter((c) => c.id !== cajaActual?.id);

  const eliminarCaja = async (caja) => {
    if (!window.confirm(`¿Eliminar la caja del ${formatearDia(caja.dia)}? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/cajas/${caja.id}/`);
      cargarDatos();
    } catch (error) {
      console.error('Error al eliminar la caja:', error);
      window.alert('No se pudo eliminar la caja.');
    }
  };

  return (
    <div className="cajas-page">
      <header className="main-header">
        <h2>Cajas</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        {cargando ? (
          <p className="estado-vacio">Cargando...</p>
        ) : cajaActual ? (
          <div className="caja-banner caja-banner-abierta">
            <div className="caja-banner-info">
              <span className="caja-banner-estado">🟢 Caja del {formatearDia(cajaActual.dia)}</span>
              <span className="caja-banner-detalle">abierta desde las {formatearFechaHora(cajaActual.abierta_en)}</span>
            </div>
            <div className="caja-banner-stats">
              <div>
                <span>Ventas</span>
                <strong>{formatearPrecio(cajaActual.total_ventas)}</strong>
              </div>
              <div>
                <span>Pedidos</span>
                <strong>{cajaActual.total_pedidos}</strong>
              </div>
            </div>
            <button type="button" className="btn-vibrante btn-cerrar-caja" onClick={() => setMostrarCerrar(true)}>
              Cerrar caja
            </button>
          </div>
        ) : (
          <div className="caja-banner caja-banner-cerrada">
            <div className="caja-banner-info">
              <span className="caja-banner-estado">🔴 No hay ninguna caja abierta</span>
              <span className="caja-banner-detalle">Abrí la caja para empezar a registrar el turno.</span>
            </div>
            <button type="button" className="btn-vibrante" onClick={() => setMostrarAbrir(true)}>
              Abrir caja
            </button>
          </div>
        )}

        <div className="seccion-header">
          <h3>Historial de cajas</h3>
        </div>

        {!cargando && historialSinActual.length === 0 ? (
          <div className="estado-vacio">
            <p>Todavía no hay cajas cerradas.</p>
          </div>
        ) : (
          <div className="cajas-historial">
            {historialSinActual.map((caja) => (
              <div key={caja.id} className="caja-historial-fila">
                <button
                  type="button"
                  className="caja-historial-fila-link"
                  onClick={() => setCajaDetalleId(caja.id)}
                >
                  <span className={`badge-caja ${caja.esta_abierta ? 'badge-caja-abierta' : 'badge-caja-cerrada'}`}>
                    {caja.esta_abierta ? 'Abierta' : 'Cerrada'}
                  </span>
                  <div className="caja-historial-horario">
                    <strong>{formatearDia(caja.dia)}</strong>
                    <span className="caja-historial-horario-detalle">
                      {' '}· {formatearFechaHora(caja.abierta_en)}
                      {caja.cerrada_en && <> → {formatearFechaHora(caja.cerrada_en)}</>}
                    </span>
                  </div>
                  <span className="caja-historial-pedidos">{caja.total_pedidos} pedidos</span>
                  <span className="caja-historial-total">{formatearPrecio(caja.total_ventas)}</span>
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

      {cajaDetalleId && (
        <CajaDetalleModal cajaId={cajaDetalleId} onClose={() => setCajaDetalleId(null)} />
      )}
    </div>
  );
}
