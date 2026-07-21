import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';

export default function DashboardLayout() {
  const linkClass = ({ isActive }) => `menu-item${isActive ? ' active' : ''}`;

  return (
    <div className="dashboard-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <div>
          <div className="sidebar-brand">
            🍔 ZetaPanel
          </div>

          <nav className="sidebar-menu">
            <div className="menu-section-title">Inicio</div>
            <a href="#" className="menu-item">Inicio</a>

            <div className="menu-section-title">Gestión</div>
            <NavLink to="/admin/productos" className={linkClass}>Productos & Stock</NavLink>
            <a href="#" className="menu-item">Estadísticas</a>
            <NavLink to="/admin" end className={linkClass}>Diseño & Colores</NavLink>
            <NavLink to="/admin/pedidos" className={linkClass}>Ventas & Pedidos</NavLink>
            <NavLink to="/admin/gastos" className={linkClass}>Gastos</NavLink>
          </nav>
        </div>

        <div className="sidebar-footer">
          <a href="/" className="menu-item" style={{border: '1px solid #e5e7eb', textAlign: 'center'}}>
            👁️ Ver tienda online
          </a>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
