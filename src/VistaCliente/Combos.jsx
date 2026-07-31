import React from 'react';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

export default function Combos({ combos, onAgregar }) {
  if (combos.length === 0) return null;

  return (
    <section className="combos-seccion">
      <h2 className="combos-titulo fuente-impacto">🎉 Combos</h2>
      <div className="combos-seccion-grid">
        {combos.map((combo) => (
          <div key={combo.id} className="combo-publico-card">
            <div className="combo-publico-imagen">
              {combo.imagen ? (
                <img src={combo.imagen} alt={combo.nombre} />
              ) : (
                <span>🎁</span>
              )}
            </div>
            <div className="combo-publico-info">
              <h3>{combo.nombre}</h3>
              {combo.descripcion && <p className="combo-publico-descripcion">{combo.descripcion}</p>}
              <p className="combo-publico-incluye">
                Incluye: {combo.productos_detalle.map((p) => `${p.cantidad > 1 ? `${p.cantidad}x ` : ''}${p.nombre}`).join(' + ')}
              </p>
              <div className="combo-publico-footer">
                <span className="combo-publico-precio">{formatearPrecio(combo.precio)}</span>
                <button type="button" className="btn-vibrante" onClick={() => onAgregar(combo, 1)}>
                  Agregar al pedido
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
