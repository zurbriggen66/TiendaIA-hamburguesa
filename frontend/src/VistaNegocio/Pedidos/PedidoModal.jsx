import React, { useState } from 'react';
import api from '../../services/api';

let contadorFila = 0;
const nuevaFila = () => ({ key: ++contadorFila, producto: '', cantidad: 1, extras: [] });

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

export default function PedidoModal({ productos, localidades, onClose, onSaved }) {
  const [cliente, setCliente] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState('retiro');
  const [direccion, setDireccion] = useState('');
  const [localidadId, setLocalidadId] = useState('');
  const [costoEnvio, setCostoEnvio] = useState('');
  const [aplicarDescuento, setAplicarDescuento] = useState(false);
  const [descuentoPct, setDescuentoPct] = useState('');
  const [horaSalida, setHoraSalida] = useState('');
  const [nota, setNota] = useState('');
  const [filas, setFilas] = useState([nuevaFila()]);
  const [guardando, setGuardando] = useState(false);

  const productosPrincipales = productos.filter((p) => !p.es_extra);
  const extrasDisponibles = productos.filter((p) => p.es_extra);

  const elegirLocalidad = (id) => {
    setLocalidadId(id);
    const localidad = (localidades || []).find((l) => String(l.id) === id);
    if (localidad) setCostoEnvio(localidad.costo_envio);
  };

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

  const toggleExtraFila = (key, extraId) => {
    setFilas((prev) => prev.map((f) => {
      if (f.key !== key) return f;
      const extras = f.extras.includes(extraId) ? f.extras.filter((id) => id !== extraId) : [...f.extras, extraId];
      return { ...f, extras };
    }));
  };

  const costoExtrasFila = (fila) =>
    fila.extras.reduce((acc, extraId) => {
      const extra = productoPorId(extraId);
      return acc + (extra ? Number(extra.precio) : 0);
    }, 0);

  const filasValidas = filas.filter((f) => f.producto && Number(f.cantidad) > 0);

  const totalEstimado = filasValidas.reduce((acc, f) => {
    const producto = productoPorId(f.producto);
    const precioUnidad = (producto ? Number(producto.precio) : 0) + costoExtrasFila(f);
    return acc + precioUnidad * Number(f.cantidad);
  }, 0);

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
        localidad: tipoEntrega === 'delivery' ? (localidadId || null) : null,
        costo_envio: tipoEntrega === 'delivery' ? (costoEnvio || 0) : 0,
        descuento_pct: aplicarDescuento ? Number(descuentoPct) || 0 : 0,
        hora_salida: horaSalida || null,
        nota,
        items: filasValidas.map((f) => ({
          producto: f.producto,
          cantidad: f.cantidad,
          extras: f.extras.map((id) => ({ producto: id })),
        })),
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
            <div className="form-group">
              <label className="form-label">Teléfono (opcional)</label>
              <input
                type="tel"
                className="input-vibrante"
                placeholder="381..."
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
              />
            </div>
            <div className="form-group">
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
            <>
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

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Localidad (opcional)</label>
                  <select className="input-vibrante" value={localidadId} onChange={(e) => elegirLocalidad(e.target.value)}>
                    <option value="">Sin localidad específica</option>
                    {(localidades || []).map((l) => (
                      <option key={l.id} value={l.id}>{l.nombre} — {formatearPrecio(l.costo_envio)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Costo de envío</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-vibrante"
                    placeholder="0.00"
                    value={costoEnvio}
                    onChange={(e) => setCostoEnvio(e.target.value)}
                  />
                </div>
              </div>
            </>
          )}

          <div className="form-group">
            <label className="checkbox-vibrante">
              <input type="checkbox" checked={aplicarDescuento} onChange={(e) => setAplicarDescuento(e.target.checked)} />
              <span>💸 Aplicar descuento</span>
            </label>
          </div>

          {aplicarDescuento && (
            <div className="form-group">
              <label className="form-label">Porcentaje de descuento</label>
              <input
                type="number"
                min="0"
                max="100"
                className="input-vibrante"
                placeholder="Ej: 5"
                value={descuentoPct}
                onChange={(e) => setDescuentoPct(e.target.value)}
              />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Hora de salida (opcional)</label>
            <input
              type="time"
              className="input-vibrante"
              value={horaSalida}
              onChange={(e) => setHoraSalida(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Nota para cocina (opcional)</label>
            <textarea
              className="input-vibrante"
              rows={2}
              placeholder="Ej: Sin cebolla, punto de cocción bien cocido..."
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Productos</label>
            <div className="pedido-filas">
              {filas.map((fila) => (
                <div key={fila.key} className="pedido-fila-grupo">
                  <div className="pedido-fila">
                    <select
                      className="input-vibrante"
                      value={fila.producto}
                      onChange={(e) => actualizarFila(fila.key, { producto: e.target.value })}
                    >
                      <option value="">Elegir producto...</option>
                      {productosPrincipales.map((p) => (
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

                  {fila.producto && extrasDisponibles.length > 0 && (
                    <div className="pedido-fila-extras">
                      {extrasDisponibles.map((extra) => (
                        <label key={extra.id} className="checkbox-vibrante checkbox-insumo">
                          <input
                            type="checkbox"
                            checked={fila.extras.includes(extra.id)}
                            onChange={() => toggleExtraFila(fila.key, extra.id)}
                          />
                          <span>{extra.nombre} (+{formatearPrecio(extra.precio)})</span>
                        </label>
                      ))}
                    </div>
                  )}
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
