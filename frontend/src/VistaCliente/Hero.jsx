import React from 'react';

export default function Hero({ configuracion }) {
  const irAlMenu = () => {
    document.getElementById('menu')?.scrollIntoView({ behavior: 'smooth' });
  };

  const backendBaseUrl = import.meta.env.VITE_API_URL?.replace(/\/api\/?$/, '') || 'http://127.0.0.1:8000';
  const getMediaUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('//')) {
      return path;
    }
    return `${backendBaseUrl}${path.startsWith('/') ? '' : '/'}${path}`;
  };

  const videoSrc = getMediaUrl(configuracion.video_principal);
  const imageSrc = getMediaUrl(configuracion.imagen_principal);

  return (
    <header id="inicio" className="hero" style={{ position: 'relative', overflow: 'hidden', height: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      
      {/* Condicional: Si hay video, lo renderiza. Si no, renderiza la imagen */}
      {videoSrc ? (
        <video
          autoPlay
          loop
          muted
          playsInline
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            zIndex: 0
          }}
        >
          <source src={videoSrc} type="video/mp4" />
          Tu navegador no soporta videos HTML5.
        </video>
      ) : (
        <div
          className="hero-fondo"
          style={{
            backgroundImage: `url(${imageSrc})`,
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            zIndex: 0,
            // 'contain' y no 'cover': la portada es un logo bien apaisado y con cover
            // quedaba recortado. El color de fondo continúa el verde de la imagen.
            backgroundSize: 'contain',
            backgroundRepeat: 'no-repeat',
            backgroundPosition: 'center center',
            backgroundColor: '#12301f',
          }}
        ></div>
      )}

      {/* Capa oscura superpuesta: Se bajó la opacidad a 0.3 para que el fondo sea menos oscuro */}
      <div 
        className="hero-overlay-oscuro" 
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.3)', 
          zIndex: 1
        }}
      ></div>

      {/* Contenido del Hero (Texto y Botón) */}
      <div className="hero-contenido" style={{ 
        position: 'relative', 
        zIndex: 2, 
        textAlign: 'center', 
        color: '#fff', 
        padding: '2rem 1rem',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        
        {/* Se agregó un margen inferior grande (margin-bottom: 4rem o 64px) para empujar el botón hacia abajo */}
        <h1 className="hero-titulo" style={{ 
          fontSize: '2.8rem', 
          fontWeight: '900', 
          margin: '0 0 4rem 0',
          textShadow: '2px 2px 4px rgba(0,0,0,0.6)', // Sombra para que el texto resalte aunque el fondo sea más claro
          lineHeight: '1.1'
        }}>
          EL ANTOJO QUE<br/>MERECÉS
        </h1>

        {/* Botón rediseñado: efecto vidrio (glassmorphism) sutil, borde fino claro, sin relleno de color, look premium */}
        <button 
          type="button" 
          className="hero-cta-delicado" 
          onClick={irAlMenu}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            padding: '14px 36px',
            borderRadius: '50px',
            border: '1px solid rgba(255, 255, 255, 0.35)', // Borde fino blanco translúcido
            background: 'rgba(255, 255, 255, 0.06)', // Fondo casi transparente, efecto vidrio
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
            color: '#ffffff',
            fontSize: '0.85rem',
            fontWeight: '600',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            cursor: 'pointer',
            transition: 'all 0.35s ease',
            outline: 'none',
          }}
        >
          CONSULTA NUESTRA CARTA
          <svg 
            className="chevron-icon"
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            style={{ animation: 'bounceChevron 2s infinite' }}
          >
            <path d="M6 9L12 15L18 9" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        <style>
          {`
            @keyframes bounceChevron {
              0%, 100% { transform: translateY(0); }
              50% { transform: translateY(4px); }
            }
            .hero-cta-delicado:hover {
              background: rgba(255, 255, 255, 0.14) !important;
              border-color: rgba(255, 255, 255, 0.6) !important;
              transform: translateY(-2px);
              box-shadow: 0 6px 24px rgba(0, 0, 0, 0.25);
            }
          `}
        </style>
      </div>
    </header>
  );
}