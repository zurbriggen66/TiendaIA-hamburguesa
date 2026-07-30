import React, { useState } from 'react';

export default function NavBar({ configuracion, totalItems, onPedir }) {
  const [menuAbierto, setMenuAbierto] = useState(false);

  const scrollA = (id) => (e) => {
    e.preventDefault();
    setMenuAbierto(false);
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <nav className="nav-bar">
      <a href="#" className="nav-logo" onClick={scrollA('inicio')}>
        <img src={configuracion.logo} alt="" className="nav-logo-img" />
        <span>ANTOJO BURGER</span>
      </a>

      <button
        type="button"
        className="nav-toggle-mobil"
        onClick={() => setMenuAbierto((v) => !v)}
        aria-label="Abrir menú"
      >
        {menuAbierto ? '✕' : '☰'}
      </button>

      <div className={`nav-links${menuAbierto ? ' abierto' : ''}`}>
        <a href="#menu" onClick={scrollA('menu')}>Menú</a>
        <a href="#antojo-dia" onClick={scrollA('antojo-dia')}>Antojo del día</a>
        <a href={configuracion.instagram} target="_blank" rel="noopener noreferrer" onClick={() => setMenuAbierto(false)}>Instagram</a>
      </div>

      <button type="button" className="nav-btn-pedir" onClick={onPedir}>
        📲 <span className="nav-btn-pedir-texto">Pedir</span><span className="nav-btn-pedir-texto-larga"> por WhatsApp</span>
        {totalItems > 0 && <span className="nav-btn-pedir-badge">{totalItems}</span>}
      </button>
    </nav>
  );
}
