import React, { useState } from 'react';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

export default function Combos({ combos, onAgregar }) {
  const [comboAbiertoId, setComboAbiertoId] = useState(null);

  if (combos.length === 0) return null;

  const alternarDescripcion = (id) => {
    setComboAbiertoId((actual) => (actual === id ? null : id));
  };

  return (
    <section 
      className="combos-seccion" 
      style={{ 
        padding: '16px 0 20px 0', 
        background: 'linear-gradient(135deg, #f26800 0%, #cc5500 100%)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
        marginTop: '0',        // ← Eliminamos el margen superior para pegar la franja
        marginBottom: '0',     // ← Opcional: pegarlo también por abajo si lo necesitas
        width: '100%',
        overflow: 'hidden'
      }}
    >
      <h2 
        className="combos-titulo fuente-impacto" 
        style={{ 
          textAlign: 'center', 
          color: '#ffffff', 
          textShadow: '2px 2px 4px rgba(0,0,0,0.4)', 
          margin: '0 0 14px 0', // ← Aseguramos que el título no empuje con margin-top
          fontSize: '1.6rem',
          letterSpacing: '0.5px'
        }}
      >
        COMBOS PREMIUM 🔥
      </h2>
      
      <div 
        className="combos-seccion-grid" 
        style={{ 
          display: 'flex',
          overflowX: 'auto',
          gap: '14px',
          padding: '4px 5vw 12px 5vw',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
          justifyContent: combos.length === 1 ? 'center' : 'flex-start',
        }}
      >
        {combos.map((combo) => {
          const estaAbierto = comboAbiertoId === combo.id;

          return (
            <div
              key={combo.id}
              className="combo-publico-card"
              onClick={() => alternarDescripcion(combo.id)}
              style={{
                cursor: combo.descripcion ? 'pointer' : 'default',
                flex: '0 0 75vw',
                maxWidth: '330px', 
                scrollSnapAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: '#1c1a17',
                borderRadius: '14px',
                border: '1px solid #3d2b1f',
                boxShadow: '0 6px 16px rgba(0,0,0,0.4)',
                overflow: 'hidden'
              }}
            >
              <div
                className="combo-publico-imagen"
                style={{
                  width: '100%',
                  height: '210px',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  overflow: 'hidden',
                  backgroundColor: '#0a0a0a'
                }}
              >
                {combo.imagen ? (
                  <img 
                    src={combo.imagen} 
                    alt={combo.nombre} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <span style={{ fontSize: '3rem' }}>🎁</span>
                )}
              </div>
              
              <div className="combo-publico-info" style={{ padding: '14px' }}>
                <h3 style={{ margin: '0 0 6px 0', fontSize: '1.3rem', color: '#ffffff' }}>
                  {combo.nombre}
                </h3>

                {combo.descripcion && estaAbierto && (
                  <p className="combo-publico-descripcion" style={{ color: '#cccccc', marginBottom: '10px', fontSize: '0.85rem' }}>
                    {combo.descripcion}
                  </p>
                )}

                <p className="combo-publico-incluye" style={{ color: '#a0a0a0', fontSize: '0.85rem', marginBottom: '14px' }}>
                  Incluye: {combo.productos_detalle.map((p) => `${p.cantidad > 1 ? `${p.cantidad}x ` : ''}${p.nombre}`).join(' + ')}
                </p>
                
                <div className="combo-publico-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="combo-publico-precio" style={{ color: '#56c271', fontSize: '1.25rem', fontWeight: 'bold' }}>
                    {formatearPrecio(combo.precio)}
                  </span>
                  <button
                    type="button"
                    className="btn-vibrante"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAgregar(combo, 1);
                    }}
                    style={{
                      backgroundColor: '#f26800',
                      color: '#ffffff',
                      border: 'none',
                      padding: '9px 14px',
                      borderRadius: '8px',
                      fontWeight: 'bold',
                      fontSize: '0.88rem',
                      cursor: 'pointer',
                      boxShadow: '0 3px 8px rgba(242, 104, 0, 0.35)'
                    }}
                  >
                    Agregar al pedido
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}