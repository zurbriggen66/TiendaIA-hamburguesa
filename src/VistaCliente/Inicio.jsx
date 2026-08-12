import React, { useState, useEffect } from 'react';
import api from '../services/api';
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

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const precioUnitarioLinea = (linea) =>
  Number(linea.item.precio) + (linea.extras || []).reduce((acc, e) => acc + Number(e.precio) * e.cantidad, 0);

export default function Inicio() {
  const [configuracion, setConfiguracion] = useState({
    logo: "https://cdn-icons-png.flaticon.com/512/3075/3075977.png",
    imagen_principal: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
    video_principal: null,
    whatsapp: '5493544400993',
    instagram: 'https://www.instagram.com/antojoburger_/',
  });
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [combos, setCombos] = useState([]);
  const [items, setItems] = useState([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);
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
            imagen_principal: ultimaConfig.imagen_principal || configuracion.imagen_principal,
            video_principal: ultimaConfig.video_principal || configuracion.video_principal,
            whatsapp: ultimaConfig.whatsapp || configuracion.whatsapp,
            instagram: ultimaConfig.instagram || configuracion.instagram,
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
      if (configFinal.video_principal) {
        await conLimiteDeTiempo(precargarVideo(configFinal.video_principal), 4000);
      } else {
        await conLimiteDeTiempo(precargarImagen(configFinal.imagen_principal), 4000);
      }

      if (activo) setCargando(false);
    };

    inicializar();

    return () => {
      activo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const armarLineaId = (tipo, id, extras) =>
    `${tipo}-${id}-${(extras || []).map((e) => `${e.id}x${e.cantidad}`).sort().join('_')}`;

  const agregarAlCarritoGenerico = (tipo, item, cantidad, extras = []) => {
    const lineaId = armarLineaId(tipo, item.id, extras);
    setItems((prev) => {
      const existente = prev.find((i) => i.lineaId === lineaId);
      if (existente) {
        return prev.map((i) => (i.lineaId === lineaId ? { ...i, cantidad: i.cantidad + cantidad } : i));
      }
      return [...prev, { lineaId, tipo, item, cantidad, extras }];
    });
  };

  const agregarAlCarrito = (producto, cantidad, extras) => agregarAlCarritoGenerico('producto', producto, cantidad, extras);
  const agregarComboAlCarrito = (combo, cantidad) => agregarAlCarritoGenerico('combo', combo, cantidad);

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
        <img src={configuracion.logo} alt="Cargando" className="preloader-logo" />
        <div className="preloader-barra">
          <div className="preloader-barra-relleno" />
        </div>
        <style>{`
          .preloader-pantalla {
            position: fixed;
            inset: 0;
            background: #14100c;
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
            background: linear-gradient(135deg, #fb923c, #ef4444);
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

  return (
    <div className="cliente-container" style={totalItems > 0 ? { paddingBottom: 76 } : undefined}>
      <NavBar configuracion={configuracion} totalItems={totalItems} onPedir={pedirPorWhatsapp} />

      <Hero configuracion={configuracion} />

      <div id="antojo-dia">
        <AntojoDelDia onAgregar={agregarAlCarrito} />
      </div>

      <Combos combos={combos} onAgregar={agregarComboAlCarrito} />

      <Menu categorias={categorias} productos={productos} onAgregar={agregarAlCarrito} />

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
          onClose={() => setCarritoAbierto(false)}
          onCambiarCantidad={cambiarCantidad}
          onQuitar={quitarDelCarrito}
          onVaciar={() => setItems([])}
        />
      )}

      {/* <-- AQUÍ RENDERIZAMOS EL NUEVO FOOTER --> */}
      <Footer configuracion={configuracion} />

    </div>
  );
}

//

//