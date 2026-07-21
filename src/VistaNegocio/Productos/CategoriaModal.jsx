import React, { useState } from 'react';
import api from '../../services/api';

export default function CategoriaModal({ categoria, onClose, onSaved }) {
  const [nombre, setNombre] = useState(categoria ? categoria.nombre : '');
  const [imagen, setImagen] = useState(null);
  const [guardando, setGuardando] = useState(false);

  const previewImagen = imagen ? URL.createObjectURL(imagen) : (categoria ? categoria.imagen : null);

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
    if (!nombre.trim()) {
      alert('Ponele un nombre a la categoría.');
      return;
    }

    const formData = new FormData();
    formData.append('nombre', nombre.trim());
    if (imagen) formData.append('imagen', imagen);

    setGuardando(true);
    try {
      if (categoria) {
        await api.patch(`/categorias/${categoria.id}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.post('/categorias/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      onSaved();
    } catch (error) {
      console.error('Error al guardar la categoría:', error);
      alert('Hubo un problema al guardar la categoría.');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{categoria ? 'Editar categoría' : 'Nueva categoría'}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <form onSubmit={guardar}>
          <div className="form-group">
            <label className="form-label">Nombre</label>
            <input
              type="text"
              className="input-vibrante"
              placeholder="Ej: Burgers Clásicas"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              autoFocus
            />
          </div>

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
                <div className="upload-icon">🍔</div>
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
              {guardando ? 'Guardando...' : 'Guardar categoría'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
