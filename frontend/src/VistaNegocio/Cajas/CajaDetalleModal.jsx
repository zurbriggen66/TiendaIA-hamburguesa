import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import BarrasDesglose, { formatearPrecio } from '../Estadisticas/BarrasDesglose';

const formatearFechaHora = (fecha) =>
  new Date(fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

const formatearDia = (dia) =>
  new Date(`${dia}T00:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' });

export default function CajaDetalleModal({ cajaId, onClose }) {
  const [caja, setCaja] = useState(null);
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let cancelado = false;
    const cargar = async () => {
      setCargando(true);
      try {
        const [resCaja, resEstadisticas] = await Promise.all([
          api.get(`/cajas/${cajaId}/`),
          api.get('/estadisticas/', { params: { caja: cajaId } }),
        ]);
        if (cancelado) return;
        setCaja(resCaja.data);
        setDatos(resEstadisticas.data);
      } catch (error) {
        console.error('Error al cargar la caja:', error);
      } finally {
        if (!cancelado) setCargando(false);
      }
    };
    cargar();
    return () => { cancelado = true; };
  }, [cajaId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Estadísticas de la caja</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        {cargando || !caja || !datos ? (
          <p className="estado-vacio">Cargando...</p>
        ) : (
          <>
            <div className="caja-banner caja-banner-cerrada">
              <div className="caja-banner-info">
                <span className="caja-banner-estado">{caja.esta_abierta ? '🟢' : '🔴'} Caja del {formatearDia(caja.dia)}</span>
                <span className="caja-banner-detalle">
                  {formatearFechaHora(caja.abierta_en)}
                  {caja.cerrada_en && <> → {formatearFechaHora(caja.cerrada_en)}</>}
                </span>
              </div>
            </div>

            <div className="resumen-grid">
              <div className="resumen-tile resumen-tile-servicios">
                <span>Ventas de la caja</span>
                <strong>{formatearPrecio(datos.ventas_totales)}</strong>
              </div>
              <div className="resumen-tile resumen-tile-insumos">
                <span>Ticket promedio</span>
                <strong>{formatearPrecio(datos.ticket_promedio)}</strong>
              </div>
              <div className="resumen-tile resumen-tile-total">
                <span>Pedidos</span>
                <strong>{datos.total_pedidos}</strong>
              </div>
            </div>

            <div className="seccion-header">
              <h3>Con qué te pagaron las ventas</h3>
            </div>
            {Number(datos.ventas_totales) === 0 ? (
              <p className="estado-vacio-chico">No hubo ventas en esta caja.</p>
            ) : (
              <BarrasDesglose
                filas={(datos.ventas_por_metodo || []).map((f) => ({
                  clave: f.metodo,
                  etiqueta: f.metodo_label,
                  total: f.total,
                }))}
                total={Number(datos.ventas_totales)}
              />
            )}

            <div className="modal-actions">
              <button type="button" className="btn-secundario" onClick={onClose}>Volver</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
