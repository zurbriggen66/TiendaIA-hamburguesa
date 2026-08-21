import React, { useState, useEffect, useRef } from 'react';
import { useReveal } from '../utils/useReveal';
import { presentacionesConBase } from '../utils/presentaciones';
import { medallonesDe } from '../utils/medallones';

// Indicador sutil de cuántos medallones trae cada presentación: discos apilados,
// que es lo que el cliente ve al morder. Sin texto extra, solo la pista visual.
function Medallones({ nombre }) {
  const cantidad = medallonesDe(nombre);
  if (!cantidad) return null;
  return (
    <span
      className="medallones"
      title={`${cantidad} ${cantidad === 1 ? 'medallón' : 'medallones'} de carne`}
      aria-label={`${cantidad} ${cantidad === 1 ? 'medallón' : 'medallones'} de carne`}
    >
      {Array.from({ length: cantidad }, (_, i) => (
        <span key={i} className="medallon" style={{ '--i': i }} />
      ))}
    </span>
  );
}

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

// Con presentación elegida, la base es el precio de esa presentación en vez del precio
// de lista del producto (que pasa a ser sólo un valor de referencia sin usar).
const precioBaseSinDescuento = (producto, presentacion) => Number(presentacion ? presentacion.precio : producto.precio);

// Si la presentación elegida suma un insumo con descuento activo (ej. "Doble" con un
// medallón en oferta), ese % también compite con el descuento del producto — gana el
// que le dé más descuento al cliente, igual que hace el servidor al cobrar el pedido.
const tieneDescuento = (producto, presentacion) =>
  Boolean(producto.descuento_activo || (presentacion && Number(presentacion.descuento_pct) > 0));

const precioBaseConDescuento = (producto, presentacion) => {
  const base = precioBaseSinDescuento(producto, presentacion);
  if (!presentacion) {
    // Sin presentación, se respeta el precio_actual que ya viene calculado (y redondeado)
    // por el servidor.
    return producto.descuento_activo ? Number(producto.precio_actual) : base;
  }
  const candidatos = [];
  if (producto.descuento_activo) {
    candidatos.push(Math.round(base * (1 - Number(producto.descuento_pct) / 100)));
  }
  if (Number(presentacion.descuento_pct) > 0) {
    candidatos.push(Math.round(base * (1 - Number(presentacion.descuento_pct) / 100)));
  }
  return candidatos.length > 0 ? Math.min(...candidatos) : base;
};

const calcularPrecioTotal = (producto, extrasDisponibles, cantidadesExtras, cantidad, usarDescuento = true, presentacion = null) => {
  const costoExtras = extrasDisponibles.reduce((acc, e) => acc + Number(e.precio) * (cantidadesExtras[e.id] || 0), 0);
  const precioUnidad = usarDescuento ? precioBaseConDescuento(producto, presentacion) : precioBaseSinDescuento(producto, presentacion);
  return (precioUnidad + costoExtras) * cantidad;
};

function SelectorExtras({ extrasDisponibles, cantidadesExtras, onCambiarCantidad }) {
  if (extrasDisponibles.length === 0) return null;

  return (
    <div className="menu-tarjeta-extras">
      <span className="presentaciones-titulo">Toppings</span>
      {extrasDisponibles.map((extra) => {
        const cantidad = cantidadesExtras[extra.id] || 0;
        return (
          <div key={extra.id} className={`extra-selector-fila ${cantidad > 0 ? 'extra-selector-fila-activa' : ''}`}>
            <span className="extra-selector-nombre">{extra.nombre} <small>(+{formatearPrecio(extra.precio)})</small></span>
            <div className="extra-selector-stepper">
              <button type="button" onClick={() => onCambiarCantidad(extra.id, Math.max(0, cantidad - 1))} disabled={cantidad === 0}>−</button>
              <span>{cantidad}</span>
              <button type="button" onClick={() => onCambiarCantidad(extra.id, cantidad + 1)}>+</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function SelectorPresentaciones({ producto, presentaciones, presentacionId, onElegir }) {
  if (!presentaciones || presentaciones.length === 0) return null;

  return (
    <div className="menu-tarjeta-presentaciones">
      <span className="presentaciones-titulo">Presentaciones</span>
      {presentaciones.map((p) => {
        const conDescuento = tieneDescuento(producto, p);
        return (
          <button
            type="button"
            key={p.id}
            className={`presentacion-selector-fila ${presentacionId === p.id ? 'presentacion-selector-fila-activa' : ''}`}
            onClick={() => onElegir(p.id)}
            aria-pressed={presentacionId === p.id}
          >
            <span className="presentacion-selector-check" aria-hidden="true" />
            <span className="presentacion-selector-nombre">
              {p.nombre}
              <Medallones nombre={p.nombre} />
              {conDescuento && <span className="badge-descuento badge-descuento-chica">🏷️ -{Math.max(producto.descuento_pct || 0, p.descuento_pct || 0)}%</span>}
            </span>
            <span className="presentacion-selector-precio">
              {conDescuento && <span className="precio-tachado">{formatearPrecio(p.precio)}</span>}
              {formatearPrecio(precioBaseConDescuento(producto, p))}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function TarjetaProducto({ producto, onVerDetalle }) {
  const [ref, visible] = useReveal();
  return (
    <div ref={ref} className={`menu-tarjeta reveal ${visible ? 'reveal-visible' : ''}`}>
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
        <div className="menu-tarjeta-imagen-degradado" aria-hidden="true" />
        {producto.categoria_nombre && (
          <span className="menu-tarjeta-categoria-flotante">{producto.categoria_nombre}</span>
        )}
        {producto.descuento_activo && (
          <span className="badge-descuento menu-tarjeta-badge-descuento">🏷️ -{producto.descuento_pct}%</span>
        )}
        <h3 className="menu-tarjeta-titulo-flotante fuente-impacto">{producto.nombre}</h3>
      </div>
      <div className="menu-tarjeta-info">
        {producto.descripcion && <p className="menu-tarjeta-descripcion">{producto.descripcion}</p>}
        <div className="menu-tarjeta-divisor" aria-hidden="true" />
        <div className="menu-tarjeta-footer">
          <span className="menu-tarjeta-precio">{formatearPrecio(producto.precio)}</span>
          <button type="button" className="menu-tarjeta-toppings" onClick={() => onVerDetalle(producto)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M8 7V6a4 4 0 118 0v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
              <path d="M5.5 7h13l1.3 12.2a2 2 0 0 1-2 2.3H6.2a2 2 0 0 1-2-2.3L5.5 7z" fill="currentColor" />
            </svg>
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalProducto({ producto, extrasDisponibles, onCerrar, onAgregar }) {
  const [cantidad, setCantidad] = useState(1);
  const [cantidadesExtras, setCantidadesExtras] = useState({});
  const [presentacionId, setPresentacionId] = useState(null);

  useEffect(() => {
    setCantidad(1);
    setCantidadesExtras({});
    // La primera opción es siempre la más barata (presentacionesConBase ya la deja
    // primera), así "Agregar al pedido" funciona sin tocar nada más.
    setPresentacionId(producto ? presentacionesConBase(producto)[0]?.id ?? null : null);
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

  const presentacionSeleccionada = (producto.presentaciones || []).find((p) => p.id === presentacionId) || null;

  const cambiarCantidadExtra = (id, nuevaCantidad) => {
    setCantidadesExtras((prev) => ({ ...prev, [id]: nuevaCantidad }));
  };

  const agregar = () => {
    const extras = extrasDisponibles
      .filter((e) => (cantidadesExtras[e.id] || 0) > 0)
      .map((e) => ({ ...e, cantidad: cantidadesExtras[e.id] }));
    const precioBase = precioBaseConDescuento(producto, presentacionSeleccionada);
    onAgregar({
      ...producto,
      precio: precioBase,
      presentacion_id: presentacionSeleccionada?.id ?? null,
      presentacion_nombre: presentacionSeleccionada?.nombre ?? null,
    }, cantidad, extras);
    onCerrar();
  };

  return (
    <div className="modal-producto-fondo" onClick={onCerrar}>
      <div className="modal-producto" onClick={(e) => e.stopPropagation()}>
        <div className="modal-producto-header">
          <button type="button" className="modal-producto-volver" onClick={onCerrar}>
            ← Seguir comprando
          </button>
        </div>

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

        <div className="modal-producto-tarjeta-texto">
          {producto.descuento_activo && <span className="badge-descuento">🏷️ -{producto.descuento_pct}%</span>}
          <span className="producto-categoria-tag">{producto.categoria_nombre}</span>
          <h3>{producto.nombre}</h3>
          {producto.descripcion && <p className="modal-producto-descripcion">{producto.descripcion}</p>}
        </div>

        <div className="modal-producto-acciones">
          <SelectorPresentaciones
            producto={producto}
            presentaciones={presentacionesConBase(producto)}
            presentacionId={presentacionId}
            onElegir={setPresentacionId}
          />

          <SelectorExtras extrasDisponibles={extrasDisponibles} cantidadesExtras={cantidadesExtras} onCambiarCantidad={cambiarCantidadExtra} />

          <div className="menu-tarjeta-footer">
            <span className="menu-tarjeta-precio">
              {tieneDescuento(producto, presentacionSeleccionada) && (
                <span className="precio-tachado">{formatearPrecio(calcularPrecioTotal(producto, extrasDisponibles, cantidadesExtras, cantidad, false, presentacionSeleccionada))}</span>
              )}
              {formatearPrecio(calcularPrecioTotal(producto, extrasDisponibles, cantidadesExtras, cantidad, true, presentacionSeleccionada))}
            </span>
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

export default function Menu({ categorias, productos, onAgregar, productoDetalleId, onAbrirProducto, onCerrarProducto }) {
  const [categoriaActiva, setCategoriaActiva] = useState('todas');
  // El producto abierto en el modal/página de detalle lo controla Inicio.jsx (vive
  // sincronizado con la URL /producto/:id para que cada producto tenga link propio).
  const productoDetalle = productos.find((p) => p.id === productoDetalleId) || null;
  const cintaRef = useRef(null);
  const pausadaRef = useRef(false);
  const posicionCintaRef = useRef(0);
  const reanudarCintaRef = useRef(null);
  const arrastreRef = useRef({ activo: false, inicioX: 0, inicioScroll: 0, movido: false });

  const principales = productos.filter((p) => !p.es_extra);
  const extrasTodos = productos.filter((p) => p.es_extra);
  const extrasParaProducto = (producto) => (producto ? extrasTodos.filter((e) => e.categoria === producto.categoria) : []);

  const productosFiltrados = (categoriaActiva === 'todas'
    ? principales
    : principales.filter((p) => p.categoria === categoriaActiva)
  ).slice().sort((a, b) => Number(b.destacado) - Number(a.destacado));

  const categoriasConTodos = [{ id: 'todas', nombre: 'Todos', imagen: null }, ...categorias];
  const totalCategorias = categoriasConTodos.length;
  const esSlider = totalCategorias > 4;

  useEffect(() => {
    if (!esSlider) return undefined;
    const cinta = cintaRef.current;
    if (!cinta) return undefined;

    posicionCintaRef.current = cinta.scrollLeft;

    let frame;
    const avanzar = () => {
      // scrollLeft solo guarda enteros: si acumuláramos sobre su propio valor,
      // el redondeo del navegador descarta el incremento de 0.4 en cada cuadro y la cinta queda trabada.
      if (pausadaRef.current) {
        posicionCintaRef.current = cinta.scrollLeft;
      } else {
        posicionCintaRef.current += 0.4;
      }

      const mitad = cinta.scrollWidth / 2;
      if (mitad > 0) {
        if (posicionCintaRef.current >= mitad) posicionCintaRef.current -= mitad;
        else if (posicionCintaRef.current < 0) posicionCintaRef.current += mitad;
      }

      cinta.scrollLeft = posicionCintaRef.current;
      frame = requestAnimationFrame(avanzar);
    };
    frame = requestAnimationFrame(avanzar);
    return () => cancelAnimationFrame(frame);
  }, [esSlider, totalCategorias]);

  const pausarCinta = () => {
    window.clearTimeout(reanudarCintaRef.current);
    pausadaRef.current = true;
  };
  const reanudarCinta = (demora = 0) => {
    window.clearTimeout(reanudarCintaRef.current);
    reanudarCintaRef.current = window.setTimeout(() => { pausadaRef.current = false; }, demora);
  };

  const iniciarArrastreMouse = (e) => {
    if (e.pointerType !== 'mouse' || !cintaRef.current) return;
    arrastreRef.current = { activo: true, inicioX: e.clientX, inicioScroll: cintaRef.current.scrollLeft, movido: false };
    pausarCinta();
  };
  const moverArrastreMouse = (e) => {
    const estado = arrastreRef.current;
    if (!estado.activo || e.pointerType !== 'mouse' || !cintaRef.current) return;
    const delta = e.clientX - estado.inicioX;
    if (Math.abs(delta) > 4) estado.movido = true;
    cintaRef.current.scrollLeft = estado.inicioScroll - delta;
  };
  const terminarArrastreMouse = (e) => {
    if (e.pointerType !== 'mouse') return;
    arrastreRef.current.activo = false;
    reanudarCinta(1500);
  };

  const tarjetaCategoria = (cat, keySuffix) => (
    <button
      key={keySuffix === undefined ? cat.id : `${cat.id}-${keySuffix}`}
      type="button"
      className={`filtro-categoria-card ${categoriaActiva === cat.id ? 'filtro-categoria-activa' : ''}`}
      onClick={() => {
        if (arrastreRef.current.movido) {
          arrastreRef.current.movido = false;
          return;
        }
        setCategoriaActiva(cat.id);
      }}
    >
      <span className="filtro-categoria-imagen">
        {/* Sin foto va un ícono neutro: el 🍔 de antes le ponía una hamburguesa a
            categorías que no lo son (ej. Gaseosa). */}
        {cat.imagen ? <img src={cat.imagen} alt="" /> : '🍽️'}
      </span>
      <span className="filtro-categoria-nombre">{cat.nombre}</span>
      <span className="filtro-categoria-check">✓</span>
    </button>
  );

  return (
    <section className="menu-seccion" id="menu">
      <h2 className="menu-titulo fuente-impacto">Productos destacados</h2>

      {categorias.length > 0 && (
        <div className="menu-filtro-categorias">
          <div className="menu-filtro-header">
            <div className="menu-filtro-titulo-linea">
              <span className="menu-filtro-linea" />
              <span className="menu-filtro-titulo">Filtrar por categoría</span>
              <span className="menu-filtro-linea" />
            </div>
          </div>

          {esSlider ? (
            <div
              className="menu-filtro-cinta"
              ref={cintaRef}
              onMouseEnter={pausarCinta}
              onMouseLeave={() => reanudarCinta(0)}
              onTouchStart={pausarCinta}
              onTouchEnd={() => reanudarCinta(1500)}
              onPointerDown={iniciarArrastreMouse}
              onPointerMove={moverArrastreMouse}
              onPointerUp={terminarArrastreMouse}
              onPointerLeave={(e) => { if (arrastreRef.current.activo) terminarArrastreMouse(e); }}
            >
              <div className="menu-filtro-cinta-track">
                {[...categoriasConTodos, ...categoriasConTodos].map((cat, i) => tarjetaCategoria(cat, i))}
              </div>
            </div>
          ) : (
            <div
              className="menu-filtro-grid"
              style={{ gridTemplateColumns: `repeat(${totalCategorias}, minmax(0, 160px))` }}
            >
              {categoriasConTodos.map((cat) => tarjetaCategoria(cat))}
            </div>
          )}
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
              onVerDetalle={(p) => onAbrirProducto(p.id)}
            />
          ))}
        </div>
      )}

      <ModalProducto
        producto={productoDetalle}
        extrasDisponibles={extrasParaProducto(productoDetalle)}
        onCerrar={onCerrarProducto}
        onAgregar={onAgregar}
      />

      <style>{`
        .menu-filtro-categorias {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 22px;
          padding: 24px 20px 26px;
          margin-bottom: 32px;
        }

        .menu-filtro-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          margin-bottom: 22px;
        }

        .menu-filtro-icono {
          font-size: 1.5rem;
          line-height: 1;
        }

        .menu-filtro-titulo-linea {
          display: flex;
          align-items: center;
          gap: 14px;
          width: 100%;
          max-width: 380px;
        }

        .menu-filtro-linea {
          flex: 1;
          height: 1px;
          background: linear-gradient(90deg, transparent, var(--accent, #e8630c) 50%, transparent);
        }

        .menu-filtro-titulo {
          font-weight: 800;
          font-size: 0.78rem;
          letter-spacing: 0.1em;
          text-transform: uppercase;
          color: var(--accent, #e8630c);
          white-space: nowrap;
        }

        .menu-filtro-grid {
          display: grid;
          gap: 10px;
          justify-content: center;
        }

        .menu-filtro-cinta {
          overflow-x: auto;
          overflow-y: hidden;
          cursor: grab;
          scrollbar-width: none;
          -webkit-overflow-scrolling: touch;
          touch-action: pan-x;
          -webkit-mask-image: linear-gradient(90deg, transparent, #000 24px, #000 calc(100% - 24px), transparent);
          mask-image: linear-gradient(90deg, transparent, #000 24px, #000 calc(100% - 24px), transparent);
        }
        .menu-filtro-cinta::-webkit-scrollbar {
          display: none;
        }
        .menu-filtro-cinta:active {
          cursor: grabbing;
        }

        .menu-filtro-cinta-track {
          display: flex;
          gap: 12px;
          width: max-content;
        }

        .menu-filtro-cinta-track .filtro-categoria-card {
          flex: 0 0 104px;
        }

        .filtro-categoria-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          min-width: 0;
          background: var(--surface-2);
          border: 2px solid transparent;
          border-radius: 18px;
          padding: 18px 8px 14px;
          cursor: pointer;
          color: var(--text);
          font-family: inherit;
          transition: transform 0.15s ease, border-color 0.15s ease, background 0.15s ease, box-shadow 0.15s ease;
        }

        .filtro-categoria-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 20px -12px rgba(0, 0, 0, 0.45);
        }

        .filtro-categoria-activa {
          border-color: var(--accent, #e8630c);
          background: linear-gradient(180deg, rgba(232, 99, 12, 0.2), rgba(232, 99, 12, 0.06));
          box-shadow: 0 10px 24px -12px rgba(232, 99, 12, 0.5);
        }

        .filtro-categoria-imagen {
          width: clamp(44px, 100%, 64px);
          aspect-ratio: 1 / 1;
          border-radius: 16px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(1.4rem, 8vw, 2rem);
          background: var(--surface);
          flex-shrink: 0;
        }

        .filtro-categoria-imagen img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .filtro-categoria-nombre {
          font-weight: 800;
          font-size: 0.7rem;
          letter-spacing: 0.02em;
          text-transform: uppercase;
          text-align: center;
          line-height: 1.25;
          overflow-wrap: break-word;
        }

        .filtro-categoria-check {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: 2px solid var(--border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          color: transparent;
          background: transparent;
          transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
        }

        .filtro-categoria-activa .filtro-categoria-check {
          border-color: transparent;
          background: linear-gradient(135deg, var(--accent-light, #f4854a), var(--accent, #e8630c));
          color: #ffffff;
        }

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
          justify-content: center;
          /* Más alto que el navbar (.nav-bar-pro usa z-index: 9999 !important): a
             pantalla completa este overlay tiene que taparlo, si no el navbar queda
             pintado encima y se come los clicks del header "Seguir comprando". */
          z-index: 10000;
          animation: modalFondoAparece 0.2s ease-out;
        }

        @keyframes modalFondoAparece {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* A pantalla completa (como una página propia): en mobile ocupa todo el
           viewport, en desktop queda centrado como una "hoja" ancha con el fondo
           oscuro visible a los costados.

           Estilo neumórfico (soft UI): un único color de fondo neutro para todo
           (página, tarjeta, botones) — el relieve lo dan solo las sombras duales
           (--sombra-elevada para lo que "sobresale", --sombra-hundida para lo que
           está presionado/anidado), nunca un color de fondo distinto. Variables
           reutilizables para poder ajustar el tono o la intensidad más adelante. */
        .modal-producto {
          --bg-suave: #f0ece4;
          --sombra-clara: #ffffff;
          --sombra-oscura: #c9c2b4;
          --sombra-elevada: 7px 7px 14px var(--sombra-oscura), -7px -7px 14px var(--sombra-clara);
          --sombra-hundida: inset 4px 4px 9px var(--sombra-oscura), inset -4px -4px 9px var(--sombra-clara);
          --sombra-elevada-chica: 4px 4px 8px var(--sombra-oscura), -4px -4px 8px var(--sombra-clara);
          --sombra-hundida-chica: inset 3px 3px 6px var(--sombra-oscura), inset -3px -3px 6px var(--sombra-clara);
          background: var(--bg-suave);
          width: 100%;
          max-width: 720px;
          height: 100%;
          height: 100dvh;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          position: relative;
          animation: modalAparece 0.25s ease-out;
        }

        @keyframes modalAparece {
          from {
            opacity: 0;
            transform: translateY(24px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-producto-header {
          position: sticky;
          top: 0;
          z-index: 3;
          background: rgba(240, 236, 228, 0.92);
          backdrop-filter: blur(6px);
          padding: 14px 20px;
          border-bottom: 1px solid #e2dbcd;
        }

        .modal-producto-volver {
          border: none;
          background: none;
          padding: 4px 0;
          font: inherit;
          font-weight: 700;
          font-size: 14px;
          color: #241a13;
          cursor: pointer;
          transition: color 0.15s ease;
        }
        .modal-producto-volver:hover {
          color: var(--accent, #e8630c);
        }

        /* La imagen vuelve a ir a pantalla completa (edge-to-edge), como antes del
           neumorfismo: solo la tarjeta de texto de abajo queda elevada. */
        .modal-producto-imagen {
          width: 100%;
          height: 38vh;
          min-height: 260px;
          max-height: 420px;
          overflow: hidden;
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

        /* Tarjeta de texto (nombre + descripción): elevada por su cuenta, ya
           independiente de la imagen. */
        .modal-producto-tarjeta-texto {
          margin: 20px 20px 0;
          padding: 20px 24px 24px;
          border-radius: 22px;
          background: var(--bg-suave);
          box-shadow: var(--sombra-elevada);
          display: flex;
          flex-direction: column;
        }

        .modal-producto-tarjeta-texto .badge-descuento {
          position: static;
          align-self: flex-start;
          margin-bottom: 8px;
        }

        .modal-producto-tarjeta-texto .producto-categoria-tag {
          align-self: flex-start;
          margin-bottom: 10px;
        }

        .modal-producto-tarjeta-texto h3 {
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
          margin: 0;
        }

        .modal-producto-acciones {
          padding: 22px 22px 28px;
          display: flex;
          flex-direction: column;
        }

        .modal-producto-acciones .menu-tarjeta-footer {
          padding-top: 18px;
          margin-bottom: 4px;
        }

        .modal-producto-acciones .menu-tarjeta-precio {
          font-size: 22px;
          font-weight: 800;
          color: #1f8a4c;
        }

        /* Stepper de cantidad del producto: mismo trato neumórfico que los +/-
           de toppings (punto 4), para que no queden dos estilos de botón distintos
           en la misma pantalla. */
        .modal-producto-acciones .menu-tarjeta-cantidad {
          display: flex;
          align-items: center;
          gap: 14px;
          border: none;
          border-radius: 999px;
          padding: 4px 6px;
        }
        .modal-producto-acciones .menu-tarjeta-cantidad button {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          border: none;
          background: var(--bg-suave);
          box-shadow: var(--sombra-elevada-chica);
          color: #241a13;
          font-size: 16px;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: box-shadow 0.12s ease;
        }
        .modal-producto-acciones .menu-tarjeta-cantidad button:active {
          box-shadow: var(--sombra-hundida-chica);
        }
        .modal-producto-acciones .menu-tarjeta-cantidad span {
          min-width: 16px;
          text-align: center;
          font-weight: 700;
          color: #241a13;
        }

        .modal-producto-acciones .precio-tachado {
          color: #a89a8f;
        }

        /* Punto 5: el contenedor de toppings queda hundido para diferenciarse de
           las superficies que sobresalen (tarjeta, selector, botones). */
        .modal-producto-acciones .menu-tarjeta-extras {
          border: none;
          background: var(--bg-suave);
          box-shadow: var(--sombra-hundida);
          border-radius: 18px;
          margin-bottom: 8px;
        }
        .modal-producto-acciones .extra-selector-fila {
          border: none;
          border-bottom: 1px solid rgba(36, 26, 19, 0.08);
          background: transparent;
          border-radius: 0;
          padding: 10px 4px;
        }
        .modal-producto-acciones .extra-selector-fila:last-child {
          border-bottom: none;
        }
        .modal-producto-acciones .extra-selector-fila-activa {
          border-bottom-color: rgba(36, 26, 19, 0.08);
        }
        .modal-producto-acciones .extra-selector-nombre {
          color: #241a13;
        }
        .modal-producto-acciones .extra-selector-nombre small {
          color: #8a7c70;
        }
        /* Punto 4: círculos +/- con relieve en reposo y hundidos al tocar. */
        .modal-producto-acciones .extra-selector-stepper button {
          background: var(--bg-suave);
          box-shadow: var(--sombra-elevada-chica);
          color: #241a13;
          transition: box-shadow 0.12s ease, background 0.12s ease;
        }
        .modal-producto-acciones .extra-selector-stepper button:active:not(:disabled) {
          box-shadow: var(--sombra-hundida-chica);
        }
        .modal-producto-acciones .extra-selector-stepper button:not(:disabled):hover {
          background: linear-gradient(135deg, var(--accent-light, #f4854a), var(--accent, #e8630c));
          color: #ffffff;
        }
        .modal-producto-acciones .extra-selector-stepper span {
          color: #241a13;
        }

        .modal-producto-acciones .menu-tarjeta-presentaciones {
          border: none;
          background: transparent;
          padding: 0;
        }
        .modal-producto-acciones .presentaciones-titulo {
          color: #8a7c70;
        }
        /* Punto 3: fila normal = elevada; fila elegida = hundida, sin borde de
           color — el acento naranja queda solo en el "punto" del check. */
        .modal-producto-acciones .presentacion-selector-fila {
          border: none;
          background: var(--bg-suave);
          box-shadow: var(--sombra-elevada);
          transition: box-shadow 0.15s ease;
        }
        .modal-producto-acciones .presentacion-selector-fila-activa {
          border: none;
          box-shadow: var(--sombra-hundida);
        }
        .modal-producto-acciones .presentacion-selector-nombre {
          color: #241a13;
        }
        .modal-producto-acciones .presentacion-selector-fila-activa .presentacion-selector-nombre {
          color: var(--accent, #e8630c);
        }
        .modal-producto-acciones .presentacion-selector-check {
          border-color: #d9cbbc;
        }

        /* Punto 6: sigue naranja de marca, pero con sombra neumórfica en tonos del
           propio acento en vez de un box-shadow plano. */
        .modal-producto-agregar {
          margin-top: 20px;
          width: 100%;
          font-size: 16px;
          box-shadow: 5px 5px 10px rgba(184, 78, 10, 0.45), -5px -5px 10px rgba(244, 133, 74, 0.35);
          transition: box-shadow 0.12s ease, transform 0.12s ease;
        }
        .modal-producto-agregar:active {
          box-shadow: inset 4px 4px 8px rgba(184, 78, 10, 0.5), inset -4px -4px 8px rgba(244, 133, 74, 0.25);
          transform: none;
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

//