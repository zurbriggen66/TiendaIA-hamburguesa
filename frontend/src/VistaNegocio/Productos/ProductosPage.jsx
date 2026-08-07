import React, { useEffect, useState, useCallback } from 'react';
import api from '../../services/api';
import CategoriaModal from './CategoriaModal';
import ProductoModal from './ProductoModal';
import DescuentoProductoModal from './DescuentoProductoModal';

const COLORES_CHIP = ['chip-mostaza', 'chip-naranja', 'chip-tomate'];

export default function ProductosPage() {
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  const [cargando, setCargando] = useState(true);

  const [modalCategoria, setModalCategoria] = useState(null); // { categoria: null|obj }
  const [modalProducto, setModalProducto] = useState(null); // { producto: null|obj }
  const [modalDescuento, setModalDescuento] = useState(null); // producto|null

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [resCategorias, resProductos] = await Promise.all([
        api.get('/categorias/'),
        api.get('/productos/'),
      ]);
      setCategorias(resCategorias.data);
      setProductos(resProductos.data);
    } catch (error) {
      console.error('Error al cargar categorías/productos:', error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const eliminarCategoria = async (categoria) => {
    if (!window.confirm(`¿Eliminar la categoría "${categoria.nombre}"?`)) return;
    try {
      await api.delete(`/categorias/${categoria.id}/`);
      if (categoriaActiva === categoria.id) setCategoriaActiva('todas');
      cargarDatos();
    } catch (error) {
      const detalle = error.response?.data?.detail;
      alert(detalle || 'No se pudo eliminar la categoría.');
    }
  };

  const eliminarProducto = async (producto) => {
    if (!window.confirm(`¿Eliminar el producto "${producto.nombre}"?`)) return;
    try {
      await api.delete(`/productos/${producto.id}/`);
      cargarDatos();
    } catch (error) {
      console.error('Error al eliminar el producto:', error);
      const detalle = error.response?.data?.detail;
      alert(detalle || 'No se pudo eliminar el producto.');
    }
  };

  const productosFiltrados = categoriaActiva === 'todas'
    ? productos
    : productos.filter((p) => p.categoria === categoriaActiva);

  const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

  return (
    <div className="productos-page">
      <header className="main-header">
        <h2>Productos & Stock</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        {/* Chips de categorías */}
        <div className="categorias-bar">
          <button
            type="button"
            className={`chip-categoria chip-todas ${categoriaActiva === 'todas' ? 'chip-activo' : ''}`}
            onClick={() => setCategoriaActiva('todas')}
          >
            Todas
          </button>

          {categorias.map((cat, i) => (
            <div
              key={cat.id}
              className={`chip-categoria ${COLORES_CHIP[i % COLORES_CHIP.length]} ${categoriaActiva === cat.id ? 'chip-activo' : ''}`}
              onClick={() => setCategoriaActiva(cat.id)}
            >
              {cat.imagen && <img src={cat.imagen} alt="" className="chip-imagen" />}
              <span>{cat.nombre}</span>
              <span className="chip-acciones">
                <button type="button" title="Editar categoría" onClick={(e) => { e.stopPropagation(); setModalCategoria({ categoria: cat }); }}>✎</button>
                <button type="button" title="Eliminar categoría" onClick={(e) => { e.stopPropagation(); eliminarCategoria(cat); }}>🗑</button>
              </span>
            </div>
          ))}

          <button type="button" className="chip-categoria chip-nueva" onClick={() => setModalCategoria({ categoria: null })}>
            + Nueva categoría
          </button>
        </div>

        {cargando ? (
          <p className="estado-vacio">Cargando...</p>
        ) : categorias.length === 0 ? (
          <div className="estado-vacio">
            <p>Todavía no creaste ninguna categoría.</p>
            <button type="button" className="btn-vibrante" onClick={() => setModalCategoria({ categoria: null })}>
              Crear la primera categoría
            </button>
          </div>
        ) : (
          <div className="productos-grid">
            {productosFiltrados.map((prod) => (
              <div key={prod.id} className="producto-card">
                {prod.destacado && <span className="badge-destacado">⭐ Destacado</span>}
                {prod.es_extra && <span className="badge-extra">🍟 Extra</span>}
                {prod.descuento_activo && <span className="badge-descuento">🏷️ -{prod.descuento_pct}%</span>}
                <div className="producto-imagen-wrap">
                  {prod.imagen ? (
                    <img src={prod.imagen} alt={prod.nombre} className="producto-imagen" />
                  ) : (
                    <div className="producto-imagen-placeholder">🍔</div>
                  )}
                </div>
                <div className="producto-info">
                  <span className="producto-categoria-tag">{prod.categoria_nombre}</span>
                  <h4>{prod.nombre}</h4>
                  {prod.descripcion && <p className="producto-descripcion">{prod.descripcion}</p>}
                  <div className="producto-footer">
                    {prod.descuento_activo ? (
                      <span className="producto-precio">
                        <span className="precio-tachado">{formatearPrecio(prod.precio)}</span>
                        {' '}{formatearPrecio(prod.precio_actual)}
                      </span>
                    ) : (
                      <span className="producto-precio">{formatearPrecio(prod.precio)}</span>
                    )}
                    <div className="producto-acciones">
                      <button type="button" title="Descuento por tiempo" onClick={() => setModalDescuento(prod)}>🏷️</button>
                      <button type="button" onClick={() => setModalProducto({ producto: prod })}>✎</button>
                      <button type="button" onClick={() => eliminarProducto(prod)}>🗑</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <button
              type="button"
              className="producto-card producto-card-nueva"
              onClick={() => setModalProducto({ producto: null })}
            >
              <span className="producto-card-nueva-icono">+</span>
              <span>Nuevo producto</span>
            </button>
          </div>
        )}
      </div>

      {modalCategoria && (
        <CategoriaModal
          categoria={modalCategoria.categoria}
          onClose={() => setModalCategoria(null)}
          onSaved={() => { setModalCategoria(null); cargarDatos(); }}
        />
      )}

      {modalProducto && (
        <ProductoModal
          producto={modalProducto.producto}
          categorias={categorias}
          categoriaPreseleccionada={categoriaActiva !== 'todas' ? categoriaActiva : null}
          onClose={() => setModalProducto(null)}
          onSaved={() => { setModalProducto(null); cargarDatos(); }}
        />
      )}

      {modalDescuento && (
        <DescuentoProductoModal
          producto={modalDescuento}
          onClose={() => setModalDescuento(null)}
          onSaved={() => { setModalDescuento(null); cargarDatos(); }}
        />
      )}
    </div>
  );
}
