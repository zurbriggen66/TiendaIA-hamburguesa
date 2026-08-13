import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import PedidoModal from './PedidoModal';
import PedidoCard from './PedidoCard';
import LocalidadModal from './LocalidadModal';
import PedidoEnvioDescuentoModal from './PedidoEnvioDescuentoModal';
import PedidoPagoModal from './PedidoPagoModal';
import { imprimirPedido } from '../../utils/impresion';

const ORDEN_ESTADOS = ['pendiente', 'en_preparacion', 'listo', 'entregado'];

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

const hace7DiasISO = () => {
  const d = new Date();
  d.setDate(d.getDate() - 6);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState('pedidos');
  const [filtroPeriodo, setFiltroPeriodo] = useState('rango');
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActualISO());
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoyISO());
  const [desdeRango, setDesdeRango] = useState(hace7DiasISO());
  const [hastaRango, setHastaRango] = useState(hoyISO());
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modalLocalidad, setModalLocalidad] = useState(null);
  const [modalEnvio, setModalEnvio] = useState(null);
  const [modalPago, setModalPago] = useState(null);

  // El catálogo (productos/categorías/localidades) no depende del filtro de pedidos —
  // se carga una sola vez, en vez de repetirse cada vez que cambia el período elegido.
  const cargarCatalogo = useCallback(async () => {
    try {
      const [resProductos, resCategorias, resLocalidades] = await Promise.all([
        api.get('/productos/'),
        api.get('/categorias/'),
        api.get('/localidades/'),
      ]);
      setProductos(resProductos.data);
      setCategorias(resCategorias.data);
      setLocalidades(resLocalidades.data);
    } catch (error) {
      console.error('Error al cargar productos/categorías/localidades:', error);
    }
  }, []);

  const cargarPedidos = useCallback(async () => {
    setCargando(true);
    try {
      let params = {};
      if (filtroPeriodo === 'mensual') {
        const { primero, ultimo } = primerYUltimoDiaDelMes(mesSeleccionado);
        params = { desde: primero, hasta: ultimo };
      } else if (filtroPeriodo === 'dia') {
        params = { desde: diaSeleccionado, hasta: diaSeleccionado };
      } else if (filtroPeriodo === 'rango') {
        params = { desde: desdeRango, hasta: hastaRango };
      }
      const { data } = await api.get('/pedidos/', { params });
      setPedidos(data);
    } catch (error) {
      console.error('Error al cargar los pedidos:', error);
    } finally {
      setCargando(false);
    }
  }, [filtroPeriodo, mesSeleccionado, diaSeleccionado, desdeRango, hastaRango]);

  useEffect(() => {
    cargarCatalogo();
  }, [cargarCatalogo]);

  useEffect(() => {
    cargarPedidos();
  }, [cargarPedidos]);

  // Los modales necesitan recargar pedidos (y, si tocan stock, el catálogo) al guardar.
  const cargarDatos = useCallback(() => {
    cargarPedidos();
    cargarCatalogo();
  }, [cargarPedidos, cargarCatalogo]);

  const cambiarEstado = async (pedido, nuevoEstado) => {
    try {
      const { data } = await api.patch(`/pedidos/${pedido.id}/`, { estado: nuevoEstado });
      setPedidos((prev) => prev.map((p) => (p.id === pedido.id ? data : p)));
    } catch (error) {
      console.error('Error al cambiar el estado:', error);
      alert('No se pudo cambiar el estado del pedido.');
    }
  };

  const avanzarEstado = (pedido) => {
    const indice = ORDEN_ESTADOS.indexOf(pedido.estado);
    const siguiente = ORDEN_ESTADOS[indice + 1];
    if (siguiente) cambiarEstado(pedido, siguiente);
  };

  const cancelarPedido = (pedido) => {
    if (!window.confirm('¿Cancelar este pedido?')) return;
    cambiarEstado(pedido, 'cancelado');
  };

  const eliminarPedido = async (pedido) => {
    if (!window.confirm(`¿Eliminar definitivamente el pedido de "${pedido.cliente || `Pedido #${pedido.id}`}"? Esta acción no se puede deshacer.`)) return;
    try {
      await api.delete(`/pedidos/${pedido.id}/`);
      setPedidos((prev) => prev.filter((p) => p.id !== pedido.id));
    } catch (error) {
      console.error('Error al eliminar el pedido:', error);
      alert('No se pudo eliminar el pedido.');
    }
  };

  const eliminarLocalidad = async (localidad) => {
    if (!window.confirm(`¿Eliminar la localidad "${localidad.nombre}"?`)) return;
    try {
      await api.delete(`/localidades/${localidad.id}/`);
      setLocalidades((prev) => prev.filter((l) => l.id !== localidad.id));
    } catch (error) {
      console.error('Error al eliminar la localidad:', error);
      alert('No se pudo eliminar la localidad.');
    }
  };

  const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

  return (
    <div className="pedidos-page">
      <header className="main-header">
        <h2>Ventas & Pedidos</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        <div className="tabs-bar">
          <button type="button" className={`tab-boton ${tab === 'pedidos' ? 'tab-activo' : ''}`} onClick={() => setTab('pedidos')}>
            Pedidos
          </button>
          <button type="button" className={`tab-boton ${tab === 'localidades' ? 'tab-activo' : ''}`} onClick={() => setTab('localidades')}>
            Localidades
          </button>
        </div>

        {tab === 'pedidos' && (
          <div className="tabs-bar">
            <button type="button" className={`tab-boton ${filtroPeriodo === 'rango' ? 'tab-activo' : ''}`} onClick={() => setFiltroPeriodo('rango')}>
              Rango
            </button>
            <button type="button" className={`tab-boton ${filtroPeriodo === 'dia' ? 'tab-activo' : ''}`} onClick={() => setFiltroPeriodo('dia')}>
              Por día
            </button>
            <button type="button" className={`tab-boton ${filtroPeriodo === 'mensual' ? 'tab-activo' : ''}`} onClick={() => setFiltroPeriodo('mensual')}>
              Mensual
            </button>
            <button type="button" className={`tab-boton ${filtroPeriodo === 'general' ? 'tab-activo' : ''}`} onClick={() => setFiltroPeriodo('general')}>
              General
            </button>
          </div>
        )}

        {tab === 'pedidos' && filtroPeriodo === 'rango' && (
          <div className="form-row estadisticas-selector-periodo">
            <div className="form-group">
              <label className="form-label">Desde</label>
              <input
                type="date"
                className="input-vibrante"
                value={desdeRango}
                max={hastaRango}
                onChange={(e) => setDesdeRango(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Hasta</label>
              <input
                type="date"
                className="input-vibrante"
                value={hastaRango}
                min={desdeRango}
                onChange={(e) => setHastaRango(e.target.value)}
              />
            </div>
          </div>
        )}

        {tab === 'pedidos' && filtroPeriodo === 'mensual' && (
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

        {tab === 'pedidos' && filtroPeriodo === 'dia' && (
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

        {tab === 'pedidos' && (
          cargando ? (
            <p className="estado-vacio">Cargando...</p>
          ) : pedidos.length === 0 ? (
            <div className="estado-vacio">
              {filtroPeriodo === 'general' ? (
                <>
                  <p>Todavía no hay pedidos cargados.</p>
                  <button type="button" className="btn-vibrante" onClick={() => setMostrarModal(true)}>
                    Crear el primer pedido
                  </button>
                </>
              ) : (
                <p>No hay pedidos en este período.</p>
              )}
            </div>
          ) : (
            <div className="pedidos-grid">
              <button
                type="button"
                className="pedido-card pedido-card-nuevo"
                onClick={() => setMostrarModal(true)}
              >
                <span className="producto-card-nueva-icono">+</span>
                <span>Nuevo pedido</span>
              </button>

              {pedidos.map((pedido) => (
                <PedidoCard
                  key={pedido.id}
                  pedido={pedido}
                  onCobrar={(p) => setModalPago(p.id)}
                  onDetalle={setModalEnvio}
                  onImprimir={imprimirPedido}
                  onEliminar={eliminarPedido}
                  onAvanzarEstado={avanzarEstado}
                  onCancelar={cancelarPedido}
                />
              ))}
            </div>
          )
        )}

        {tab === 'localidades' && (
          <>
            <div className="seccion-header">
              <h3>Localidades</h3>
              <button type="button" className="btn-vibrante" onClick={() => setModalLocalidad({ localidad: null })}>
                + Nueva localidad
              </button>
            </div>

            {localidades.length === 0 ? (
              <div className="estado-vacio">
                <p>Todavía no cargaste localidades.</p>
                <button type="button" className="btn-vibrante" onClick={() => setModalLocalidad({ localidad: null })}>
                  Cargar la primera localidad
                </button>
              </div>
            ) : (
              <div className="stock-grid">
                {localidades.map((localidad) => (
                  <div key={localidad.id} className="stock-card">
                    <span className="stock-card-nombre">{localidad.nombre}</span>
                    <strong className="stock-card-cantidad">{formatearPrecio(localidad.costo_envio)}</strong>
                    <span className="stock-card-unidad">envío</span>
                    <div className="producto-acciones">
                      <button type="button" onClick={() => setModalLocalidad({ localidad })}>✎</button>
                      <button type="button" onClick={() => eliminarLocalidad(localidad)}>🗑</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {mostrarModal && (
        <PedidoModal
          productos={productos}
          categorias={categorias}
          localidades={localidades}
          onClose={() => setMostrarModal(false)}
          onSaved={() => { setMostrarModal(false); cargarDatos(); }}
        />
      )}

      {modalLocalidad && (
        <LocalidadModal
          localidad={modalLocalidad.localidad}
          onClose={() => setModalLocalidad(null)}
          onSaved={() => { setModalLocalidad(null); cargarDatos(); }}
        />
      )}

      {modalEnvio && (
        <PedidoEnvioDescuentoModal
          pedido={modalEnvio}
          localidades={localidades}
          onClose={() => setModalEnvio(null)}
          onSaved={() => { setModalEnvio(null); cargarDatos(); }}
        />
      )}

      {modalPago && (
        <PedidoPagoModal
          pedidoId={modalPago}
          onClose={() => setModalPago(null)}
          onSaved={cargarDatos}
        />
      )}
    </div>
  );
}