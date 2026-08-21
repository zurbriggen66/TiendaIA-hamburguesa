import React, { useState } from 'react';

export default function NavBar({ configuracion, totalItems, onPedir, cliente, onAbrirCuenta, onCerrarSesion }) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const scrollA = (id) => (e) => {
    e.preventDefault();
    setMenuAbierto(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="nav-bar nav-bar-pro">
      <button
        type="button"
        className="nav-toggle-mobil"
        onClick={() => setMenuAbierto((v) => !v)}
        aria-label="Abrir menú"
      >
        {menuAbierto ? '✕' : '☰'}
      </button>

      <a href="#" className="nav-logo" onClick={scrollA('inicio')}>
        <img src={configuracion.logo} alt="Antojo Burger" className="nav-logo-img" />
      </a>

      <div className="nav-acciones">
      {/* Acceso a la cuenta siempre visible: escondido dentro del menú hamburguesa
          nadie se registraba. Logueado muestra los puntos, que es el gancho. */}
      {cliente ? (
        <button
          type="button"
          className="nav-btn-cuenta nav-btn-cuenta-activa"
          onClick={onCerrarSesion}
          title="Cerrar sesión"
        >
          <span className="nav-btn-cuenta-estrella" aria-hidden="true">⭐</span>
          <span className="nav-btn-cuenta-pts">{cliente.puntos}</span>
        </button>
      ) : (
        <button type="button" className="nav-btn-cuenta" onClick={onAbrirCuenta}>
          <span className="nav-btn-cuenta-brillo" aria-hidden="true" />
          <span className="nav-btn-cuenta-texto">Registrate</span>
        </button>
      )}

      <button type="button" className="nav-btn-carrito" onClick={onPedir} aria-label="Ver carrito">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M8 7V6a4 4 0 118 0v1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" fill="none" />
          <path d="M5.5 7h13l1.3 12.2a2 2 0 0 1-2 2.3H6.2a2 2 0 0 1-2-2.3L5.5 7z" fill="currentColor" />
          <circle cx="9.3" cy="12.5" r="1" fill="var(--navbar-bg, #0d2b23)" />
          <circle cx="14.7" cy="12.5" r="1" fill="var(--navbar-bg, #0d2b23)" />
        </svg>
        {totalItems > 0 && <span className="nav-btn-carrito-badge">{totalItems}</span>}
      </button>
      </div>

      <div className={`nav-links${menuAbierto ? ' abierto' : ''}`}>
        <a href="#menu" onClick={scrollA('menu')}>Menú</a>
        <a href="#antojo-dia" onClick={scrollA('antojo-dia')}>Antojo del día</a>
        <a href={configuracion.instagram} target="_blank" rel="noopener noreferrer" onClick={() => setMenuAbierto(false)}>Instagram</a>
        {cliente ? (
          <a
            href="#"
            className="nav-cuenta"
            onClick={(e) => { e.preventDefault(); setMenuAbierto(false); onCerrarSesion(); }}
            title="Cerrar sesión"
          >
            ⭐ {cliente.puntos} pts · {cliente.nombre.split(' ')[0]}
          </a>
        ) : (
          <a href="#" onClick={(e) => { e.preventDefault(); setMenuAbierto(false); onAbrirCuenta(); }}>Mi cuenta</a>
        )}
      </div>

      <style>{`
        .nav-bar-pro {
          display: grid !important;
          /* Mantenemos las tres columnas originales */
          grid-template-columns: 1fr auto 1fr !important;
          align-items: center !important;
          padding: 12px 20px !important; /* Espaciado extra para que respire */
          background-color: var(--navbar-bg, #0d2b23); /* Fondo oscuro unificado */
          gap: 15px 0;
        }

        .nav-bar-pro .nav-toggle-mobil {
          grid-column: 1 !important;
          grid-row: 1 !important; /* Ancla el menú en la primera fila */
          justify-self: start !important;
          /* Diseño mejorado del botón para que no se vea como un parche */
          background: transparent !important;
          border: 1px solid rgba(255, 255, 255, 0.2) !important;
          color: #fff !important;
          font-size: 22px !important;
          width: 44px !important;
          height: 44px !important;
          border-radius: 8px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          cursor: pointer !important;
        }

        .nav-bar-pro .nav-logo {
          grid-column: 2 !important;
          grid-row: 1 !important; /* Ancla el logo en la primera fila */
          justify-self: center !important;
          display: flex !important;
          align-items: center;
        }

        .nav-logo-img {
          /* Solución a la distorsión */
          height: auto !important; 
          width: 100% !important;
          max-height: 55px !important; 
          max-width: 220px !important;
          object-fit: contain !important;
          border-radius: 0 !important;
          background: none !important;
          border: none !important;
          box-shadow: none !important;
        }

        .nav-bar-pro .nav-acciones {
          grid-column: 3 !important;
          grid-row: 1 !important;
          justify-self: end !important;
          display: flex !important;
          align-items: center;
          gap: 10px;
        }

        .nav-bar-pro .nav-btn-carrito {
          position: relative !important;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: none;
          background: transparent;
          color: #ffffff;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: none;
        }

        /* Botón de registro: pastilla con un brillo que barre cada tanto, para que
           llame la atención sin ser un cartel parpadeante. */
        .nav-btn-cuenta {
          position: relative;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.28);
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          border-radius: 999px;
          padding: 9px 16px;
          font-size: 0.78rem;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
          cursor: pointer;
          white-space: nowrap;
          transition: transform .2s ease, border-color .2s ease, background .2s ease;
        }

        .nav-btn-cuenta:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, .6);
          background: rgba(255, 255, 255, .13);
        }

        .nav-btn-cuenta-brillo {
          position: absolute;
          top: 0;
          left: -60%;
          width: 45%;
          height: 100%;
          background: linear-gradient(100deg, transparent, rgba(255,255,255,.35), transparent);
          animation: navBrillo 4.5s ease-in-out infinite;
        }

        @keyframes navBrillo {
          0%, 60% { left: -60%; }
          85%, 100% { left: 130%; }
        }

        .nav-btn-cuenta-texto { position: relative; z-index: 1; }

        /* Ya registrado: la pastilla muestra los puntos. */
        .nav-btn-cuenta-activa {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: linear-gradient(135deg, rgba(251,191,36,.22), rgba(251,191,36,.1));
          border-color: rgba(251, 191, 36, .5);
        }

        .nav-btn-cuenta-estrella { font-size: .9rem; }
        .nav-btn-cuenta-pts { font-size: .85rem; }

        @media (prefers-reduced-motion: reduce) {
          .nav-btn-cuenta-brillo { animation: none; }
        }

        @media (max-width: 480px) {
          .nav-btn-cuenta { padding: 8px 11px; font-size: .68rem; }
        }

        .nav-btn-carrito-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: 50%;
          background: var(--accent-gradient, linear-gradient(135deg, #f4854a 0%, #e8630c 100%));
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0, 0, 0, 0.3);
        }

        .nav-bar-pro .nav-links {
          /* Eliminamos el grid-column y grid-row */
          position: absolute !important;
          top: 100% !important; /* Lo ubica exactamente debajo de la barra */
          left: 0 !important;
          width: 100% !important;
          background-color: var(--navbar-bg, #0d2b23) !important; /* Mismo fondo oscuro */
          padding: 20px 0 30px 0 !important; /* Espaciado arriba y abajo */
          box-shadow: 0 15px 20px rgba(0, 0, 0, 0.4) !important; /* Sombra para despegarlo del fondo */
          
          display: none;
          flex-direction: column;
          align-items: center;
          gap: 20px !important; /* Separación más limpia entre los botones */
        }

        .nav-bar-pro .nav-links.abierto {
          display: flex !important;
        }

        .nav-bar-pro {
          display: grid !important;
          grid-template-columns: 1fr auto 1fr !important;
          align-items: center !important;
          padding: 12px 20px !important;
          background-color: var(--navbar-bg, #0d2b23);
          gap: 15px 0;
          /* Agrega estas dos líneas: */
          position: relative !important; 
          z-index: 9999 !important; 
        }

        @media (max-width: 480px) {
          .nav-logo-img {
            max-height: 45px !important; /* Escala correctamente en móviles chicos */
            max-width: 170px !important;
          }
          .nav-bar-pro {
            padding: 10px 15px !important;
          }
        }
      `}</style>
    </nav>
  );
}