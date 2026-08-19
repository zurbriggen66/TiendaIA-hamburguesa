import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api, { leerToken, guardarToken } from '../services/api';
import { aclararColor, colorContraste } from '../utils/colores';
import CuentaModal from './CuentaModal';
import NavBar from './NavBar';
import Hero from './Hero';
import AntojoDelDia from './AntojoDelDia';
import Combos from './Combos';
import Menu from './Menu';
import CarritoDrawer from './CarritoDrawer';
import Footer from './Footer'; // <-- IMPORTAMOS EL NUEVO FOOTER

// Precarga una imagen y resuelve la promesa cuando termina (o si falla, para no trabar el preloader)
const precargarImagen = (src) =>
  new Promise((resolve) => {
    if (!src) return resolve();
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve();
    img.src = src;
  });

// Precarga metadata de un video (suficiente para poder reproducirlo apenas se muestre)
const precargarVideo = (src) =>
  new Promise((resolve) => {
    if (!src) return resolve();
    const video = document.createElement('video');
    video.preload = 'auto';
    video.onloadeddata = () => resolve();
    video.onerror = () => resolve();
    video.src = src;
  });

// Safari en iOS es mucho más restrictivo que Chrome/Android para cargar videos que
// no están insertados en la página: "onloadeddata" a veces nunca dispara para un
// <video> fuera del DOM, dejando el preloader esperando para siempre. Le ponemos un
// límite de tiempo a cualquier precarga para que la app nunca quede trabada.
const conLimiteDeTiempo = (promesa, ms) =>
  Promise.race([promesa, new Promise((resolve) => setTimeout(resolve, ms))]);

// Piso mínimo de tiempo que se muestra la pantalla de precarga: con una conexión rápida
// (o en desarrollo, contra un servidor local) todo puede resolver casi al instante, y la
// barra se llena antes de que el logo llegue a verse. Forzamos esta espera mínima para
// que el logo siempre alcance a mostrarse aunque el resto cargue de inmediato.
const TIEMPO_MINIMO_PRECARGA_MS = 1200;
const esperar = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const precioUnitarioLinea = (linea) =>
  Number(linea.item.precio) + (linea.extras || []).reduce((acc, e) => acc + Number(e.precio) * e.cantidad, 0);

export default function Inicio() {
  const navigate = useNavigate();
  const { id: idProductoUrl } = useParams();
  const [configuracion, setConfiguracion] = useState({
    logo: "https://cdn-icons-png.flaticon.com/512/3075/3075977.png",
    logo_precarga: null,
    imagen_principal: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
    video_principal: null,
    whatsapp: '5493544400993',
    instagram: 'https://www.instagram.com/antojoburger_/',
    color_navbar: '#0d2b23',
    color_fondo: '#0d2b23',
    color_superficie: '#163a30',
    color_acento: '#e8630c',
    color_boton_agregar: '#ffc700',
    tienda_abierta: true,
    mensaje_cerrado: '',
  });
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [combos, setCombos] = useState([]);
  const [items, setItems] = useState([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
  const [productoDetalleId, setProductoDetalleId] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [mostrarCuenta, setMostrarCuenta] = useState(false);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;

    const obtenerConfiguracion = async () => {
      try {
        const respuesta = await api.get('/configuracion/');
        if (respuesta.data && respuesta.data.length > 0) {
          const ultimaConfig = respuesta.data[respuesta.data.length - 1];
          return {
            logo: ultimaConfig.logo || configuracion.logo,
            logo_precarga: ultimaConfig.logo_precarga || configuracion.logo_precarga,
            imagen_principal: ultimaConfig.imagen_principal || configuracion.imagen_principal,
            video_principal: ultimaConfig.video_principal || configuracion.video_principal,
            whatsapp: ultimaConfig.whatsapp || configuracion.whatsapp,
            instagram: ultimaConfig.instagram || configuracion.instagram,
            color_navbar: ultimaConfig.color_navbar || configuracion.color_navbar,
            color_fondo: ultimaConfig.color_fondo || configuracion.color_fondo,
            color_superficie: ultimaConfig.color_superficie || configuracion.color_superficie,
            color_acento: ultimaConfig.color_acento || configuracion.color_acento,
            color_boton_agregar: ultimaConfig.color_boton_agregar || configuracion.color_boton_agregar,
            // Ojo con "||" acá: tienda_abierta=false es un valor válido, no "sin dato".
            tienda_abierta: ultimaConfig.tienda_abierta ?? configuracion.tienda_abierta,
            mensaje_cerrado: ultimaConfig.mensaje_cerrado || configuracion.mensaje_cerrado,
          };
        }
        return null;
      } catch (error) {
        console.error("Error al cargar los datos del backend:", error);
        return null;
      }
    };

    const obtenerMenu = async () => {
      try {
        const [resCategorias, resProductos, resCombos] = await Promise.all([
          api.get('/categorias/'),
          api.get('/productos/'),
          api.get('/combos/'),
        ]);
        if (!activo) return;
        setCategorias(resCategorias.data);
        setProductos(resProductos.data);
        setCombos(resCombos.data.filter((c) => c.activo));
      } catch (error) {
        console.error("Error al cargar el menú:", error);
      }
    };

    const inicializar = async () => {
      const [configNueva] = await Promise.all([
        obtenerConfiguracion(),
        obtenerMenu(),
      ]);

      if (!activo) return;

      let configFinal = configuracion;
      if (configNueva) {
        configFinal = { ...configuracion, ...configNueva };
        setConfiguracion(configFinal);
      }

      // Recién ahora precargamos el asset visual pesado del hero (imagen o video).
      // Con límite de tiempo: si la precarga no resuelve rápido (típico en iOS con
      // video), seguimos igual — el video/imagen termina de cargar solo cuando el
      // Hero lo renderice, en vez de dejar al usuario mirando el logo para siempre.
      const precargaAssetPesado = configFinal.video_principal
        ? conLimiteDeTiempo(precargarVideo(configFinal.video_principal), 4000)
        : conLimiteDeTiempo(precargarImagen(configFinal.imagen_principal), 4000);

      // Esperamos también el logo de precarga y el piso mínimo de tiempo: así el logo
      // siempre llega a mostrarse, aunque el servidor responda casi al instante.
      await Promise.all([
        precargaAssetPesado,
        precargarImagen(configFinal.logo_precarga),
        esperar(TIEMPO_MINIMO_PRECARGA_MS),
      ]);

      if (activo) setCargando(false);
    };

    inicializar();

    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Si quedó un token de una visita anterior, recuperamos la sesión (y los puntos al día).
  useEffect(() => {
    if (!leerToken()) return;
    api.get('/clientes/mi-cuenta/')
      .then((res) => setCliente(res.data))
      .catch(() => guardarToken(null));
  }, []);

  const cerrarSesion = () => {
    guardarToken(null);
    setCliente(null);
  };

  // Cada producto tiene su propia URL compartible (/producto/:id): si se entra directo
  // desde un link (ej. Instagram), esto abre su detalle apenas carga el menú.
  useEffect(() => {
    if (idProductoUrl) setProductoDetalleId(Number(idProductoUrl));
  }, [idProductoUrl]);

  const abrirProducto = (id) => {
    setProductoDetalleId(id);
    navigate(`/producto/${id}`);
  };

  const cerrarProducto = () => {
    setProductoDetalleId(null);
    navigate('/');
  };

  const armarLineaId = (tipo, id, extras, sugerido, presentacionId) =>
    `${tipo}-${id}-${presentacionId || ''}-${(extras || []).map((e) => `${e.id}x${e.cantidad}`).sort().join('_')}${sugerido ? '-carrito' : ''}`;

  // `sugerido` distingue una línea agregada desde la sugerencia de venta cruzada del
  // carrito (precio con descuento_carrito_pct) de una agregada normalmente desde el
  // menú (precio de lista): así nunca se mezclan en la misma línea con precios distintos.
  const agregarAlCarritoGenerico = (tipo, item, cantidad, extras = [], sugerido = false) => {
    const lineaId = armarLineaId(tipo, item.id, extras, sugerido, item.presentacion_id);
    setItems((prev) => {
      const existente = prev.find((i) => i.lineaId === lineaId);
      if (existente) {
        return prev.map((i) => (i.lineaId === lineaId ? { ...i, cantidad: i.cantidad + cantidad } : i));
      }
      return [...prev, { lineaId, tipo, item, cantidad, extras, sugerido }];
    });
  };

  const agregarAlCarrito = (producto, cantidad, extras) => agregarAlCarritoGenerico('producto', producto, cantidad, extras);
  const agregarComboAlCarrito = (combo, cantidad) => agregarAlCarritoGenerico('combo', combo, cantidad);
  const agregarSugeridoAlCarrito = (producto) => {
    const precioConDescuento = producto.sugerido_carrito && Number(producto.descuento_carrito_pct) > 0
      ? Number(producto.precio_sugerido_carrito)
      : Number(producto.precio);
    agregarAlCarritoGenerico('producto', { ...producto, precio: precioConDescuento }, 1, [], true);
  };

  const sugeridosCarrito = productos.filter(
    (p) => p.sugerido_carrito && Number(p.descuento_carrito_pct) > 0 && !p.es_extra
  );

  const cambiarCantidad = (lineaId, cantidad) => {
    if (cantidad <= 0) {
      quitarDelCarrito(lineaId);
      return;
    }
    setItems((prev) => prev.map((i) => (i.lineaId === lineaId ? { ...i, cantidad } : i)));
  };

  const quitarDelCarrito = (lineaId) => {
    setItems((prev) => prev.filter((i) => i.lineaId !== lineaId));
  };

  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);
  const totalCarrito = items.reduce((acc, linea) => acc + precioUnitarioLinea(linea) * linea.cantidad, 0);

  const pedirPorWhatsapp = () => {
    if (totalItems > 0) {
      setCarritoAbierto(true);
    } else {
      document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  if (cargando) {
    return (
      <div className="preloader-pantalla">
        {configuracion.logo_precarga && (
          <img
            src={configuracion.logo_precarga}
            alt="Cargando"
            className="preloader-logo"
            fetchPriority="high"
            decoding="async"
          />
        )}
        <div className="preloader-barra">
          <div className="preloader-barra-relleno" />
        </div>
        <style>{`
          .preloader-pantalla {
            position: fixed;
            inset: 0;
            background: #0d2b23;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 24px;
            z-index: 9999;
          }
          .preloader-logo {
            width: 72px;
            height: 72px;
            object-fit: contain;
            animation: preloaderPulso 1.2s ease-in-out infinite;
          }
          @keyframes preloaderPulso {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.08); opacity: 0.7; }
          }
          .preloader-barra {
            width: 160px;
            height: 4px;
            border-radius: 999px;
            background: rgba(255, 255, 255, 0.12);
            overflow: hidden;
          }
          .preloader-barra-relleno {
            width: 40%;
            height: 100%;
            border-radius: 999px;
            background: linear-gradient(135deg, #f4854a, #e8630c);
            animation: preloaderDeslizar 1.1s ease-in-out infinite;
          }
          @keyframes preloaderDeslizar {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(250%); }
          }
        `}</style>
      </div>
    );
  }

  // Variables CSS con los colores elegidos en el admin ("Diseño & Colores"). Se
  // aplican solo dentro de .cliente-container, así el panel de administración
  // (que usa las mismas variables --accent/--bg para su propia UI) no se ve afectado.
  const colorAcentoClaro = aclararColor(configuracion.color_acento);
  const estiloTema = {
    '--navbar-bg': configuracion.color_navbar,
    '--bg': configuracion.color_fondo,
    '--surface': configuracion.color_superficie,
    '--accent': configuracion.color_acento,
    '--accent-light': colorAcentoClaro,
    // Las custom properties heredan su valor ya resuelto en el punto donde se
    // declaran, no la referencia var() en sí: --accent-gradient está definida
    // en :root usando var(--accent)/var(--accent-light), así que si no la
    // volvemos a declarar acá con el gradiente ya armado, los descendientes
    // heredarían el gradiente naranja resuelto en :root en vez del elegido.
    '--accent-gradient': `linear-gradient(135deg, ${colorAcentoClaro}, ${configuracion.color_acento})`,
    '--boton-agregar': configuracion.color_boton_agregar,
    '--boton-agregar-texto': colorContraste(configuracion.color_boton_agregar),
  };

  return (
    <div
      className="cliente-container"
      style={{ ...estiloTema, ...(totalItems > 0 ? { paddingBottom: 76 } : null) }}
    >
      <NavBar
        configuracion={configuracion}
        totalItems={totalItems}
        onPedir={pedirPorWhatsapp}
        cliente={cliente}
        onAbrirCuenta={() => setMostrarCuenta(true)}
        onCerrarSesion={cerrarSesion}
      />

      {!configuracion.tienda_abierta && (
        <div className="tienda-cerrada-aviso">
          <span className="tienda-cerrada-aviso-icono" aria-hidden="true">😴</span>
          <div>
            <strong>En este momento estamos cerrados</strong>
            <p>{configuracion.mensaje_cerrado || 'Volvemos pronto, gracias por tu paciencia.'}</p>
          </div>
        </div>
      )}

      <Hero configuracion={configuracion} />

      <div id="antojo-dia">
        <AntojoDelDia onAgregar={agregarAlCarrito} />
      </div>

      <Combos combos={combos} onAgregar={agregarComboAlCarrito} />

      <Menu
        categorias={categorias}
        productos={productos}
        onAgregar={agregarAlCarrito}
        productoDetalleId={productoDetalleId}
        onAbrirProducto={abrirProducto}
        onCerrarProducto={cerrarProducto}
      />

      {totalItems > 0 && (
        <button type="button" className="carrito-barra-flotante" onClick={() => setCarritoAbierto(true)}>
          <span className="carrito-barra-info">
            <span className="carrito-barra-badge">{totalItems}</span>
            Ver mi pedido
          </span>
          <span className="carrito-barra-total">{formatearPrecio(totalCarrito)}</span>
        </button>
      )}

      {carritoAbierto && (
        <CarritoDrawer
          items={items}
          whatsapp={configuracion.whatsapp}
          tiendaAbierta={configuracion.tienda_abierta}
          mensajeCerrado={configuracion.mensaje_cerrado}
          sugeridos={sugeridosCarrito}
          onClose={() => setCarritoAbierto(false)}
          onCambiarCantidad={cambiarCantidad}
          onQuitar={quitarDelCarrito}
          onAgregarSugerido={agregarSugeridoAlCarrito}
          onVaciar={() => setItems([])}
          cliente={cliente}
          onClienteActualizado={setCliente}
        />
      )}

      {mostrarCuenta && (
        <CuentaModal onClose={() => setMostrarCuenta(false)} onIngreso={setCliente} />
      )}

      {/* <-- AQUÍ RENDERIZAMOS EL NUEVO FOOTER --> */}
      <Footer configuracion={configuracion} />

    </div>
  );
}

//

//