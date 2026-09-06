import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Navigate, Outlet, useLocation, useNavigate } from 'react-router-dom';
import api, { guardarTokenAdmin } from '../services/api';
import { obtenerConfigImpresion, imprimirPedido } from '../utils/impresion';
import { useModo } from './ModoContext';
import { seccionDeRuta } from '../utils/modoEmpleado';
import AdminLogin from './AdminLogin';
import SelectorTema from './SelectorTema';
import Toasts from './Toasts';

const INTERVALO_CONSULTA_MS = 15000;

function reproducirSonidoAviso() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    if (ctx.state === 'suspended') ctx.resume();

    const tono = (frecuencia, inicio, duracion) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(frecuencia, ctx.currentTime + inicio);
      gain.gain.setValueAtTime(0.16, ctx.currentTime + inicio);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + inicio + duracion);
      osc.start(ctx.currentTime + inicio);
      osc.stop(ctx.currentTime + inicio + duracion);
    };
    tono(880, 0, 0.3);
    tono(660, 0.15, 0.3);
  } catch (error) {
    console.error('No se pudo reproducir el sonido de aviso:', error);
  }
}

export default function DashboardLayout() {
  const linkClass = ({ isActive }) => `menu-item${isActive ? ' active' : ''}`;
  const location = useLocation();
  const navigate = useNavigate();

  const { esEmpleado, puede, seccionesVisibles, volverAModoDueno } = useModo();

  const [pedidosNuevos, setPedidosNuevos] = useState(0);
  const [toast, setToast] = useState(null);
  const [sidebarAbierta, setSidebarAbierta] = useState(false);
  const [pidiendoCredenciales, setPidiendoCredenciales] = useState(false);
  const idsVistos = useRef(new Set());
  const primeraConsulta = useRef(true);

  useEffect(() => {
    let activo = true;

    const consultarPedidos = async () => {
      try {
        // Un pedido nuevo siempre entra dentro de las últimas 24hs: mirar el historial
        // completo cada 15 segundos (y en todas las pantallas del admin) era el gasto
        // más grande de la app y crecía con cada pedido acumulado.
        const { data } = await api.get('/pedidos/', { params: { ultimas_horas: 24, page_size: 100 } });
        if (!activo) return;

        const pedidosRecientes = data.results;

        if (primeraConsulta.current) {
          pedidosRecientes.forEach((p) => idsVistos.current.add(p.id));
          primeraConsulta.current = false;
          return;
        }

        const nuevos = pedidosRecientes.filter((p) => !idsVistos.current.has(p.id));
        if (nuevos.length > 0) {
          nuevos.forEach((p) => idsVistos.current.add(p.id));
          reproducirSonidoAviso();
          setPedidosNuevos((n) => n + nuevos.length);
          setToast(nuevos[0]);
          setTimeout(() => setToast((actual) => (actual === nuevos[0] ? null : actual)), 7000);

          if (obtenerConfigImpresion().autoImprimir) {
            nuevos.forEach((p) => imprimirPedido(p));
          }
        }
      } catch (error) {
        console.error('Error al chequear pedidos nuevos:', error);
      }
    };

    consultarPedidos();
    const intervalo = setInterval(consultarPedidos, INTERVALO_CONSULTA_MS);
    return () => {
      activo = false;
      clearInterval(intervalo);
    };
  }, []);

  useEffect(() => {
    if (location.pathname === '/admin/pedidos') {
      setPedidosNuevos(0);
    }
    setSidebarAbierta(false);
  }, [location.pathname]);

  const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

  const irAPedidos = () => {
    setToast(null);
    navigate('/admin/pedidos');
  };

  const cerrarSesionAdmin = () => {
    guardarTokenAdmin(null);
    window.location.href = '/admin';
  };

  // Volver a dueño exige la contraseña de verdad: el AdminLogin la valida contra
  // /admin-login/, no alcanza con que el token siga guardado.
  if (pidiendoCredenciales) {
    return (
      <AdminLogin
        onIngreso={() => {
          volverAModoDueno();
          setPidiendoCredenciales(false);
        }}
      />
    );
  }

  // Guard de rutas en un solo lugar: tipear a mano una URL prohibida redirige a la
  // primera sección habilitada en vez de renderizarla.
  const seccionActual = seccionDeRuta(location.pathname);
  if (seccionActual && !puede(seccionActual.clave)) {
    const destino = seccionesVisibles[0];
    if (destino) return <Navigate to={destino.ruta} replace />;
    return (
      <div className="dashboard-container">
        <main className="main-content">
          <div className="estado-vacio" style={{ padding: '48px 24px', textAlign: 'center' }}>
            <p>El dueño todavía no habilitó ninguna sección para el modo empleado.</p>
            <button type="button" className="btn-vibrante" onClick={() => setPidiendoCredenciales(true)}>
              🔒 Volver a modo dueño
            </button>
          </div>
        </main>
      </div>
    );
  }

  const gruposVisibles = seccionesVisibles.reduce((acc, seccion) => {
    (acc[seccion.grupo] ||= []).push(seccion);
    return acc;
  }, {});

  return (
    <div className="dashboard-container">
      <button
        type="button"
        className="sidebar-toggle-mobil"
        onClick={() => setSidebarAbierta((v) => !v)}
        aria-label="Abrir menú"
      >
        {sidebarAbierta ? '✕' : '☰'}
      </button>

      {sidebarAbierta && <div className="sidebar-backdrop" onClick={() => setSidebarAbierta(false)} />}

      {/* Sidebar */}
      <aside className={`sidebar${sidebarAbierta ? ' sidebar-abierta' : ''}`}>
        <div className="sidebar-superior">
          <div className="sidebar-brand">
            🍔 ANTOJO Admin
          </div>

          {/* El menú sale del catálogo de secciones (utils/modoEmpleado.js) filtrado
              por los permisos: en modo dueño están todas, en modo empleado solo las
              que el dueño habilitó. */}
          <nav className="sidebar-menu">
            {Object.entries(gruposVisibles).map(([grupo, secciones]) => (
              <React.Fragment key={grupo}>
                <div className="menu-section-title">{grupo}</div>
                {secciones.map((seccion) => (
                  <NavLink
                    key={seccion.clave}
                    to={seccion.ruta}
                    end={seccion.exacta}
                    className={linkClass}
                  >
                    <span className="menu-item-icono" aria-hidden="true">{seccion.icono}</span>
                    <span className="menu-item-texto">{seccion.etiqueta}</span>
                    {seccion.clave === 'pedidos' && pedidosNuevos > 0 && (
                      <span className="sidebar-badge">{pedidosNuevos}</span>
                    )}
                  </NavLink>
                ))}
              </React.Fragment>
            ))}
          </nav>
        </div>

        <div className="sidebar-footer">
          <SelectorTema />
          <a href="/" className="menu-item menu-item-externa">
            👁️ Ver tienda online
          </a>
          {/* En modo empleado se cambia "Cerrar sesión" por "Volver a modo dueño":
              así el empleado siempre tiene salida sin poder desloguear la tablet a
              mitad del turno (volver a entrar necesitaría al dueño). */}
          {esEmpleado ? (
            <button
              type="button"
              className="menu-item menu-item-externa sidebar-cerrar-sesion"
              onClick={() => setPidiendoCredenciales(true)}
            >
              🔒 Volver a modo dueño
            </button>
          ) : (
            <button type="button" className="menu-item menu-item-externa sidebar-cerrar-sesion" onClick={cerrarSesionAdmin}>
              🚪 Cerrar sesión
            </button>
          )}
        </div>
      </aside>

      <Toasts />

      {/* Contenido Principal */}
      <main className="main-content">
        <Outlet />
      </main>

      {toast && (
        <div className="toast-pedido-nuevo" onClick={irAPedidos}>
          <span className="toast-pedido-nuevo-icono">🔔</span>
          <div className="toast-pedido-nuevo-info">
            <strong>Nuevo pedido{toast.cliente ? ` de ${toast.cliente}` : ''}</strong>
            <span>
              {toast.tipo_entrega === 'delivery' ? '🛵 Delivery' : '🏠 Retiro en local'} · {formatearPrecio(toast.total)}
            </span>
          </div>
          <button
            type="button"
            className="toast-pedido-nuevo-cerrar"
            onClick={(e) => { e.stopPropagation(); setToast(null); }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
