import React, { useState } from 'react';
import api from '../../services/api';

let contadorFila = 0;
const nuevaFila = () => ({ key: ++contadorFila, producto: '', cantidad: 1 });

export default function PedidoModal({ productos, onClose, onSaved }) {
  const [cliente, setCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState('retiro');
  const [direccion, setDireccion] = useState('');
  const [filas, setFilas] = useState([nuevaFila()]);
  const [guardando, setGuardando] = useState(false);

  const productoPorId = (id) => productos.find((p) => String(p.id) === String(id));

  const actualizarFila = (key, cambios) => {
    setFilas((prev) => prev.map((f) => (f.key === key ? { ...f, ...cambios } : f)));
  };

  const quitarFila = (key) => {
    setFilas((prev) => prev.filter((f) => f.key !== key));
  };

  const agregarFila = () => {
    setFilas((prev) => [...prev, nuevaFila()]);
  };

  const filasValidas = filas.filter((f) => f.producto && Number(f.cantidad) > 0);

  const totalEstimado = filasValidas.reduce((acc, f) => {
    const producto = productoPorId(f.producto);
    return acc + (producto ? Number(producto.precio) * Number(f.cantidad) : 0);
  }, 0);

  const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

  const guardar = async (e) => {
    e.preventDefault();
    if (filasValidas.length === 0) {
      alert('Agregá al menos un producto con cantidad.');
      return;
    }

    setGuardando(true);
    try {
      await api.post('/pedidos/', {
        cliente,
        telefono,
        tipo_entrega: tipoEntrega,
        direccion: tipoEntrega === 'delivery' ? direccion : '',
        items: filasValidas.map((f) => ({ producto: f.producto, cantidad: f.cantidad })),
      });
      onSaved();
    } catch (error) {
      console.error('Error al crear el pedido:', error);
      alert('Hubo un problema al crear el pedido.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Nuevo pedido</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={guardar}>
          <div className="form-group">
            <label className="form-label">Cliente (opcional)</label>
            <input
              type="text"
              className="input-vibrante"
              placeholder="Ej: Mesa 4"
              value={cliente}
              onChange={(e) => setCliente(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Teléfono (opcional)</label>
              <input
                type="tel"
                className="input-vibrante"
                placeholder="381..."
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>
            <div className="form-group" style={{ flex: 1 }}>
              <label className="form-label">Entrega</label>
              <div className="tipo-entrega-selector">
                <button type="button" className={tipoEntrega === 'retiro' ? 'activo' : ''} onClick={() => setTipoEntrega('retiro')}>
                  Retiro
                </button>
                <button type="button" className={tipoEntrega === 'delivery' ? 'activo' : ''} onClick={() => setTipoEntrega('delivery')}>
                  Delivery
                </button>
              </div>
            </div>
          </div>

          {tipoEntrega === 'delivery' && (
            <div className="form-group">
              <label className="form-label">Dirección</label>
              <input
                type="text"
                className="input-vibrante"
                placeholder="Calle, número y referencia"
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Productos</label>
            <div className="pedido-filas">
              {filas.map((fila) => (
                <div key={fila.key} className="pedido-fila">
                  <select
                    className="input-vibrante"
                    value={fila.producto}
                    onChange={(e) => actualizarFila(fila.key, { producto: e.target.value })}
                  >
                    <option value="">Elegir producto...</option>
                    {productos.map((p) => (
                      <option key={p.id} value={p.id}>{p.nombre} — {formatearPrecio(p.precio)}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min="1"
                    className="input-vibrante pedido-fila-cantidad"
                    value={fila.cantidad}
                    onChange={(e) => actualizarFila(fila.key, { cantidad: e.target.value })}
                  />
                  <button
                    type="button"
                    className="pedido-fila-quitar"
                    onClick={() => quitarFila(fila.key)}
                    disabled={filas.length === 1}
                    title="Quitar producto"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button type="button" className="btn-agregar-fila" onClick={agregarFila}>
              + Agregar producto
            </button>
          </div>

          <div className="pedido-total-estimado">
            <span>Total estimado</span>
            <strong>{formatearPrecio(totalEstimado)}</strong>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Crear pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
