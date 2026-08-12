import React from 'react';

const ENLACE_CREAR_TIENDA = 'https://www.instagram.com/tiendaia_arg';

export default function Footer({ configuracion }) {
  return (
    <footer style={{
      // Fondo negro "flashero": Degradado radial que da profundidad
      background: 'radial-gradient(ellipse at top, #1c1510 0%, #030303 80%)',
      padding: '50px 20px 30px 20px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '25px',
      // Borde superior brillante muy sutil y sombra hacia arriba
      borderTop: '1px solid rgba(242, 104, 0, 0.2)',
      boxShadow: '0 -10px 30px rgba(0, 0, 0, 0.8)',
      marginTop: '40px',
      position: 'relative'
    }}>
      
      {/* 1. Logo de la Hamburguesería con efecto de resplandor */}
      {configuracion?.logo && (
        <div style={{ marginBottom: '10px' }}>
          <img 
            src={configuracion.logo} 
            alt="Logo Hamburguesería" 
            style={{ 
              width: '130px', 
              height: '130px', 
              objectFit: 'contain',
              borderRadius: '50%',
              backgroundColor: '#0a0a0a',
              padding: '12px',
              boxShadow: '0 0 25px rgba(242, 104, 0, 0.15), inset 0 0 15px rgba(242, 104, 0, 0.1)',
              border: '1px solid rgba(242, 104, 0, 0.1)'
            }} 
          />
        </div>
      )}

      {/* 2. Botón de Instagram Brillante */}
      {configuracion?.instagram && (
        <a 
          href={configuracion.instagram} 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #ff7a00 0%, #cc5500 100%)',
            color: '#ffffff',
            padding: '14px',
            borderRadius: '50%',
            textDecoration: 'none',
            boxShadow: '0 0 20px rgba(242, 104, 0, 0.5), 0 4px 10px rgba(0,0,0,0.5)',
            transition: 'all 0.3s ease',
            border: '1px solid #ff9933'
          }}
          onMouseOver={(e) => { e.currentTarget.style.boxShadow = '0 0 30px rgba(242, 104, 0, 0.8)'; }}
          onMouseOut={(e) => { e.currentTarget.style.boxShadow = '0 0 20px rgba(242, 104, 0, 0.5), 0 4px 10px rgba(0,0,0,0.5)'; }}
        >
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
        </a>
      )}

      {/* 3. Banner promocional: invitación a crear una tienda propia */}
      <a
        href={ENLACE_CREAR_TIENDA}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          width: '100%',
          maxWidth: '360px',
          marginTop: '15px',
          padding: '22px 24px',
          borderRadius: '18px',
          background: 'linear-gradient(135deg, #fb923c, #ef4444)',
          textDecoration: 'none',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '10px',
          textAlign: 'center',
          boxShadow: '0 12px 30px -10px rgba(239, 68, 68, 0.55)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        }}
        onMouseOver={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 16px 34px -10px rgba(239, 68, 68, 0.7)'; }}
        onMouseOut={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 12px 30px -10px rgba(239, 68, 68, 0.55)'; }}
      >
        <span style={{ fontSize: '1.8rem', lineHeight: 1 }}>🚀</span>
        <span style={{ color: '#ffffff', fontWeight: 900, fontSize: '1.05rem', letterSpacing: '-0.01em' }}>
          Creá una tienda así para tu emprendimiento
        </span>
        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '0.82rem' }}>
          Pedidos online, catálogo y carrito, listos para tu negocio.
        </span>
        <span style={{
          marginTop: '6px',
          padding: '9px 20px',
          borderRadius: '999px',
          background: '#ffffff',
          color: '#c73f16',
          fontWeight: 800,
          fontSize: '0.85rem',
        }}>
          Quiero la mía
        </span>
      </a>

      {/* 4. Sección de Desarrollo: TiendaIA Premium */}
      <div style={{
        marginTop: '15px',
        paddingTop: '25px',
        borderTop: '1px solid rgba(255, 255, 255, 0.05)',
        width: '100%',
        maxWidth: '320px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '8px'
      }}>
        <span style={{ 
          color: '#555555', 
          fontSize: '0.75rem', 
          textTransform: 'uppercase', 
          letterSpacing: '2px',
          fontWeight: 'bold'
        }}>
          Desarrollado por
        </span>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          fontWeight: '900',
          fontSize: '1.4rem',
          letterSpacing: '0.5px'
        }}>
          {/* Ícono de TiendaIA con resplandor */}
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f26800" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0px 0px 6px rgba(242,104,0,0.6))' }}>
            <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
            <polyline points="2 17 12 22 22 17"></polyline>
            <polyline points="2 12 12 17 22 12"></polyline>
          </svg>
          {/* Texto TiendaIA con brillo tipográfico */}
          <span style={{ 
            color: '#ffffff', 
            textShadow: '0 0 10px rgba(255,255,255,0.2)' 
          }}>
            Tienda<span style={{ 
              color: '#f26800', 
              textShadow: '0 0 12px rgba(242,104,0,0.6)' 
            }}>IA</span>
          </span>
        </div>
      </div>

      {/* 5. Derechos de autor (Movido al final) */}
      <span style={{ 
        color: '#7a7a7a', 
        fontSize: '0.85rem', 
        textAlign: 'center', 
        marginTop: '10px', 
        letterSpacing: '0.5px' 
      }}>
        © {new Date().getFullYear()} ANTOJO Burger - Todos los derechos reservados
      </span>

    </footer>
  );
}