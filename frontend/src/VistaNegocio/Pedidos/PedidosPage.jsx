import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import PedidoModal from './PedidoModal';

const ORDEN_ESTADOS = ['pendiente', 'en_preparacion', 'listo', 'entregado'];

const ETIQUETA_ESTADO = {
  pendiente: 'Pendiente',
  en_preparacion: 'En preparación',
  listo: 'Listo',
  entregado: 'Entregado',
  cancelado: 'Cancelado',
};

const ETIQUETA_SIGUIENTE = {
  pendiente: 'Marcar en preparación',
  en_preparacion: 'Marcar listo',
  listo: 'Marcar entregado',
};

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState([]);
  const [productos, setProductos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [resPedidos, resProductos] = await Promise.all([
        api.get('/pedidos/'),
        api.get('/productos/'),
      ]);
      setPedidos(resPedidos.data);
      setProductos(resProductos.data);
    } catch (error) {
      console.error('Error al cargar pedidos/productos:', error);
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

  const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

  return (
    <div className="pedidos-page">
      <header className="main-header">
        <h2>Ventas & Pedidos</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        {cargando ? (
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
            {pedidos.map((pedido) => (
              <div key={pedido.id} className="pedido-card">
                <div className="pedido-card-header">
                  <h4>{pedido.cliente || `Pedido #${pedido.id}`}</h4>
                  <span className={`badge-estado estado-${pedido.estado}`}>{ETIQUETA_ESTADO[pedido.estado]}</span>
                </div>

                <ul className="pedido-items-lista">
                  {pedido.items.map((item) => (
                    <li key={item.id}>
                      <span>{item.cantidad} × {item.producto_nombre}</span>
                      <span>{formatearPrecio(item.subtotal)}</span>
                    </li>
                  ))}
                </ul>

                <div className="pedido-card-footer">
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

            <button
              type="button"
              className="pedido-card pedido-card-nuevo"
              onClick={() => setMostrarModal(true)}
            >
              <span className="producto-card-nueva-icono">+</span>
              <span>Nuevo pedido</span>
            </button>
          </div>
        )}
      </div>

      {mostrarModal && (
        <PedidoModal
          productos={productos}
          onClose={() => setMostrarModal(false)}
          onSaved={() => { setMostrarModal(false); cargarDatos(); }}
        />
      )}
    </div>
  );
}
