import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import PedidoModal from './PedidoModal';
import LocalidadModal from './LocalidadModal';
import PedidoEnvioDescuentoModal from './PedidoEnvioDescuentoModal';
import PedidoPagoModal from './PedidoPagoModal';
import { imprimirPedido } from '../../utils/impresion';

const ORDEN_ESTADOS = ['pendiente', 'en_preparacion', 'listo', 'entregado'];

const ETIQUETA_ESTADO = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const ETIQUETA_COBRO = {
  pagado: '✅ Pagado',
  parcial: '🟡 Parcial',
  pendiente: '🔴 Pendiente',
};

const ETIQUETA_SIGUIENTE = {
  pendiente: 'Marcar en preparación',
  en_preparacion: 'Marcar listo',
  listo: 'Marcar entregado',
};

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [localidades, setLocalidades] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState('pedidos');
  const [mostrarModal, setMostrarModal] = useState(false);
  const [modalLocalidad, setModalLocalidad] = useState(null);
  const [modalEnvio, setModalEnvio] = useState(null);
  const [modalPago, setModalPago] = useState(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [resPedidos, resProductos, resCategorias, resLocalidades] = await Promise.all([
        api.get('/pedidos/'),
        api.get('/productos/'),
        api.get('/categorias/'),
        api.get('/localidades/'),
      ]);
      setPedidos(resPedidos.data);
      setProductos(resProductos.data);
      setCategorias(resCategorias.data);
      setLocalidades(resLocalidades.data);
    } catch (error) {
      console.error('Error al cargar pedidos/productos/localidades:', error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

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

  const formatearFechaHora = (iso) =>
    new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false });

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
          cargando ? (
            <p className="estado-vacio">Cargando...</p>
          ) : pedidos.length === 0 ? (
            <div className="estado-vacio">
              <p>Todavía no hay pedidos cargados.</p>
              <button type="button" className="btn-vibrante" onClick={() => setMostrarModal(true)}>
                Crear el primer pedido
              </button>
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
                <div key={pedido.id} className="pedido-card">
                  <div className="pedido-card-header">
                    <div>
                      <h4>{pedido.cliente || `Pedido #${pedido.id}`}</h4>
                      <span className="pedido-fecha-creacion">🕐 {formatearFechaHora(pedido.creado)}</span>
                    </div>
                    <div className="pedido-card-header-derecha">
                      <span className={`badge-estado estado-${pedido.estado}`}>{ETIQUETA_ESTADO[pedido.estado]}</span>
                      <span className={`badge-cobro cobro-${pedido.estado_cobro}`}>{ETIQUETA_COBRO[pedido.estado_cobro]}</span>
                      <button type="button" className="pedido-pago-boton" title="Cobrar pedido" onClick={() => setModalPago(pedido.id)}>💰</button>
                      <button type="button" className="pedido-envio-boton" title="Detalles del pedido" onClick={() => setModalEnvio(pedido)}>💲</button>
                      <button type="button" className="pedido-imprimir" title="Imprimir ticket" onClick={() => imprimirPedido(pedido)}>🖨️</button>
                      <button type="button" className="pedido-eliminar" title="Eliminar pedido" onClick={() => eliminarPedido(pedido)}>🗑</button>
                    </div>
                  </div>

                  <div className="pedido-entrega-info">
                    <span className={`badge-entrega badge-entrega-${pedido.tipo_entrega}`}>
                      {pedido.tipo_entrega === 'delivery' ? '🛵 Delivery' : '🏠 Retiro en local'}
                    </span>
                    {pedido.telefono && <span className="pedido-entrega-dato">📞 {pedido.telefono}</span>}
                    {pedido.tipo_entrega === 'delivery' && pedido.direccion && (
                      <span className="pedido-entrega-dato">📍 {pedido.direccion}</span>
                    )}
                    {pedido.localidad_nombre && (
                      <span className="pedido-entrega-dato">🗺️ {pedido.localidad_nombre}</span>
                    )}
                    {pedido.hora_salida && (
                      <span className="pedido-entrega-dato">🕒 Sale {pedido.hora_salida.slice(0, 5)}</span>
                    )}
                  </div>

                  {pedido.nota && (
                    <p className="pedido-nota">📝 {pedido.nota}</p>
                  )}

                  <ul className="pedido-items-lista">
                    {pedido.items.map((item) => (
                      <li key={item.id}>
                        <div className="pedido-item-info">
                          <span>{item.cantidad} × {item.producto_nombre || item.combo_nombre}</span>
                          {item.extras_detalle && item.extras_detalle.length > 0 && (
                            <span className="pedido-item-extras">
                              + {item.extras_detalle.map((e) => `${e.cantidad > 1 ? `${e.cantidad}x ` : ''}${e.nombre}`).join(', ')}
                            </span>
                          )}
                        </div>
                        <span>{formatearPrecio(item.subtotal)}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="pedido-card-footer">
                    {(Number(pedido.costo_envio) > 0 || Number(pedido.descuento_pct) > 0) && (
                      <div className="pedido-desglose">
                        <div><span>Subtotal</span><span>{formatearPrecio(pedido.subtotal)}</span></div>
                        {Number(pedido.costo_envio) > 0 && (
                          <div><span>Envío</span><span>{formatearPrecio(pedido.costo_envio)}</span></div>
                        )}
                        {Number(pedido.descuento_pct) > 0 && (
                          <div><span>Descuento</span><span>-{pedido.descuento_pct}%</span></div>
                        )}
                      </div>
                    )}
                    <span className="pedido-total">{formatearPrecio(pedido.total)}</span>
                    <div className="pedido-acciones-estado">
                      {ETIQUETA_SIGUIENTE[pedido.estado] && (
                        <button type="button" className="btn-vibrante btn-siguiente-estado" onClick={() => avanzarEstado(pedido)}>
                          {ETIQUETA_SIGUIENTE[pedido.estado]}
                        </button>
                      )}
                      {pedido.estado !== 'entregado' && pedido.estado !== 'cancelado' && (
                        <button type="button" className="btn-cancelar-pedido" onClick={() => cancelarPedido(pedido)}>
                          Cancelar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
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