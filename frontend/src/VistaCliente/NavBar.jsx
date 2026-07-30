import React, { useState } from 'react';

export default function NavBar({ configuracion, totalItems, onPedir }) {
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

      <button type="button" className="nav-btn-carrito" onClick={onPedir} aria-label="Ver carrito">
        🛒
        {totalItems > 0 && <span className="nav-btn-carrito-badge">{totalItems}</span>}
      </button>

      <div className={`nav-links${menuAbierto ? ' abierto' : ''}`}>
        <a href="#menu" onClick={scrollA('menu')}>Menú</a>
        <a href="#antojo-dia" onClick={scrollA('antojo-dia')}>Antojo del día</a>
        <a href={configuracion.instagram} target="_blank" rel="noopener noreferrer" onClick={() => setMenuAbierto(false)}>Instagram</a>
      </div>

      <style>{`
        .nav-bar-pro {
          display: grid !important;
          /* Mantenemos las tres columnas originales */
          grid-template-columns: 1fr auto 1fr !important;
          align-items: center !important;
          padding: 12px 20px !important; /* Espaciado extra para que respire */
          background-color: #1a1614; /* Fondo oscuro unificado */
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

        .nav-bar-pro .nav-btn-carrito {
          grid-column: 3 !important;
          grid-row: 1 !important; /* Ancla el carrito en la primera fila */
          justify-self: end !important;
          position: relative !important;
          width: 46px;
          height: 46px;
          border-radius: 50%;
          border: none;
          background: linear-gradient(135deg, #f0651f 0%, #c73f16 100%);
          color: #fff;
          font-size: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          box-shadow: 0 4px 10px rgba(199, 63, 22, 0.25); /* Sombra elegante */
        }
        
        .nav-btn-carrito-badge {
          position: absolute;
          top: -2px;
          right: -2px;
          min-width: 18px;
          height: 18px;
          padding: 0 4px;
          border-radius: 50%;
          background: #fff;
          color: #c73f16;
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
          background-color: #1a1614 !important; /* Mismo fondo oscuro */
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
          background-color: #1a1614;
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