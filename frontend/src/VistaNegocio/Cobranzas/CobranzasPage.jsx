import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import PedidoPagoModal from '../Pedidos/PedidoPagoModal';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const ETIQUETA_COBRO = {
  parcial: '🟡 Parcial',
  pendiente: '🔴 Pendiente',
};

const VARIANTES_TILE = [
  'resumen-tile-servicios',
  'resumen-tile-insumos',
  'resumen-tile-sueldos',
  'resumen-tile-otros',
  'resumen-tile-ganancia-positiva',
];

const pad2 = (n) => String(n).padStart(2, '0');
// OJO: no usar toISOString() acá — convierte a UTC y en Argentina (UTC-3) eso hace
// que "hoy" salte al día siguiente a partir de las 21:00 hora local.
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const mesActualISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};

const primerYUltimoDiaDelMes = (mesStr) => {
  const [anio, mes] = mesStr.split('-').map(Number);
  const ultimoDia = new Date(anio, mes, 0).getDate();
  return { primero: `${mesStr}-01`, ultimo: `${mesStr}-${String(ultimoDia).padStart(2, '0')}` };
};

const formatearFechaHoraCaja = (fecha) =>
  new Date(fecha).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

export default function CobranzasPage() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState('general');
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActualISO());
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoyISO());
  const [cajas, setCajas] = useState([]);
  const [cajaSeleccionada, setCajaSeleccionada] = useState('');
  const [modalPago, setModalPago] = useState(null);

  useEffect(() => {
    api.get('/cajas/').then(({ data }) => {
      setCajas(data);
      setCajaSeleccionada((actual) => actual || (data[0] ? String(data[0].id) : ''));
    }).catch((error) => console.error('Error al cargar las cajas:', error));
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      let params = {};
      if (tab === 'mensual') {
        const { primero, ultimo } = primerYUltimoDiaDelMes(mesSeleccionado);
        params = { desde: primero, hasta: ultimo };
      } else if (tab === 'dia') {
        params = { desde: diaSeleccionado, hasta: diaSeleccionado };
      } else if (tab === 'caja') {
        if (!cajaSeleccionada) {
          setDatos(null);
          setCargando(false);
          return;
        }
        params = { caja: cajaSeleccionada };
      }
      const { data } = await api.get('/cobranzas/', { params });
      setDatos(data);
    } catch (error) {
      console.error('Error al cargar cobranzas:', error);
    } finally {
      setCargando(false);
    }
  }, [tab, mesSeleccionado, diaSeleccionado, cajaSeleccionada]);

  useEffect(() => {
    cargar();
  }, [cargar]);

  return (
    <div className="cobranzas-page">
      <header className="main-header">
        <h2>Cobranzas</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        <div className="tabs-bar">
          <button type="button" className={`tab-boton ${tab === 'general' ? 'tab-activo' : ''}`} onClick={() => setTab('general')}>
            General
          </button>
          <button type="button" className={`tab-boton ${tab === 'mensual' ? 'tab-activo' : ''}`} onClick={() => setTab('mensual')}>
            Mensual
          </button>
          <button type="button" className={`tab-boton ${tab === 'dia' ? 'tab-activo' : ''}`} onClick={() => setTab('dia')}>
            Por día
          </button>
          <button type="button" className={`tab-boton ${tab === 'caja' ? 'tab-activo' : ''}`} onClick={() => setTab('caja')}>
            Por caja
          </button>
        </div>

        {tab === 'mensual' && (
          <div className="form-group estadisticas-selector-periodo">
            <label className="form-label">Mes</label>
            <input
              type="month"
              className="input-vibrante"
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
            />
          </div>
        )}

        {tab === 'dia' && (
          <div className="form-group estadisticas-selector-periodo">
            <label className="form-label">Día</label>
            <input
              type="date"
              className="input-vibrante"
              value={diaSeleccionado}
              onChange={(e) => setDiaSeleccionado(e.target.value)}
            />
          </div>
        )}

        {tab === 'caja' && (
          <div className="form-group estadisticas-selector-periodo">
            <label className="form-label">Caja</label>
            {cajas.length === 0 ? (
              <p className="estado-vacio-chico">Todavía no hay ninguna caja registrada.</p>
            ) : (
              <select
                className="input-vibrante"
                value={cajaSeleccionada}
                onChange={(e) => setCajaSeleccionada(e.target.value)}
              >
                {cajas.map((c) => (
                  <option key={c.id} value={c.id}>
                    {formatearFechaHoraCaja(c.abierta_en)}
                    {c.cerrada_en ? ` → ${formatearFechaHoraCaja(c.cerrada_en)}` : ' (abierta)'}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {cargando || !datos ? (
          <p className="estado-vacio">Cargando...</p>
        ) : (
          <>
            <div className="resumen-grid">
              <div className="resumen-tile resumen-tile-total">
                <span>Total cobrado</span>
                <strong>{formatearPrecio(datos.total_cobrado)}</strong>
              </div>
              {datos.por_metodo.map((m, i) => (
                <div key={m.metodo} className={`resumen-tile ${VARIANTES_TILE[i % VARIANTES_TILE.length]}`}>
                  <span>{m.metodo_label}</span>
                  <strong>{formatearPrecio(m.total)}</strong>
                </div>
              ))}
            </div>

            <div className="seccion-header">
              <h3>Pedidos con cobro pendiente</h3>
            </div>
            {datos.pedidos_pendientes.length === 0 ? (
              <p className="estado-vacio-chico">No hay pedidos pendientes de cobro. 🎉</p>
            ) : (
              <div className="cobranza-pendientes-lista">
                {datos.pedidos_pendientes.map((p) => (
                  <div key={p.id} className="cobranza-pendiente-fila">
                    <span className={`badge-cobro cobro-${p.estado_cobro}`}>{ETIQUETA_COBRO[p.estado_cobro]}</span>
                    <div className="cobranza-pendiente-info">
                      <strong>{p.cliente || `Pedido #${p.id}`}</strong>
                      <span>Total {formatearPrecio(p.total)} · Cobrado {formatearPrecio(p.cobrado)}</span>
                    </div>
                    <span className="cobranza-pendiente-falta">Falta {formatearPrecio(p.falta)}</span>
                    <button type="button" className="btn-vibrante" onClick={() => setModalPago(p.id)}>
                      💰 Cobrar
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {modalPago && (
        <PedidoPagoModal
          pedidoId={modalPago}
          onClose={() => setModalPago(null)}
          onSaved={cargar}
        />
      )}
    </div>
  );
}
