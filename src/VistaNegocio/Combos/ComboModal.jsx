import React, { useEffect, useState } from 'react';
import api from '../../services/api';

export default function ComboModal({ combo, onClose, onSaved }) {
  const [nombre, setNombre] = useState(combo ? combo.nombre : '');
  const [descripcion, setDescripcion] = useState(combo ? combo.descripcion : '');
  const [precio, setPrecio] = useState(combo ? combo.precio : '');
  const [activo, setActivo] = useState(combo ? combo.activo : false);
  const [imagen, setImagen] = useState(null);
  const [guardando, setGuardando] = useState(false);
  const [productos, setProductos] = useState([]);
  const [productosSeleccionados, setProductosSeleccionados] = useState(
    combo ? combo.productos : []
  );

  useEffect(() => {
    api.get('/productos/').then((res) => setProductos(res.data)).catch((err) => console.error('Error al cargar productos:', err));
  }, []);

  const toggleProducto = (id) => {
    setProductosSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const previewImagen = imagen ? URL.createObjectURL(imagen) : (combo ? combo.imagen : null);

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
    if (!nombre.trim() || !precio) {
      alert('Completá al menos el nombre y el precio del combo.');
      return;
    }
    if (productosSeleccionados.length === 0) {
      alert('Elegí al menos un producto para el combo.');
      return;
    }

    const formData = new FormData();
    formData.append('nombre', nombre.trim());
    formData.append('descripcion', descripcion);
    formData.append('precio', precio);
    formData.append('activo', activo);
    if (imagen) formData.append('imagen', imagen);
    productosSeleccionados.forEach((id) => formData.append('productos', id));

    setGuardando(true);
    try {
      if (combo) {
        await api.patch(`/combos/${combo.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/combos/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      onSaved();
    } catch (error) {
      console.error('Error al guardar el combo:', error);
      alert('Hubo un problema al guardar el combo.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{combo ? 'Editar combo' : 'Nuevo combo'}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={guardar}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              type="text"
              className="input-vibrante"
              placeholder='Ej: Combo Jueves: Americana Doble + Bebida'
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label">Descripción (opcional)</label>
            <textarea
              className="input-vibrante"
              rows={2}
              placeholder="Ej: Por el día de los enamorados..."
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Precio del combo</label>
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
            <label className="form-label">Productos que incluye</label>
            {productos.length === 0 ? (
              <p className="aviso-sin-insumos">Todavía no cargaste productos en el menú.</p>
            ) : (
              <div className="insumos-checkbox-lista">
                {productos.map((p) => (
                  <label key={p.id} className="checkbox-vibrante checkbox-insumo">
                    <input
                      type="checkbox"
                      checked={productosSeleccionados.includes(p.id)}
                      onChange={() => toggleProducto(p.id)}
                    />
                    <span>{p.nombre}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="form-group">
            <label className="checkbox-vibrante">
              <input
                type="checkbox"
                checked={activo}
                onChange={(e) => setActivo(e.target.checked)}
              />
              <span>🟢 Combo activo (visible en la web)</span>
            </label>
          </div>

          <div className="form-group">
            <label className="form-label">Imagen (opcional)</label>
            <label
              className="upload-box upload-box-vibrante"
              onDragOver={prevenirNavegador}
              onDrop={handleDrop}
            >
              {previewImagen ? (
                <img src={previewImagen} alt="Preview" className="upload-preview" />
              ) : (
                <div className="upload-icon">🎁</div>
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
              {guardando ? 'Guardando...' : 'Guardar combo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
