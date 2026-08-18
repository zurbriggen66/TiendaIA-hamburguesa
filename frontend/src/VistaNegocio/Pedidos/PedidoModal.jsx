import React, { useState } from 'react';
import api from '../../services/api';

const COLORES_CHIP = ['chip-mostaza', 'chip-naranja', 'chip-tomate'];

let contadorFila = 0;
// La presentación más barata siempre está primera (Presentacion.Meta.ordering =
// ['orden', 'precio']), así una fila nueva ya queda con un precio válido sin tocar nada más.
const nuevaFila = (productoId, presentacionId = null) => ({ key: ++contadorFila, producto: productoId, presentacion: presentacionId, cantidad: 1, extras: [] });

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

// Con presentación elegida el precio base es el de esa presentación (el % de descuento
// del producto se sigue aplicando igual, sólo para la estimación que se ve acá — el
// precio real que se cobra siempre lo recalcula el servidor).
const precioEfectivo = (producto, presentacion) => {
  const base = presentacion ? Number(presentacion.precio) : Number(producto.precio);
  if (!producto.descuento_activo) return base;
  return presentacion ? Math.round(base * (1 - Number(producto.descuento_pct) / 100)) : Number(producto.precio_actual);
};

export default function PedidoModal({ productos, categorias, localidades, onClose, onSaved }) {
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
  // Arranca en "Burguers" (la categoría más pedida) para no obligar a tocar el filtro
  // en cada pedido nuevo; el resto de categorías se sigue pudiendo elegir a mano.
  const [categoriaActiva, setCategoriaActiva] = useState(() => {
    const burguers = (categorias || []).find((c) => c.nombre.trim().toLowerCase() === 'burguers');
    return burguers ? burguers.id : 'todas';
  });
  const [filas, setFilas] = useState([]);
  const [guardando, setGuardando] = useState(false);

  const productosPrincipales = productos.filter((p) => !p.es_extra);
  const extrasTodos = productos.filter((p) => p.es_extra);
  const extrasParaProducto = (producto) => (producto ? extrasTodos.filter((e) => e.categoria === producto.categoria) : []);

  // El dueño quiere ver primero la categoría de hamburguesas al cargar un pedido, para no
  // tener que buscarla entre el resto (que se ordenan alfabéticamente).
  const categoriasOrdenadas = [...(categorias || [])].sort((a, b) => {
    const esBurguerA = a.nombre.trim().toLowerCase() === 'burguers' ? 0 : 1;
    const esBurguerB = b.nombre.trim().toLowerCase() === 'burguers' ? 0 : 1;
    return esBurguerA - esBurguerB;
  });

  const productosFiltrados = categoriaActiva === 'todas'
    ? productosPrincipales
    : productosPrincipales.filter((p) => p.categoria === categoriaActiva);

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

  const agregarProductoClick = (producto) => {
    const presentacionDefault = producto.presentaciones?.[0]?.id ?? null;
    setFilas((prev) => {
      const idx = prev.findIndex((f) => f.producto === String(producto.id) && f.extras.length === 0 && f.presentacion === presentacionDefault);
      if (idx !== -1) {
        return prev.map((f, i) => (i === idx ? { ...f, cantidad: Number(f.cantidad) + 1 } : f));
      }
      return [...prev, nuevaFila(String(producto.id), presentacionDefault)];
    });
  };

  const cambiarCantidadExtraFila = (key, extraId, cantidad) => {
    setFilas((prev) => prev.map((f) => {
      if (f.key !== key) return f;
      const extras = f.extras.filter((e) => e.id !== extraId);
      if (cantidad > 0) extras.push({ id: extraId, cantidad });
      return { ...f, extras };
    }));
  };

  const costoExtrasFila = (fila) =>
    fila.extras.reduce((acc, ex) => {
      const extra = productoPorId(ex.id);
      return acc + (extra ? Number(extra.precio) * ex.cantidad : 0);
    }, 0);

  const filasValidas = filas.filter((f) => f.producto && Number(f.cantidad) > 0);

  const presentacionDeFila = (producto, fila) =>
    (producto?.presentaciones || []).find((p) => String(p.id) === String(fila.presentacion));

  const totalEstimado = filasValidas.reduce((acc, f) => {
    const producto = productoPorId(f.producto);
    const precioUnidad = (producto ? precioEfectivo(producto, presentacionDeFila(producto, f)) : 0) + costoExtrasFila(f);
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
        origen: 'admin',
        tipo_entrega: tipoEntrega,
        direccion: tipoEntrega === 'delivery' ? direccion : '',
        localidad: tipoEntrega === 'delivery' ? (localidadId || null) : null,
        costo_envio: tipoEntrega === 'delivery' ? (costoEnvio || 0) : 0,
        descuento_pct: aplicarDescuento ? Number(descuentoPct) || 0 : 0,
        hora_salida: horaSalida || null,
        nota,
        items: filasValidas.map((f) => ({
          producto: f.producto,
          presentacion: f.presentacion || null,
          cantidad: f.cantidad,
          extras: f.extras.map((ex) => ({ producto: ex.id, cantidad: ex.cantidad })),
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

            {categorias && categorias.length > 0 && (
              <div className="categorias-bar pedido-picker-categorias">
                <button
                  type="button"
                  className={`chip-categoria chip-todas ${categoriaActiva === 'todas' ? 'chip-activo' : ''}`}
                  onClick={() => setCategoriaActiva('todas')}
                >
                  Todas
                </button>
                {categoriasOrdenadas.map((cat, i) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`chip-categoria ${COLORES_CHIP[i % COLORES_CHIP.length]} ${categoriaActiva === cat.id ? 'chip-activo' : ''}`}
                    onClick={() => setCategoriaActiva(cat.id)}
                  >
                    {cat.nombre}
                  </button>
                ))}
              </div>
            )}

            <div className="pedido-producto-picker-grid">
              {productosFiltrados.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="pedido-producto-picker-item"
                  onClick={() => agregarProductoClick(p)}
                >
                  {p.descuento_activo && <span className="badge-descuento badge-descuento-chica">🏷️ -{p.descuento_pct}%</span>}
                  <span>{p.nombre}</span>
                  {p.presentaciones && p.presentaciones.length > 0 ? (
                    <strong>Desde {formatearPrecio(p.presentaciones[0].precio)}</strong>
                  ) : p.descuento_activo ? (
                    <strong>
                      <span className="precio-tachado">{formatearPrecio(p.precio)}</span>
                      {' '}{formatearPrecio(p.precio_actual)}
                    </strong>
                  ) : (
                    <strong>{formatearPrecio(p.precio)}</strong>
                  )}
                </button>
              ))}
            </div>

            {filas.length === 0 ? (
              <p className="aviso-sin-insumos">Tocá un producto de arriba para agregarlo al pedido.</p>
            ) : (
              <div className="pedido-filas">
                {filas.map((fila) => {
                  const producto = productoPorId(fila.producto);
                  const presentacion = presentacionDeFila(producto, fila);
                  const extrasDisponibles = extrasParaProducto(producto);
                  const filaTieneExtras = fila.extras.length > 0;
                  const filaTieneVarios = Number(fila.cantidad) > 1;
                  return (
                    <div key={fila.key} className="pedido-fila-grupo">
                      <div className="pedido-fila">
                        <div className="pedido-fila-nombre">
                          <strong>{producto ? producto.nombre : 'Producto'}</strong>
                          <span>
                            {producto && !presentacion && producto.descuento_activo && (
                              <span className="precio-tachado">{formatearPrecio(producto.precio)}</span>
                            )}
                            {' '}{producto ? formatearPrecio(precioEfectivo(producto, presentacion)) : ''}
                          </span>
                          {producto && producto.presentaciones && producto.presentaciones.length > 0 && (
                            <select
                              className="input-vibrante pedido-fila-presentacion"
                              value={fila.presentacion || ''}
                              onChange={(e) => actualizarFila(fila.key, { presentacion: Number(e.target.value) })}
                            >
                              {producto.presentaciones.map((p) => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                              ))}
                            </select>
                          )}
                        </div>
                        <div className="pedido-fila-cantidad-stepper">
                          <button type="button" onClick={() => actualizarFila(fila.key, { cantidad: Math.max(1, Number(fila.cantidad) - 1) })} disabled={filaTieneExtras}>−</button>
                          <span>{fila.cantidad}</span>
                          <button
                            type="button"
                            onClick={() => actualizarFila(fila.key, { cantidad: Number(fila.cantidad) + 1 })}
                            disabled={filaTieneExtras}
                            title={filaTieneExtras ? 'Esta unidad tiene extras propios: agregá otra Argenta desde arriba si necesitás una segunda con distintos extras' : undefined}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          className="pedido-fila-quitar"
                          onClick={() => quitarFila(fila.key)}
                          title="Quitar producto"
                        >
                          ✕
                        </button>
                      </div>

                      {filaTieneExtras && (
                        <p className="pedido-fila-aviso">
                          Esta línea es 1 unidad con sus extras propios. Para otra {producto ? producto.nombre : 'unidad'} con extras distintos, tocala de nuevo en la grilla de arriba.
                        </p>
                      )}

                      {extrasDisponibles.length > 0 && (
                        <div className="pedido-fila-extras">
                          {filaTieneVarios && (
                            <p className="pedido-fila-aviso">
                              Con {fila.cantidad} unidades en esta línea no se pueden poner extras (quedarían iguales en todas). Bajá la cantidad a 1 para personalizarla.
                            </p>
                          )}
                          {extrasDisponibles.map((extra) => {
                            const seleccionado = fila.extras.find((e) => e.id === extra.id);
                            const cantidadExtra = seleccionado ? seleccionado.cantidad : 0;
                            return (
                              <div key={extra.id} className={`extra-selector-fila ${cantidadExtra > 0 ? 'extra-selector-fila-activa' : ''}`}>
                                <span className="extra-selector-nombre">{extra.nombre} <small>(+{formatearPrecio(extra.precio)})</small></span>
                                <div className="extra-selector-stepper">
                                  <button
                                    type="button"
                                    onClick={() => cambiarCantidadExtraFila(fila.key, extra.id, Math.max(0, cantidadExtra - 1))}
                                    disabled={cantidadExtra === 0 || filaTieneVarios}
                                  >
                                    −
                                  </button>
                                  <span>{cantidadExtra}</span>
                                  <button
                                    type="button"
                                    onClick={() => cambiarCantidadExtraFila(fila.key, extra.id, cantidadExtra + 1)}
                                    disabled={filaTieneVarios}
                                  >
                                    +
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
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
