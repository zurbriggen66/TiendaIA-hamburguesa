import React, { useState } from 'react';

const COLORES_CHIP = ['chip-mostaza', 'chip-naranja', 'chip-tomate'];

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

function TarjetaProducto({ producto, onAgregar }) {
  const [cantidad, setCantidad] = useState(1);

  const agregar = () => {
    onAgregar(producto, cantidad);
    setCantidad(1);
  };

  return (
    <div className="menu-tarjeta">
      {producto.destacado && <span className="badge-destacado">⭐ Destacado</span>}
      <div className="menu-tarjeta-imagen">
        {producto.imagen ? (
          <img src={producto.imagen} alt={producto.nombre} />
        ) : (
          <div className="menu-tarjeta-imagen-placeholder">🍔</div>
        )}
      </div>
      <div className="menu-tarjeta-info">
        <span className="producto-categoria-tag">{producto.categoria_nombre}</span>
        <h3>{producto.nombre}</h3>
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

export default function Menu({ categorias, productos, onAgregar }) {
  const [categoriaActiva, setCategoriaActiva] = useState('todas');

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
            <TarjetaProducto key={producto.id} producto={producto} onAgregar={onAgregar} />
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
    </section>
  );
}
