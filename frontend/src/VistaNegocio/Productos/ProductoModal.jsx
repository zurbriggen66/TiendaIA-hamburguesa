import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function ProductoModal({ producto, categorias, categoriaPreseleccionada, onClose, onSaved }) {
  const [nombre, setNombre] = useState(producto ? producto.nombre : '');
  const [descripcion, setDescripcion] = useState(producto ? producto.descripcion : '');
  const [precio, setPrecio] = useState(producto ? producto.precio : '');
  const [categoriaId, setCategoriaId] = useState(
    producto ? producto.categoria : (categoriaPreseleccionada || (categorias[0] && categorias[0].id) || '')
  );
  const [destacado, setDestacado] = useState(producto ? producto.destacado : false);
  const [esExtra, setEsExtra] = useState(producto ? producto.es_extra : false);
  const [imagen, setImagen] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [insumos, setInsumos] = useState([]);
  const [insumosSeleccionados, setInsumosSeleccionados] = useState(producto ? producto.insumos : []);

  useEffect(() => {
    api.get('/insumos/').then((res) => setInsumos(res.data)).catch((err) => console.error('Error al cargar insumos:', err));
  }, []);

  const toggleInsumo = (id) => {
    setInsumosSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
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

    const formData = new FormData();
    formData.append('nombre', nombre.trim());
    formData.append('descripcion', descripcion);
    formData.append('precio', precio);
    formData.append('categoria', categoriaId);
    formData.append('destacado', destacado);
    formData.append('es_extra', esExtra);
    if (imagen) formData.append('imagen', imagen);
    // Mandamos siempre al menos una entrada (aunque sea vacía) para que el backend
    // sepa que "insumos" se envió a propósito y pueda vaciar la relación si corresponde;
    // omitir la clave del todo hace que Django REST Framework la ignore en un PATCH parcial.
    if (insumosSeleccionados.length === 0) {
      formData.append('insumos', '');
    } else {
      insumosSeleccionados.forEach((id) => formData.append('insumos', id));
    }

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
            <div className="form-group" style={{ flex: 1 }}>
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

            <div className="form-group" style={{ flex: 1 }}>
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

          {insumos.length > 0 && (
            <div className="form-group">
              <label className="form-label">Insumos que usa (opcional, para "Antojo del día")</label>
              <div className="insumos-checkbox-lista">
                {insumos.map((insumo) => (
                  <label key={insumo.id} className="checkbox-vibrante checkbox-insumo">
                    <input
                      type="checkbox"
                      checked={insumosSeleccionados.includes(insumo.id)}
                      onChange={() => toggleInsumo(insumo.id)}
                    />
                    <span>{insumo.nombre}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Imagen</label>
            <label
              className="upload-box upload-box-vibrante"
              style={{ display: 'block' }}
              onDragOver={prevenirNavegador}
              onDrop={handleDrop}
            >
              {previewImagen ? (
                <img src={previewImagen} alt="Preview" style={{ maxHeight: '100px', objectFit: 'contain', marginBottom: '12px', borderRadius: '8px' }} />
              ) : (
                <div className="upload-icon">📷</div>
              )}
              <p className="upload-text">
                {imagen ? (
                  <span style={{ color: '#16a34a', fontWeight: 'bold' }}>{imagen.name}</span>
                ) : (
                  <><span className="upload-link">Cargar imagen</span> o arrastrar y soltar</>
                )}
              </p>
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
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
