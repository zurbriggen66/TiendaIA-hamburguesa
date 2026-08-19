import React, { useEffect, useState } from 'react';
import api from '../../services/api';

let contadorFilaInsumo = 0;
const nuevaFilaInsumo = (insumo = '', cantidad = 1) => ({ key: ++contadorFilaInsumo, insumo: String(insumo), cantidad });

let contadorFilaPresentacion = 0;
const nuevaFilaPresentacion = (id = null, nombre = '', precio = '', insumosExtra = []) => ({
  key: ++contadorFilaPresentacion,
  id,
  nombre,
  precio,
  // Insumos que esta variante suma por encima de los del producto base (ej. "Doble" =
  // insumos de la simple + 1 medallón extra). Si ese insumo tiene descuento, la
  // variante lo hereda automáticamente (lo calcula el backend).
  insumosExtra: insumosExtra.length > 0 ? insumosExtra.map((d) => nuevaFilaInsumo(d.insumo, d.cantidad)) : [],
});

export default function ProductoModal({ producto, categorias, categoriaPreseleccionada, onClose, onSaved }) {
  const [nombre, setNombre] = useState(producto ? producto.nombre : '');
  const [descripcion, setDescripcion] = useState(producto ? producto.descripcion : '');
  const [precio, setPrecio] = useState(producto ? producto.precio : '');
  const [categoriaId, setCategoriaId] = useState(
    producto ? producto.categoria : (categoriaPreseleccionada || (categorias[0] && categorias[0].id) || '')
  );
  const [destacado, setDestacado] = useState(producto ? producto.destacado : false);
  const [esExtra, setEsExtra] = useState(producto ? producto.es_extra : false);
  const [sugeridoCarrito, setSugeridoCarrito] = useState(producto ? producto.sugerido_carrito : false);
  const [descuentoCarritoPct, setDescuentoCarritoPct] = useState(
    producto && producto.descuento_carrito_pct ? producto.descuento_carrito_pct : ''
  );
  const [imagen, setImagen] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [insumosDisponibles, setInsumosDisponibles] = useState([]);
  const [filasInsumos, setFilasInsumos] = useState(
    producto && producto.insumos_detalle && producto.insumos_detalle.length > 0
      ? producto.insumos_detalle.map((d) => nuevaFilaInsumo(d.insumo, d.cantidad))
      : [nuevaFilaInsumo()]
  );
  const [filasPresentaciones, setFilasPresentaciones] = useState(
    producto && producto.presentaciones && producto.presentaciones.length > 0
      ? producto.presentaciones.map((p) => nuevaFilaPresentacion(p.id, p.nombre, p.precio, p.insumos_extra))
      : []
  );

  useEffect(() => {
    api.get('/insumos/').then((res) => setInsumosDisponibles(res.data)).catch((err) => console.error('Error al cargar insumos:', err));
  }, []);

  const actualizarFilaInsumo = (key, cambios) => {
    setFilasInsumos((prev) => prev.map((f) => (f.key === key ? { ...f, ...cambios } : f)));
  };

  const quitarFilaInsumo = (key) => {
    setFilasInsumos((prev) => prev.filter((f) => f.key !== key));
  };

  const agregarFilaInsumo = () => {
    setFilasInsumos((prev) => [...prev, nuevaFilaInsumo()]);
  };

  const actualizarFilaPresentacion = (key, cambios) => {
    setFilasPresentaciones((prev) => prev.map((f) => (f.key === key ? { ...f, ...cambios } : f)));
  };

  const quitarFilaPresentacion = (key) => {
    setFilasPresentaciones((prev) => prev.filter((f) => f.key !== key));
  };

  const agregarFilaPresentacion = () => {
    setFilasPresentaciones((prev) => [...prev, nuevaFilaPresentacion()]);
  };

  const actualizarInsumoExtra = (presKey, insumoKey, cambios) => {
    setFilasPresentaciones((prev) => prev.map((f) => (
      f.key === presKey
        ? { ...f, insumosExtra: f.insumosExtra.map((ie) => (ie.key === insumoKey ? { ...ie, ...cambios } : ie)) }
        : f
    )));
  };

  const quitarInsumoExtra = (presKey, insumoKey) => {
    setFilasPresentaciones((prev) => prev.map((f) => (
      f.key === presKey ? { ...f, insumosExtra: f.insumosExtra.filter((ie) => ie.key !== insumoKey) } : f
    )));
  };

  const agregarInsumoExtra = (presKey) => {
    setFilasPresentaciones((prev) => prev.map((f) => (
      f.key === presKey ? { ...f, insumosExtra: [...f.insumosExtra, nuevaFilaInsumo()] } : f
    )));
  };

  const previewImagen = imagen ? URL.createObjectURL(imagen) : (producto ? producto.imagen : null);

  const prevenirNavegador = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    prevenirNavegador(e);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setImagen(e.dataTransfer.files[0]);
  };

  const guardar = async (e) => {
    e.preventDefault();
    if (!nombre.trim() || !precio || !categoriaId) {
      alert('Completá al menos el nombre, el precio y la categoría.');
      return;
    }
    if (sugeridoCarrito && !(Number(descuentoCarritoPct) > 0)) {
      alert('Definí un porcentaje de descuento mayor a 0 para sugerir este producto en el carrito.');
      return;
    }

    const formData = new FormData();
    formData.append('nombre', nombre.trim());
    formData.append('descripcion', descripcion);
    formData.append('precio', precio);
    formData.append('categoria', categoriaId);
    formData.append('destacado', destacado);
    formData.append('es_extra', esExtra);
    formData.append('sugerido_carrito', sugeridoCarrito);
    formData.append('descuento_carrito_pct', sugeridoCarrito ? descuentoCarritoPct : 0);
    if (imagen) formData.append('imagen', imagen);

    const filasValidas = filasInsumos.filter((f) => f.insumo && Number(f.cantidad) > 0);
    const cantidadPorInsumo = new Map();
    filasValidas.forEach((f) => {
      const id = Number(f.insumo);
      cantidadPorInsumo.set(id, (cantidadPorInsumo.get(id) || 0) + Number(f.cantidad));
    });
    const insumosParaGuardar = Array.from(cantidadPorInsumo, ([insumo, cantidad]) => ({ insumo, cantidad }));
    formData.append('insumos_json', JSON.stringify(insumosParaGuardar));

    const presentacionesParaGuardar = filasPresentaciones
      .filter((f) => f.nombre.trim() && Number(f.precio) > 0)
      .map((f) => {
        const extraValidos = f.insumosExtra.filter((ie) => ie.insumo && Number(ie.cantidad) > 0);
        const cantidadPorInsumoExtra = new Map();
        extraValidos.forEach((ie) => {
          const id = Number(ie.insumo);
          cantidadPorInsumoExtra.set(id, (cantidadPorInsumoExtra.get(id) || 0) + Number(ie.cantidad));
        });
        return {
          id: f.id,
          nombre: f.nombre.trim(),
          precio: f.precio,
          insumos_extra: Array.from(cantidadPorInsumoExtra, ([insumo, cantidad]) => ({ insumo, cantidad })),
        };
      });
    formData.append('presentaciones_json', JSON.stringify(presentacionesParaGuardar));

    setGuardando(true);
    try {
      if (producto) {
        await api.patch(`/productos/${producto.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/productos/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      onSaved();
    } catch (error) {
      console.error('Error al guardar el producto:', error);
      alert('Hubo un problema al guardar el producto.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{producto ? 'Editar producto' : 'Nuevo producto'}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={guardar}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              type="text"
              className="input-vibrante"
              placeholder="Ej: Doble Cheddar Bacon"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción</label>
            <textarea
              className="input-vibrante"
              rows={3}
              placeholder="Ingredientes, detalle del producto..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Precio</label>
              <input
                type="number"
                step="0.01"
                min="0"
                className="input-vibrante"
                placeholder="0.00"
                value={precio}
                onChange={(e) => setPrecio(e.target.value)}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Categoría</label>
              <select
                className="input-vibrante"
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
              >
                {categorias.map((cat) => (
                  <option key={cat.id} value={cat.id}>{cat.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="checkbox-vibrante">
              <input
                type="checkbox"
                checked={destacado}
                onChange={(e) => setDestacado(e.target.checked)}
              />
              <span>⭐ Marcar como destacado</span>
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-vibrante">
              <input
                type="checkbox"
                checked={esExtra}
                onChange={(e) => setEsExtra(e.target.checked)}
              />
              <span>🍟 Es un extra / topping (se vende por separado)</span>
            </label>
          </div>

          <div className="form-group">
            <label className="checkbox-vibrante">
              <input
                type="checkbox"
                checked={sugeridoCarrito}
                onChange={(e) => setSugeridoCarrito(e.target.checked)}
              />
              <span>🛒 Sugerir en el carrito (venta cruzada con descuento)</span>
            </label>
            {sugeridoCarrito && (
              <input
                type="number"
                min="1"
                max="99"
                className="input-vibrante"
                placeholder="Descuento % solo al agregarlo desde el carrito"
                value={descuentoCarritoPct}
                onChange={(e) => setDescuentoCarritoPct(e.target.value)}
                style={{ marginTop: 8 }}
              />
            )}
          </div>

          {insumosDisponibles.length > 0 && (
            <div className="form-group">
              <label className="form-label">Insumos que usa (opcional, ej: 2 huevos)</label>
              <div className="pedido-filas">
                {filasInsumos.map((fila) => {
                  const insumoElegido = insumosDisponibles.find((i) => String(i.id) === fila.insumo);
                  return (
                    <div key={fila.key} className="pedido-fila">
                      <select
                        className="input-vibrante"
                        value={fila.insumo}
                        onChange={(e) => actualizarFilaInsumo(fila.key, { insumo: e.target.value })}
                      >
                        <option value="">Elegir insumo...</option>
                        {insumosDisponibles.map((i) => (
                          <option key={i.id} value={i.id}>{i.nombre} ({i.unidad})</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className="input-vibrante pedido-fila-cantidad"
                        value={fila.cantidad}
                        onChange={(e) => actualizarFilaInsumo(fila.key, { cantidad: e.target.value })}
                        title={insumoElegido ? `Cantidad en ${insumoElegido.unidad}` : 'Cantidad'}
                      />
                      <button
                        type="button"
                        className="pedido-fila-quitar"
                        onClick={() => quitarFilaInsumo(fila.key)}
                        disabled={filasInsumos.length === 1}
                        title="Quitar insumo"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
              <button type="button" className="btn-agregar-fila" onClick={agregarFilaInsumo}>
                + Agregar insumo
              </button>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Presentaciones (opcional, ej: Simple, Doble, Triple)</label>
            <p className="form-ayuda">Si cargás alguna, el cliente va a tener que elegir una y ese precio reemplaza al de arriba.</p>
            <div className="pedido-filas">
              {filasPresentaciones.map((fila, indice) => (
                <div key={fila.key} className="presentacion-card">
                  <div className="pedido-fila">
                    <input
                      type="text"
                      className="input-vibrante"
                      placeholder="Ej: Doble"
                      value={fila.nombre}
                      onChange={(e) => actualizarFilaPresentacion(fila.key, { nombre: e.target.value })}
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      className="input-vibrante pedido-fila-cantidad"
                      placeholder="Precio"
                      value={fila.precio}
                      onChange={(e) => actualizarFilaPresentacion(fila.key, { precio: e.target.value })}
                    />
                    <button
                      type="button"
                      className="pedido-fila-quitar"
                      onClick={() => quitarFilaPresentacion(fila.key)}
                      title="Quitar presentación"
                    >
                      ✕
                    </button>
                  </div>

                  {insumosDisponibles.length > 0 && (
                    <div className="presentacion-insumos-extra">
                      <span className="presentacion-insumos-extra-titulo">
                        🧾 Insumos extra de {fila.nombre.trim() ? `"${fila.nombre.trim()}"` : `esta variante (${indice + 1}ª)`}
                      </span>
                      <p className="presentacion-insumos-extra-ayuda">
                        Se suman a los insumos del producto de arriba (ej: "Doble" = los de la base + 1 medallón acá). Si el insumo tiene descuento, esta variante lo hereda sola.
                      </p>
                      {fila.insumosExtra.map((ie) => (
                        <div key={ie.key} className="pedido-fila">
                          <select
                            className="input-vibrante"
                            value={ie.insumo}
                            onChange={(e) => actualizarInsumoExtra(fila.key, ie.key, { insumo: e.target.value })}
                          >
                            <option value="">Elegir insumo...</option>
                            {insumosDisponibles.map((i) => (
                              <option key={i.id} value={i.id}>
                                {i.nombre} ({i.unidad}){i.descuento_activo ? ` · 🏷️ -${i.descuento_pct}%` : ''}
                              </option>
                            ))}
                          </select>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            className="input-vibrante pedido-fila-cantidad"
                            value={ie.cantidad}
                            onChange={(e) => actualizarInsumoExtra(fila.key, ie.key, { cantidad: e.target.value })}
                          />
                          <button
                            type="button"
                            className="pedido-fila-quitar"
                            onClick={() => quitarInsumoExtra(fila.key, ie.key)}
                            title="Quitar insumo extra"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      <button type="button" className="btn-agregar-fila" onClick={() => agregarInsumoExtra(fila.key)}>
                        + Agregar insumo extra
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button type="button" className="btn-agregar-fila" onClick={agregarFilaPresentacion}>
              + Agregar presentación
            </button>
          </div>

          <div className="form-group">
            <label className="form-label">Imagen</label>
            <label
              className="upload-box upload-box-vibrante"
              onDragOver={prevenirNavegador}
              onDrop={handleDrop}
            >
              {previewImagen ? (
                <img src={previewImagen} alt="Preview" className="upload-preview" />
              ) : (
                <div className="upload-icon">📷</div>
              )}
              <p className="upload-text">
                {imagen ? (
                  <span className="upload-file-name">{imagen.name}</span>
                ) : (
                  <><span className="upload-link">Cargar imagen</span> o arrastrar y soltar</>
                )}
              </p>
              <input
                type="file"
                accept="image/*"
                className="input-file-hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) setImagen(e.target.files[0]);
                }}
              />
            </label>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secundario" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn-vibrante" disabled={guardando}>
              {guardando ? 'Guardando...' : 'Guardar producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
