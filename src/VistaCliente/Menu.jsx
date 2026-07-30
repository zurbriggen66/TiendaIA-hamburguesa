import React, { useState, useEffect } from 'react';

const COLORES_CHIP = ['chip-mostaza', 'chip-naranja', 'chip-tomate'];

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

function TarjetaProducto({ producto, onAgregar, onVerDetalle }) {
  const [cantidad, setCantidad] = useState(1);

  const agregar = () => {
    onAgregar(producto, cantidad);
    setCantidad(1);
  };

  return (
    <div className="menu-tarjeta">
      {producto.destacado && <span className="badge-destacado">⭐ Destacado</span>}
      <div
        className="menu-tarjeta-imagen"
        onClick={() => onVerDetalle(producto)}
        role="button"
        tabIndex={0}
        aria-label={`Ver detalle de ${producto.nombre}`}
        onKeyDown={(e) => e.key === 'Enter' && onVerDetalle(producto)}
      >
        {producto.imagen ? (
          <img src={producto.imagen} alt={producto.nombre} />
        ) : (
          <div className="menu-tarjeta-imagen-placeholder">🍔</div>
        )}
      </div>
      <div className="menu-tarjeta-info">
        <span className="producto-categoria-tag">{producto.categoria_nombre}</span>
        <h3 className="menu-tarjeta-titulo-clickeable" onClick={() => onVerDetalle(producto)}>{producto.nombre}</h3>
        {producto.descripcion && <p className="menu-tarjeta-descripcion">{producto.descripcion}</p>}
        <div className="menu-tarjeta-footer">
          <span className="menu-tarjeta-precio">{formatearPrecio(producto.precio)}</span>
          <div className="menu-tarjeta-cantidad">
            <button type="button" onClick={() => setCantidad((c) => Math.max(1, c - 1))}>−</button>
            <span>{cantidad}</span>
            <button type="button" onClick={() => setCantidad((c) => c + 1)}>+</button>
          </div>
        </div>
        <button type="button" className="btn-vibrante menu-tarjeta-agregar" onClick={agregar}>
          Agregar al pedido
        </button>
      </div>
    </div>
  );
}

function FilaExtra({ extra, onAgregar }) {
  return (
    <div className="extra-fila">
      <div className="extra-fila-imagen">
        {extra.imagen ? (
          <img src={extra.imagen} alt={extra.nombre} />
        ) : (
          <span>🍽️</span>
        )}
      </div>
      <div className="extra-fila-info">
        <h4>{extra.nombre}</h4>
        {extra.descripcion && <p>{extra.descripcion}</p>}
      </div>
      <span className="extra-fila-precio">{formatearPrecio(extra.precio)}</span>
      <button type="button" className="btn-vibrante extra-fila-agregar" onClick={() => onAgregar(extra, 1)}>
        + Agregar
      </button>
    </div>
  );
}

function ModalProducto({ producto, onCerrar, onAgregar }) {
  const [cantidad, setCantidad] = useState(1);

  useEffect(() => {
    setCantidad(1);
  }, [producto]);

  useEffect(() => {
    if (!producto) return undefined;

    const alPresionarTecla = (e) => e.key === 'Escape' && onCerrar();
    document.addEventListener('keydown', alPresionarTecla);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', alPresionarTecla);
      document.body.style.overflow = '';
    };
  }, [producto, onCerrar]);

  if (!producto) return null;

  const agregar = () => {
    onAgregar(producto, cantidad);
    onCerrar();
  };

  return (
    <div className="modal-producto-fondo" onClick={onCerrar}>
      <div className="modal-producto" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-producto-cerrar" onClick={onCerrar} aria-label="Cerrar">
          ✕
        </button>

        <div className="modal-producto-imagen">
          {producto.imagen ? (
            <>
              <div
                className="modal-producto-imagen-fondo"
                style={{ backgroundImage: `url(${producto.imagen})` }}
                aria-hidden="true"
              />
              <img src={producto.imagen} alt={producto.nombre} className="modal-producto-imagen-real" />
            </>
          ) : (
            <div className="menu-tarjeta-imagen-placeholder">🍔</div>
          )}
        </div>

        <div className="modal-producto-info">
          {producto.destacado && <span className="badge-destacado">⭐ Destacado</span>}
          <span className="producto-categoria-tag">{producto.categoria_nombre}</span>
          <h3>{producto.nombre}</h3>
          {producto.descripcion && <p className="modal-producto-descripcion">{producto.descripcion}</p>}

          <div className="menu-tarjeta-footer">
            <span className="menu-tarjeta-precio">{formatearPrecio(producto.precio)}</span>
            <div className="menu-tarjeta-cantidad">
              <button type="button" onClick={() => setCantidad((c) => Math.max(1, c - 1))}>−</button>
              <span>{cantidad}</span>
              <button type="button" onClick={() => setCantidad((c) => c + 1)}>+</button>
            </div>
          </div>

          <button type="button" className="btn-vibrante modal-producto-agregar" onClick={agregar}>
            Agregar al pedido
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Menu({ categorias, productos, onAgregar }) {
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [productoDetalle, setProductoDetalle] = useState(null);

  const principales = productos.filter((p) => !p.es_extra);
  const extras = productos.filter((p) => p.es_extra);

  const productosFiltrados = categoriaActiva === 'todas'
    ? principales
    : principales.filter((p) => p.categoria === categoriaActiva);

  return (
    <section className="menu-seccion" id="menu">
      <h2 className="menu-titulo fuente-impacto">Productos destacados</h2>

      {categorias.length > 0 && (
        <div className="categorias-bar menu-categorias-bar">
          <button
            type="button"
            className={`chip-categoria chip-todas ${categoriaActiva === 'todas' ? 'chip-activo' : ''}`}
            onClick={() => setCategoriaActiva('todas')}
          >
            Todas
          </button>
          {categorias.map((cat, i) => (
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

      {productosFiltrados.length === 0 ? (
        <p className="menu-vacio">Todavía no hay productos cargados en esta categoría.</p>
      ) : (
        <div className="menu-grid">
          {productosFiltrados.map((producto) => (
            <TarjetaProducto
              key={producto.id}
              producto={producto}
              onAgregar={onAgregar}
              onVerDetalle={setProductoDetalle}
            />
          ))}
        </div>
      )}

      {extras.length > 0 && (
        <div className="extras-seccion">
          <h2 className="extras-titulo fuente-impacto">Extras</h2>
          <div className="extras-lista">
            {extras.map((extra) => (
              <FilaExtra key={extra.id} extra={extra} onAgregar={onAgregar} />
            ))}
          </div>
        </div>
      )}

      <ModalProducto
        producto={productoDetalle}
        onCerrar={() => setProductoDetalle(null)}
        onAgregar={onAgregar}
      />

      <style>{`
        .menu-tarjeta-imagen {
          cursor: pointer;
        }

        .menu-tarjeta-titulo-clickeable {
          cursor: pointer;
        }
        .menu-tarjeta-titulo-clickeable:hover {
          text-decoration: underline;
        }

        .modal-producto-fondo {
          position: fixed;
          inset: 0;
          background: rgba(20, 12, 8, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
          z-index: 1000;
          animation: modalFondoAparece 0.25s ease-out;
        }

        @keyframes modalFondoAparece {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-producto {
          background: #fff;
          border-radius: 24px;
          max-width: 520px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          box-shadow: 0 30px 60px rgba(0, 0, 0, 0.35);
          animation: modalAparece 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        @keyframes modalAparece {
          from {
            opacity: 0;
            transform: scale(0.85) translateY(20px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .modal-producto-cerrar {
          position: absolute;
          top: 14px;
          right: 14px;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          border: none;
          background: rgba(255, 255, 255, 0.9);
          font-size: 18px;
          cursor: pointer;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.15s ease, background 0.15s ease;
        }
        .modal-producto-cerrar:hover {
          background: #fff;
          transform: scale(1.1);
        }

        .modal-producto-imagen {
          width: 100%;
          height: 340px;
          overflow: hidden;
          border-radius: 24px 24px 0 0;
          position: relative;
          background: linear-gradient(135deg, #f5efe8, #ece1d6);
        }
        .modal-producto-imagen-fondo {
          position: absolute;
          inset: 0;
          background-size: cover;
          background-position: center;
          filter: blur(30px) brightness(0.7) saturate(1.15);
          transform: scale(1.25);
        }
        .modal-producto-imagen-real {
          position: relative;
          z-index: 1;
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }
        .modal-producto-imagen::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(180deg, rgba(0, 0, 0, 0.25) 0%, rgba(0, 0, 0, 0) 25%);
          pointer-events: none;
          z-index: 2;
        }

        .modal-producto-info {
          padding: 26px 28px 28px;
          display: flex;
          flex-direction: column;
          background: #fffdfb;
        }

        .modal-producto-info .badge-destacado {
          position: static;
          align-self: flex-start;
          margin-bottom: 8px;
        }

        .modal-producto-info .producto-categoria-tag {
          align-self: flex-start;
          margin-bottom: 10px;
        }

        .modal-producto-info h3 {
          margin: 0 0 8px;
          font-size: 26px;
          font-weight: 800;
          line-height: 1.2;
          color: #241a13;
          letter-spacing: -0.01em;
        }

        .modal-producto-descripcion {
          color: #6f6259;
          line-height: 1.55;
          font-size: 15px;
          margin: 0 0 20px;
        }

        .modal-producto-info .menu-tarjeta-footer {
          padding-top: 18px;
          border-top: 1px solid #f0e6dd;
          margin-bottom: 4px;
        }

        .modal-producto-info .menu-tarjeta-precio {
          font-size: 22px;
          font-weight: 800;
          color: #1f8a4c;
        }

        .modal-producto-info .menu-tarjeta-cantidad {
          display: flex;
          align-items: center;
          gap: 14px;
          border: 1px solid #ece1d6;
          border-radius: 999px;
          padding: 4px 6px;
        }
        .modal-producto-info .menu-tarjeta-cantidad button {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: none;
          background: #f5efe8;
          color: #241a13;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease;
        }
        .modal-producto-info .menu-tarjeta-cantidad button:hover {
          background: #ebdccb;
        }
        .modal-producto-info .menu-tarjeta-cantidad span {
          min-width: 16px;
          text-align: center;
          font-weight: 700;
          color: #241a13;
        }

        .modal-producto-agregar {
          margin-top: 20px;
          width: 100%;
          font-size: 16px;
        }

        @media (prefers-reduced-motion: reduce) {
          .modal-producto-fondo,
          .modal-producto {
            animation: none;
          }
        }
      `}</style>
    </section>
  );
}