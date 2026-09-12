import React, { useEffect, useState } from 'react';
import api from '../services/api';

const formatearPrecio = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(v);

const formatearFecha = (iso) => {
  const fecha = new Date(iso);
  const mismoAnio = fecha.getFullYear() === new Date().getFullYear();
  return fecha.toLocaleDateString('es-AR', { day: 'numeric', month: 'short', ...(mismoAnio ? {} : { year: 'numeric' }) });
};

const describirItem = (item) => {
  const nombre = item.combo_nombre || [item.producto_nombre, item.presentacion_nombre].filter(Boolean).join(' ');
  const extras = (item.extras_detalle || []).map((e) => (e.cantidad > 1 ? `${e.cantidad}x ${e.nombre}` : e.nombre));
  return `${item.cantidad} x ${nombre}${extras.length ? ` + ${extras.join(', ')}` : ''}`;
};

// Lo que ve un cliente logueado al tocar sus puntos. Antes ese botón cerraba la sesión
// sin preguntar, y no había dónde ver los puntos, los datos ni los pedidos anteriores.
export default function MiCuentaPanel({ cliente, onClose, onCerrarSesion, onRepetir, onClienteActualizado }) {
  const [pedidos, setPedidos] = useState(null);
  const [errorPedidos, setErrorPedidos] = useState(false);
  const [premios, setPremios] = useState([]);

  useEffect(() => {
    api.get('/clientes/mi-cuenta/pedidos/')
      .then((res) => setPedidos(res.data))
      .catch(() => { setErrorPedidos(true); setPedidos([]); });
    api.get('/recompensas/').then((res) => setPremios(res.data.filter((p) => p.activa))).catch(() => {});
    // Los puntos se acreditan cuando el local confirma el pedido: al abrir se traen al día.
    api.get('/clientes/mi-cuenta/').then((res) => onClienteActualizado(res.data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const alPresionar = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [onClose]);

  const puntos = cliente.puntos;
  const canjeables = premios.filter((p) => p.puntos <= puntos);
  const proximo = premios.filter((p) => p.puntos > puntos).sort((a, b) => a.puntos - b.puntos)[0];

  return (
    <div className="cuenta-fondo" onClick={onClose}>
      <div className="cuenta-card mi-cuenta" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="cuenta-cerrar" onClick={onClose} aria-label="Cerrar">✕</button>

        <h3 className="mi-cuenta-hola">Hola, {(cliente.nombre || '').split(' ')[0] || 'de nuevo'} 👋</h3>

        <div className="mi-cuenta-puntos">
          <span className="mi-cuenta-puntos-estrella" aria-hidden="true">⭐</span>
          <div>
            <strong>{puntos} {puntos === 1 ? 'punto' : 'puntos'}</strong>
            <small>Equivalen a {formatearPrecio(cliente.puntos_en_pesos)} de descuento</small>
          </div>
        </div>
        {canjeables.length > 0 ? (
          <p className="mi-cuenta-premio">
            🎁 Ya podés canjear <strong>{canjeables.map((p) => p.nombre).join(', ')}</strong>. Elegilo al confirmar tu pedido.
          </p>
        ) : proximo ? (
          <p className="mi-cuenta-premio">
            🎁 Te faltan <strong>{proximo.puntos - puntos} pts</strong> para {proximo.nombre}.
          </p>
        ) : null}

        <h4 className="mi-cuenta-titulo">Mis pedidos</h4>
        {pedidos === null ? (
          <p className="mi-cuenta-vacio">Cargando tus pedidos...</p>
        ) : errorPedidos ? (
          <p className="mi-cuenta-vacio">No pudimos cargar tus pedidos. Probá de nuevo en un rato.</p>
        ) : pedidos.length === 0 ? (
          <p className="mi-cuenta-vacio">
            Todavía no hiciste pedidos con tu cuenta. Cuando pidas, van a aparecer acá para repetirlos con un toque.
          </p>
        ) : (
          <div className="mi-cuenta-pedidos">
            {pedidos.map((pedido) => (
              <div key={pedido.id} className="mi-cuenta-pedido">
                <div className="mi-cuenta-pedido-cabecera">
                  <span>{formatearFecha(pedido.creado)}</span>
                  {!pedido.confirmado && <span className="mi-cuenta-por-confirmar">Esperando confirmación</span>}
                  <strong>{formatearPrecio(pedido.total)}</strong>
                </div>
                <ul className="mi-cuenta-pedido-items">
                  {pedido.items.map((item) => <li key={item.id}>{describirItem(item)}</li>)}
                </ul>
                <button type="button" className="mi-cuenta-repetir" onClick={() => onRepetir(pedido)}>
                  🔁 Repetir pedido
                </button>
              </div>
            ))}
          </div>
        )}

        <h4 className="mi-cuenta-titulo">Mis datos</h4>
        <dl className="mi-cuenta-datos">
          <div><dt>Nombre</dt><dd>{cliente.nombre || '-'}</dd></div>
          <div><dt>Email</dt><dd>{cliente.email}</dd></div>
          {cliente.telefono && <div><dt>Teléfono</dt><dd>{cliente.telefono}</dd></div>}
          <div><dt>Cliente desde</dt><dd>{new Date(cliente.creado).toLocaleDateString('es-AR')}</dd></div>
        </dl>

        <button type="button" className="mi-cuenta-salir" onClick={onCerrarSesion}>Cerrar sesión</button>
      </div>
    </div>
  );
}
