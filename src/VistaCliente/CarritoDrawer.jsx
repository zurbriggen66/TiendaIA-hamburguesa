import React, { useState } from 'react';
import api from '../services/api';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const precioUnitarioLinea = (linea) =>
  Number(linea.item.precio) + (linea.extras || []).reduce((acc, e) => acc + Number(e.precio) * e.cantidad, 0);

const textoExtras = (extras) =>
  (extras || []).map((e) => `${e.cantidad > 1 ? `${e.cantidad}x ` : ''}${e.nombre}`).join(', ');

function armarMensajeWhatsapp({ nombre, telefono, tipoEntrega, direccion, items, total }) {
  const lineas = [
    '🍔 *Nuevo pedido - ANTOJO Burger*',
    '',
    `Cliente: ${nombre}`,
    `Teléfono: ${telefono}`,
    `Entrega: ${tipoEntrega === 'delivery' ? 'Delivery' : 'Retiro en local'}`,
  ];
  if (tipoEntrega === 'delivery') {
    lineas.push(`Dirección: ${direccion}`);
    lineas.push('(El envío tiene un costo adicional a coordinar)');
  }
  lineas.push('', 'Productos:');
  items.forEach((linea) => {
    const extrasTexto = linea.extras && linea.extras.length > 0
      ? ` (+ ${textoExtras(linea.extras)})`
      : '';
    lineas.push(`${linea.cantidad}x ${linea.item.nombre}${extrasTexto} - ${formatearPrecio(precioUnitarioLinea(linea) * linea.cantidad)}`);
  });
  lineas.push('', `*Total: ${formatearPrecio(total)}*`);
  return lineas.join('\n');
}

export default function CarritoDrawer({ items, whatsapp, onClose, onCambiarCantidad, onQuitar, onVaciar }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState('retiro');
  const [direccion, setDireccion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [errores, setErrores] = useState({});

  const total = items.reduce((acc, linea) => acc + precioUnitarioLinea(linea) * linea.cantidad, 0);

  const enviarPedido = async (e) => {
    e.preventDefault();
    if (items.length === 0) return;

    const nuevosErrores = {};
    if (!nombre.trim()) nuevosErrores.nombre = 'Falta tu nombre';
    if (!telefono.trim()) nuevosErrores.telefono = 'Falta tu teléfono';
    if (tipoEntrega === 'delivery' && !direccion.trim()) nuevosErrores.direccion = 'Falta la dirección de entrega';

    if (Object.keys(nuevosErrores).length > 0) {
      setErrores(nuevosErrores);
      return;
    }
    setErrores({});

    setEnviando(true);
    try {
      await api.post('/pedidos/', {
        cliente: nombre.trim(),
        telefono: telefono.trim(),
        tipo_entrega: tipoEntrega,
        direccion: tipoEntrega === 'delivery' ? direccion.trim() : '',
        origen: 'web',
        items: items.map((linea) =>
          linea.tipo === 'combo'
            ? { combo: linea.item.id, cantidad: linea.cantidad }
            : {
                producto: linea.item.id,
                cantidad: linea.cantidad,
                extras: (linea.extras || []).map((e) => ({ producto: e.id, cantidad: e.cantidad })),
              }
        ),
      });
    } catch (error) {
      // No bloqueamos el envío por WhatsApp aunque falle el guardado en el sistema.
      console.error('Error al registrar el pedido:', error);
    }

    const mensaje = armarMensajeWhatsapp({ nombre, telefono, tipoEntrega, direccion, items, total });
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`, '_blank');

    setEnviando(false);
    setExito(true);
    onVaciar();
  };

  return (
    <div className="pedido-overlay" onClick={onClose}>
      <aside className="pedido-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="pedido-header">
          <div className="pedido-header-titulo">
            <span className="pedido-header-icono">🛍️</span>
            <h3>Tu pedido</h3>
          </div>
          <button type="button" className="pedido-cerrar" onClick={onClose} aria-label="Cerrar">✕</button>
        </div>

        {exito ? (
          <div className="pedido-exito">
            <span className="pedido-exito-icono">✅</span>
            <p>¡Pedido enviado! Te vamos a contactar por WhatsApp para confirmarlo.</p>
            <button type="button" className="pedido-btn-primario" onClick={onClose}>Cerrar</button>
          </div>
        ) : items.length === 0 ? (
          <p className="pedido-vacio">Todavía no agregaste productos.</p>
        ) : (
          <form onSubmit={enviarPedido} className="pedido-form">
            <div className="pedido-items">
              {items.map((linea) => (
                <div key={linea.lineaId} className="pedido-item">
                  <div className="pedido-item-imagen">
                    {linea.item.imagen ? (
                      <img src={linea.item.imagen} alt={linea.item.nombre} />
                    ) : (
                      <span>🍔</span>
                    )}
                  </div>

                  <div className="pedido-item-info">
                    <div className="pedido-item-titulo">
                      <strong>{linea.item.nombre}</strong>
                      {linea.tipo === 'combo' && <span className="pedido-item-badge-combo">Combo</span>}
                    </div>
                    {linea.extras && linea.extras.length > 0 && (
                      <span className="pedido-item-extras">+ {textoExtras(linea.extras)}</span>
                    )}
                    <span className="pedido-item-precio">{formatearPrecio(precioUnitarioLinea(linea))} c/u</span>
                  </div>

                  <div className="pedido-item-acciones">
                    <button type="button" className="pedido-item-quitar" onClick={() => onQuitar(linea.lineaId)} aria-label="Quitar producto">
                      🗑
                    </button>
                    <div className="pedido-item-cantidad">
                      <button type="button" onClick={() => onCambiarCantidad(linea.lineaId, linea.cantidad - 1)} aria-label="Restar">−</button>
                      <span>{linea.cantidad}</span>
                      <button type="button" onClick={() => onCambiarCantidad(linea.lineaId, linea.cantidad + 1)} aria-label="Sumar">+</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pedido-total">
              <span>Total</span>
              <strong>{formatearPrecio(total)}</strong>
            </div>

            <div className="pedido-seccion">
              <div className="pedido-seccion-titulo">
                <span className="pedido-seccion-icono">👤</span>
                <span>Datos de contacto</span>
              </div>
              <div className="pedido-campo">
                <input
                  type="text"
                  className={`pedido-input ${errores.nombre ? 'pedido-input-error' : ''}`}
                  value={nombre}
                  onChange={(e) => { setNombre(e.target.value); setErrores((prev) => ({ ...prev, nombre: undefined })); }}
                  placeholder="Tu nombre"
                />
                {errores.nombre && <span className="pedido-error-texto">{errores.nombre}</span>}
              </div>
              <div className="pedido-campo">
                <input
                  type="tel"
                  className={`pedido-input ${errores.telefono ? 'pedido-input-error' : ''}`}
                  value={telefono}
                  onChange={(e) => { setTelefono(e.target.value); setErrores((prev) => ({ ...prev, telefono: undefined })); }}
                  placeholder="Tu WhatsApp o teléfono"
                />
                {errores.telefono && <span className="pedido-error-texto">{errores.telefono}</span>}
              </div>
            </div>

            <div className="pedido-seccion">
              <div className="pedido-seccion-titulo">
                <span className="pedido-seccion-icono">📍</span>
                <span>¿Cómo lo recibís?</span>
              </div>
              <div className="pedido-entrega-opciones">
                <button
                  type="button"
                  className={`pedido-entrega-opcion ${tipoEntrega === 'retiro' ? 'pedido-entrega-activa' : ''}`}
                  onClick={() => { setTipoEntrega('retiro'); setErrores((prev) => ({ ...prev, direccion: undefined })); }}
                >
                  {tipoEntrega === 'retiro' && <span className="pedido-entrega-check">✓</span>}
                  <span className="pedido-entrega-icono">🛍️</span>
                  <span className="pedido-entrega-nombre">Retiro en local</span>
                  <span className="pedido-entrega-desc">Retirás tu pedido en el local</span>
                </button>
                <button
                  type="button"
                  className={`pedido-entrega-opcion ${tipoEntrega === 'delivery' ? 'pedido-entrega-activa' : ''}`}
                  onClick={() => { setTipoEntrega('delivery'); setErrores((prev) => ({ ...prev, direccion: undefined })); }}
                >
                  {tipoEntrega === 'delivery' && <span className="pedido-entrega-check">✓</span>}
                  <span className="pedido-entrega-icono">🛵</span>
                  <span className="pedido-entrega-nombre">Delivery</span>
                  <span className="pedido-entrega-desc">Te lo llevamos a tu casa</span>
                </button>
              </div>
            </div>

            {tipoEntrega === 'delivery' && (
              <>
                <div className="pedido-campo">
                  <input
                    type="text"
                    className={`pedido-input ${errores.direccion ? 'pedido-input-error' : ''}`}
                    value={direccion}
                    onChange={(e) => { setDireccion(e.target.value); setErrores((prev) => ({ ...prev, direccion: undefined })); }}
                    placeholder="Calle, número y referencia"
                  />
                  {errores.direccion && <span className="pedido-error-texto">{errores.direccion}</span>}
                </div>
                <p className="pedido-aviso">🛵 El envío tiene un costo adicional que coordinamos por WhatsApp.</p>
              </>
            )}

            <button type="submit" className="pedido-btn-whatsapp" disabled={enviando}>
              {enviando ? 'Enviando...' : '📲 Enviar pedido por WhatsApp'}
            </button>

        
          </form>
        )}
      </aside>

      <style>{`
        .pedido-overlay {
          position: fixed;
          inset: 0;
          height: 100vh;
          height: 100dvh;
          background: rgba(17, 24, 39, 0.55);
          z-index: 50;
          display: flex;
          justify-content: flex-end;
          animation: pedidoFondoAparece 0.2s ease-out;
        }

        @keyframes pedidoFondoAparece {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .pedido-drawer {
          width: 100%;
          max-width: 420px;
          height: 100vh;
          height: 100dvh;
          background: #ffffff;
          padding: 22px;
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
          box-shadow: -20px 0 40px -10px rgba(0, 0, 0, 0.5);
          animation: pedidoDrawerAparece 0.28s cubic-bezier(0.22, 1, 0.36, 1);
        }

        @keyframes pedidoDrawerAparece {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          .pedido-overlay,
          .pedido-drawer {
            animation: none;
          }
        }

        .pedido-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .pedido-header-titulo {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .pedido-header-icono {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.1rem;
          background: linear-gradient(135deg, #f4854a, #e8630c);
        }

        .pedido-header h3 {
          margin: 0;
          color: #1c1410;
          font-size: 1.15rem;
        }

        .pedido-cerrar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: #f4ede6;
          color: #6b5d52;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pedido-cerrar:hover {
          background: #ece1d6;
        }

        .pedido-vacio {
          text-align: center;
          color: #8a7c70;
          padding: 48px 0;
        }

        .pedido-items {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }

        .pedido-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding-bottom: 14px;
          border-bottom: 1px solid #f0e6dd;
        }

        .pedido-item-imagen {
          flex-shrink: 0;
          width: 60px;
          height: 60px;
          border-radius: 12px;
          overflow: hidden;
          background: #f4ede6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.5rem;
        }

        .pedido-item-imagen img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pedido-item-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 3px;
        }

        .pedido-item-titulo {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
        }

        .pedido-item-titulo strong {
          font-size: 0.92rem;
          color: #1c1410;
        }

        .pedido-item-badge-combo {
          font-size: 0.62rem;
          font-weight: 700;
          text-transform: uppercase;
          background: linear-gradient(135deg, #f4854a, #e8630c);
          color: #ffffff;
          padding: 2px 8px;
          border-radius: 999px;
        }

        .pedido-item-extras {
          font-size: 0.78rem;
          color: #8a7c70;
        }

        .pedido-item-precio {
          font-size: 0.78rem;
          color: #a89a8f;
        }

        .pedido-item-acciones {
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
          align-items: flex-end;
          gap: 8px;
        }

        .pedido-item-quitar {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          border: none;
          background: #fdeceb;
          color: #ef4444;
          font-size: 0.75rem;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.15s ease;
        }
        .pedido-item-quitar:hover {
          background: #fbdad7;
        }

        .pedido-item-cantidad {
          display: flex;
          align-items: center;
          gap: 8px;
          border: 1px solid #ece1d6;
          border-radius: 999px;
          padding: 3px 4px;
        }
        .pedido-item-cantidad button {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: none;
          background: #f4ede6;
          color: #1c1410;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pedido-item-cantidad button:hover {
          background: #ece1d6;
        }
        .pedido-item-cantidad span {
          min-width: 14px;
          text-align: center;
          font-size: 0.82rem;
          font-weight: 700;
          color: #1c1410;
        }

        .pedido-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #f7f2ec;
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 22px;
          font-weight: 700;
          color: #1c1410;
        }

        .pedido-total strong {
          font-size: 1.2rem;
          color: #e8630c;
        }

        .pedido-seccion {
          margin-bottom: 20px;
        }

        .pedido-seccion-titulo {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          font-weight: 700;
          font-size: 0.92rem;
          color: #1c1410;
        }

        .pedido-seccion-icono {
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: #f7ede4;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
        }

        .pedido-campo {
          margin-bottom: 10px;
        }

        .pedido-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1.5px solid #ece1d6;
          background: #fdfbf9;
          font-size: 0.9rem;
          font-family: inherit;
          color: #1c1410;
          transition: border-color 0.15s ease;
        }
        .pedido-input::placeholder {
          color: #a89a8f;
        }
        .pedido-input:focus {
          outline: none;
          border-color: #e8630c;
        }

        .pedido-input-error {
          border-color: #ef4444;
          background: #fef4f3;
        }

        .pedido-error-texto {
          display: block;
          margin-top: 6px;
          font-size: 0.76rem;
          color: #ef4444;
          font-weight: 600;
        }

        .pedido-entrega-opciones {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
        }

        .pedido-entrega-opcion {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 4px;
          text-align: left;
          padding: 14px 14px 12px;
          border-radius: 14px;
          border: 1.5px solid #ece1d6;
          background: #fdfbf9;
          cursor: pointer;
          font-family: inherit;
          transition: border-color 0.15s ease, background 0.15s ease;
        }
        .pedido-entrega-opcion:hover {
          border-color: #f0c9a8;
        }

        .pedido-entrega-activa {
          border-color: #e8630c;
          background: linear-gradient(180deg, rgba(232, 99, 12, 0.06), rgba(244, 133, 74, 0.02));
        }

        .pedido-entrega-check {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: linear-gradient(135deg, #f4854a, #e8630c);
          color: #ffffff;
          font-size: 0.65rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pedido-entrega-icono {
          font-size: 1.3rem;
        }

        .pedido-entrega-nombre {
          font-weight: 700;
          font-size: 0.85rem;
          color: #1c1410;
        }

        .pedido-entrega-desc {
          font-size: 0.72rem;
          color: #8a7c70;
          line-height: 1.3;
        }

        .pedido-aviso {
          font-size: 0.8rem;
          color: #c2410c;
          background: #fff3e8;
          border: 1px dashed #f3c396;
          border-radius: 10px;
          padding: 10px 14px;
          margin: 0 0 16px;
        }

        .pedido-btn-whatsapp {
          width: 100%;
          background: linear-gradient(135deg, #25d366, #128c7e);
          color: #ffffff;
          border: none;
          padding: 14px 24px;
          border-radius: 12px;
          font-weight: 700;
          font-size: 0.95rem;
          font-family: inherit;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .pedido-btn-whatsapp:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 16px -6px rgba(37, 211, 102, 0.5);
        }
        .pedido-btn-whatsapp:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .pedido-btn-primario {
          background: linear-gradient(135deg, #f4854a, #e8630c);
          color: #ffffff;
          border: none;
          padding: 12px 24px;
          border-radius: 10px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
        }

        .pedido-confianza {
          text-align: center;
          font-size: 0.75rem;
          color: #a89a8f;
          margin: 14px 0 0;
        }

        .pedido-exito {
          text-align: center;
          padding: 48px 0;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
          color: #1c1410;
        }

        .pedido-exito-icono {
          font-size: 3rem;
        }
      `}</style>
    </div>
  );
}
