import React, { useState, useEffect } from 'react';
import api from '../services/api';
import NavBar from './NavBar';
import Hero from './Hero';
import AntojoDelDia from './AntojoDelDia';
import Combos from './Combos';
import Menu from './Menu';
import CarritoDrawer from './CarritoDrawer';
import Footer from './Footer'; // <-- IMPORTAMOS EL NUEVO FOOTER

export default function Inicio() {
  const [configuracion, setConfiguracion] = useState({
    logo: "https://cdn-icons-png.flaticon.com/512/3075/3075977.png",
    imagen_principal: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80",
    whatsapp: '5493544400993',
    instagram: 'https://www.instagram.com/antojoburger_/',
  });
  const [categorias, setCategorias] = useState([]);
  const [productos, setProductos] = useState([]);
  const [combos, setCombos] = useState([]);
  const [items, setItems] = useState([]);
  const [carritoAbierto, setCarritoAbierto] = useState(false);

  useEffect(() => {
    const obtenerConfiguracion = async () => {
      try {
        const respuesta = await api.get('/configuracion/');
        if (respuesta.data && respuesta.data.length > 0) {
          const ultimaConfig = respuesta.data[respuesta.data.length - 1];
          setConfiguracion((prev) => ({
            logo: ultimaConfig.logo || prev.logo,
            imagen_principal: ultimaConfig.imagen_principal || prev.imagen_principal,
            whatsapp: ultimaConfig.whatsapp || prev.whatsapp,
            instagram: ultimaConfig.instagram || prev.instagram,
          }));
        }
      } catch (error) {
        console.error("Error al cargar los datos del backend:", error);
      }
    };

    const obtenerMenu = async () => {
      try {
        const [resCategorias, resProductos, resCombos] = await Promise.all([
          api.get('/categorias/'),
          api.get('/productos/'),
          api.get('/combos/'),
        ]);
        setCategorias(resCategorias.data);
        setProductos(resProductos.data);
        setCombos(resCombos.data.filter((c) => c.activo));
      } catch (error) {
        console.error("Error al cargar el menú:", error);
      }
    };

    obtenerConfiguracion();
    obtenerMenu();
  }, []);

  const agregarAlCarritoGenerico = (tipo, item, cantidad) => {
    setItems((prev) => {
      const existente = prev.find((i) => i.tipo === tipo && i.item.id === item.id);
      if (existente) {
        return prev.map((i) =>
          i.tipo === tipo && i.item.id === item.id ? { ...i, cantidad: i.cantidad + cantidad } : i
        );
      }
      return [...prev, { tipo, item, cantidad }];
    });
  };

  const agregarAlCarrito = (producto, cantidad) => agregarAlCarritoGenerico('producto', producto, cantidad);
  const agregarComboAlCarrito = (combo, cantidad) => agregarAlCarritoGenerico('combo', combo, cantidad);

  const cambiarCantidad = (tipo, id, cantidad) => {
    if (cantidad <= 0) {
      quitarDelCarrito(tipo, id);
      return;
    }
    setItems((prev) => prev.map((i) => (i.tipo === tipo && i.item.id === id ? { ...i, cantidad } : i)));
  };

  const quitarDelCarrito = (tipo, id) => {
    setItems((prev) => prev.filter((i) => !(i.tipo === tipo && i.item.id === id)));
  };

  const totalItems = items.reduce((acc, item) => acc + item.cantidad, 0);

  const pedirPorWhatsapp = () => {
    if (totalItems > 0) {
      setCarritoAbierto(true);
    } else {
      document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="cliente-container">
      <NavBar configuracion={configuracion} totalItems={totalItems} onPedir={pedirPorWhatsapp} />

      <Hero configuracion={configuracion} />

      <div id="antojo-dia">
        <AntojoDelDia onAgregar={agregarAlCarrito} />
      </div>

      <Combos combos={combos} onAgregar={agregarComboAlCarrito} />

      <Menu categorias={categorias} productos={productos} onAgregar={agregarAlCarrito} />

      <button type="button" className="carrito-flotante" onClick={() => setCarritoAbierto(true)}>
        🛒
        {totalItems > 0 && <span className="carrito-flotante-badge">{totalItems}</span>}
      </button>

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