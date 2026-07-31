import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import ComboModal from './ComboModal';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

export default function CombosPage() {
  const [combos, setCombos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalCombo, setModalCombo] = useState(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get('/combos/');
      setCombos(data);
    } catch (error) {
      console.error('Error al cargar combos:', error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const toggleActivo = async (combo) => {
    try {
      const { data } = await api.patch(`/combos/${combo.id}/`, { activo: !combo.activo });
      setCombos((prev) => prev.map((c) => (c.id === combo.id ? data : c)));
    } catch (error) {
      console.error('Error al cambiar el estado del combo:', error);
      alert('No se pudo cambiar el estado del combo.');
    }
  };

  const eliminarCombo = async (combo) => {
    if (!window.confirm(`¿Eliminar el combo "${combo.nombre}"?`)) return;
    try {
      await api.delete(`/combos/${combo.id}/`);
      setCombos((prev) => prev.filter((c) => c.id !== combo.id));
    } catch (error) {
      console.error('Error al eliminar el combo:', error);
      const detalle = error.response?.data?.detail;
      alert(detalle || 'No se pudo eliminar el combo.');
    }
  };

  return (
    <div className="combos-page">
      <header className="main-header">
        <h2>Combos</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        {cargando ? (
          <p className="estado-vacio">Cargando...</p>
        ) : combos.length === 0 ? (
          <div className="estado-vacio">
            <p>Todavía no armaste ningún combo.</p>
            <button type="button" className="btn-vibrante" onClick={() => setModalCombo({ combo: null })}>
              Crear el primer combo
            </button>
          </div>
        ) : (
          <div className="combos-grid">
            {combos.map((combo) => (
              <div key={combo.id} className="combo-card">
                <span className={`badge-combo-activo ${combo.activo ? 'activo' : 'inactivo'}`}>
                  {combo.activo ? '🟢 Activo' : '⚪ Inactivo'}
                </span>
                <div className="combo-card-imagen">
                  {combo.imagen ? (
                    <img src={combo.imagen} alt={combo.nombre} />
                  ) : (
                    <div className="menu-tarjeta-imagen-placeholder">🎁</div>
                  )}
                </div>
                <div className="combo-card-info">
                  <h4>{combo.nombre}</h4>
                  {combo.descripcion && <p className="combo-card-descripcion">{combo.descripcion}</p>}
                  <p className="combo-card-incluye">
                    Incluye: {combo.productos_detalle.map((p) => `${p.cantidad > 1 ? `${p.cantidad}x ` : ''}${p.nombre}`).join(' + ')}
                  </p>
                  <div className="combo-card-footer">
                    <span className="combo-card-precio">{formatearPrecio(combo.precio)}</span>
                    <div className="combo-card-acciones">
                      <button type="button" onClick={() => toggleActivo(combo)} title={combo.activo ? 'Desactivar' : 'Activar'}>
                        {combo.activo ? '⏸' : '▶'}
                      </button>
                      <button type="button" onClick={() => setModalCombo({ combo })}>✎</button>
                      <button type="button" onClick={() => eliminarCombo(combo)}>🗑</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="combo-card combo-card-nuevo"
              onClick={() => setModalCombo({ combo: null })}
            >
              <span className="producto-card-nueva-icono">+</span>
              <span>Nuevo combo</span>
            </button>
          </div>
        )}
      </div>

      {modalCombo && (
        <ComboModal
          combo={modalCombo.combo}
          onClose={() => setModalCombo(null)}
          onSaved={() => { setModalCombo(null); cargarDatos(); }}
        />
      )}
    </div>
  );
}
