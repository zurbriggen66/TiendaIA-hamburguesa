import React from 'react';

export default function Hero({ configuracion }) {
  const irAlMenu = () => {
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header id="inicio" className="hero">
      <div
        className="hero-fondo"
        style={{ backgroundImage: `url(${configuracion.imagen_principal})` }}
      >
        <div className="hero-overlay-oscuro"></div>
      </div>

      <div className="hero-contenido">
        <h1 className="hero-titulo">EL ANTOJO QUE MERECÉS</h1>
        <p className="hero-subtitulo">
          Hamburguesas artesanales hechas al momento, con los mejores ingredientes.
          Pedí online y recibilo por delivery o retiralo en el local.
        </p>
        <button type="button" className="btn-vibrante hero-cta" onClick={irAlMenu}>
          📲 Pedir por WhatsApp
        </button>
      </div>
    </header>
  );
}
