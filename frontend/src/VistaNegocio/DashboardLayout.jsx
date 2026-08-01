import React, { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { obtenerConfigImpresion, imprimirPedido } from '../utils/impresion';

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

  const [pedidosNuevos, setPedidosNuevos] = useState(0);
  const [toast, setToast] = useState(null);
  const [sidebarAbierta, setSidebarAbierta] = useState(false);
  const idsVistos = useRef(new Set());
  const primeraConsulta = useRef(true);

  useEffect(() => {
    let activo = true;

    const consultarPedidos = async () => {
      try {
        const { data } = await api.get('/pedidos/');
        if (!activo) return;

        if (primeraConsulta.current) {
          data.forEach((p) => idsVistos.current.add(p.id));
          primeraConsulta.current = false;
          return;
        }

        const nuevos = data.filter((p) => !idsVistos.current.has(p.id));
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
        <div>
          <div className="sidebar-brand">
            🍔 ANTOJO Admin
          </div>

          <nav className="sidebar-menu">
            <div className="menu-section-title">Inicio</div>
            <a href="#" className="menu-item">Inicio</a>

            <div className="menu-section-title">Gestión</div>
            <NavLink to="/admin/productos" className={linkClass}>Productos & Stock</NavLink>
            <NavLink to="/admin/estadisticas" className={linkClass}>Estadísticas</NavLink>
            <NavLink to="/admin" end className={linkClass}>Diseño & Colores</NavLink>
            <NavLink to="/admin/pedidos" className={linkClass}>
              Ventas & Pedidos
              {pedidosNuevos > 0 && <span className="sidebar-badge">{pedidosNuevos}</span>}
            </NavLink>
            <NavLink to="/admin/combos" className={linkClass}>Combos</NavLink>
            <NavLink to="/admin/antojo" className={linkClass}>🔥 Antojo del día</NavLink>
            <NavLink to="/admin/cobranzas" className={linkClass}>💰 Cobranzas</NavLink>
            <NavLink to="/admin/gastos" className={linkClass}>Gastos</NavLink>
            <NavLink to="/admin/impresion" className={linkClass}>🖨️ Impresión</NavLink>
          </nav>
        </div>

        <div className="sidebar-footer">
          <a href="/" className="menu-item menu-item-externa">
            👁️ Ver tienda online
          </a>
        </div>
      </aside>

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
