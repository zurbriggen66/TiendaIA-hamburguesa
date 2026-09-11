import React from 'react';

// Si una pantalla tira un error al dibujarse, React desmonta TODA la app y queda en
// blanco hasta apretar F5. Esto lo ataja: muestra qué pasó (para poder mandarle una
// captura al programador) y un botón para recargar. En el panel envuelve solo el
// contenido, así el menú lateral sigue andando y se puede ir a otra sección.
export default class ErrorPantalla extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Error al dibujar la pantalla:', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="estado-vacio" style={{ padding: '48px 24px', textAlign: 'center' }}>
        <p>Algo falló al mostrar esta pantalla.</p>
        <button type="button" className="btn-vibrante" onClick={() => window.location.reload()}>
          Recargar
        </button>
        <p style={{ marginTop: 16, fontSize: '0.8rem', opacity: 0.7 }}>
          Detalle: {String(this.state.error?.message || this.state.error)}
        </p>
      </div>
    );
  }
}
