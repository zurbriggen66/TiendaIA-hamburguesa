import React, { useState, useEffect } from 'react';
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
    const etiquetaSugerido = linea.sugerido ? ' 🛒(oferta carrito)' : '';
    lineas.push(`${linea.cantidad}x ${linea.item.nombre}${extrasTexto}${etiquetaSugerido} - ${formatearPrecio(precioUnitarioLinea(linea) * linea.cantidad)}`);
  });
  lineas.push('', `*Total: ${formatearPrecio(total)}*`);
  return lineas.join('\n');
}

export default function CarritoDrawer({ items, whatsapp, sugeridos, onClose, onCambiarCantidad, onQuitar, onAgregarSugerido, onVaciar }) {
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [tipoEntrega, setTipoEntrega] = useState('retiro');
  const [direccion, setDireccion] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [errores, setErrores] = useState({});
  const [linkWhatsapp, setLinkWhatsapp] = useState(null);

  // Bloquea el scroll de la página de fondo mientras el drawer está abierto. En mobile
  // (sobre todo iOS Safari) un simple `overflow: hidden` en el body no alcanza: el fondo
  // igual rebota/se desplaza al tocar. Fijar el body en su posición actual es lo único
  // que lo inmoviliza de forma confiable en todos los navegadores; al cerrar, se restaura
  // el scroll exactamente donde estaba.
  useEffect(() => {
    const scrollY = window.scrollY;
    const { body } = document;
    const html = document.documentElement;
    const previoBody = { position: body.style.position, top: body.style.top, width: body.style.width };
    const previoOverflowHtml = html.style.overflow;

    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';
    html.style.overflow = 'hidden';

    return () => {
      body.style.position = previoBody.position;
      body.style.top = previoBody.top;
      body.style.width = previoBody.width;
      html.style.overflow = previoOverflowHtml;
      window.scrollTo(0, scrollY);
    };
  }, []);

  const total = items.reduce((acc, linea) => acc + precioUnitarioLinea(linea) * linea.cantidad, 0);

  const lineaSugerido = (productoId) =>
    items.find((l) => l.tipo === 'producto' && l.sugerido && l.item.id === productoId);

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

    // Abrimos WhatsApp de forma SÍNCRONA, en la misma tarea que el submit del
    // formulario. Si se abre después de un `await` (ej. la llamada a la API),
    // los navegadores (sobre todo Safari/iOS) pierden el "gesto de usuario" y
    // bloquean la ventana en silencio, sin ningún error visible.
    const mensaje = armarMensajeWhatsapp({ nombre, telefono, tipoEntrega, direccion, items, total });
    const url = `https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`;
    const ventana = window.open(url, '_blank', 'noopener,noreferrer');
    // Si el navegador igual bloqueó la ventana, dejamos un enlace visible como respaldo.
    setLinkWhatsapp(!ventana || ventana.closed ? url : null);

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
                sugerido_carrito: !!linea.sugerido,
              }
        ),
      });
    } catch (error) {
      // No bloqueamos el envío por WhatsApp aunque falle el guardado en el sistema.
      console.error('Error al registrar el pedido:', error);
    }

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
            {linkWhatsapp && (
              <a
                href={linkWhatsapp}
                target="_blank"
                rel="noopener noreferrer"
                className="pedido-btn-whatsapp pedido-link-whatsapp"
              >
                📲 Tu navegador bloqueó la ventana, tocá acá para abrir WhatsApp
              </a>
            )}
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

            {sugeridos && sugeridos.length > 0 && (
              <div className="pedido-sugeridos">
                <div className="pedido-seccion-titulo">
                  <span className="pedido-seccion-icono">🛒</span>
                  <span>Sumá con descuento</span>
                </div>
                <div className="pedido-sugeridos-scroll">
                  {sugeridos.map((prod) => {
                    const linea = lineaSugerido(prod.id);
                    return (
                      <div key={prod.id} className="pedido-sugerido-card">
                        <div className="pedido-sugerido-imagen">
                          {prod.imagen ? <img src={prod.imagen} alt={prod.nombre} /> : <span>🍔</span>}
                        </div>
                        <span className="pedido-sugerido-nombre">{prod.nombre}</span>
                        <span className="pedido-sugerido-precios">
                          <span className="precio-tachado">{formatearPrecio(prod.precio)}</span>
                          {' '}{formatearPrecio(Number(prod.precio_sugerido_carrito))}
                        </span>
                        {linea ? (
                          <div className="pedido-sugerido-stepper">
                            <button type="button" onClick={() => onCambiarCantidad(linea.lineaId, linea.cantidad - 1)} aria-label="Restar">−</button>
                            <span>{linea.cantidad}</span>
                            <button type="button" onClick={() => onCambiarCantidad(linea.lineaId, linea.cantidad + 1)} aria-label="Sumar">+</button>
                          </div>
                        ) : (
                          <button type="button" className="pedido-sugerido-agregar" onClick={() => onAgregarSugerido(prod)}>
                            + Agregar
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pedido-seccion">
              <div className="pedido-seccion-titulo">
                <span className="pedido-seccion-icono pedido-seccion-icono-contacto">👤</span>
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

            <button type="submit" className="pedido-btn-finalizar" disabled={enviando}>
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
          overscroll-behavior: contain;
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
          overscroll-behavior: contain;
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
          color: #1a2333;
          font-size: 1.15rem;
        }

        .pedido-cerrar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          border: none;
          background: #eef0f3;
          color: #94a3b8;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pedido-cerrar:hover {
          background: #e4e7ec;
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
          color: #1a2333;
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
          color: #64748b;
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
          border: 1px solid #e2e6eb;
          border-radius: 999px;
          padding: 3px 4px;
        }
        .pedido-item-cantidad button {
          width: 22px;
          height: 22px;
          border-radius: 50%;
          border: none;
          background: #f1f3f6;
          color: #1a2333;
          font-size: 0.85rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pedido-item-cantidad button:hover {
          background: #e4e7ec;
        }
        .pedido-item-cantidad span {
          min-width: 14px;
          text-align: center;
          font-size: 0.82rem;
          font-weight: 700;
          color: #1a2333;
        }

        .pedido-total {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background: #fde8d3;
          border-radius: 12px;
          padding: 14px 16px;
          margin-bottom: 22px;
          font-weight: 700;
          color: #1a2333;
        }

        .pedido-total strong {
          font-size: 1.2rem;
          color: #e8630c;
        }

        .pedido-sugeridos {
          margin-bottom: 22px;
        }

        .pedido-sugeridos .pedido-seccion-titulo {
          margin-bottom: 10px;
        }

        .pedido-sugeridos-scroll {
          display: flex;
          gap: 10px;
          overflow-x: auto;
          padding-bottom: 4px;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
        }

        .pedido-sugerido-card {
          flex: 0 0 auto;
          width: 128px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          text-align: center;
          padding: 10px;
          border-radius: 14px;
          border: 1.5px solid #eef0f3;
          background: #ffffff;
        }

        .pedido-sugerido-imagen {
          width: 64px;
          height: 64px;
          flex-shrink: 0;
          border-radius: 12px;
          overflow: hidden;
          background: #f4ede6;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.6rem;
        }

        .pedido-sugerido-imagen img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .pedido-sugerido-nombre {
          width: 100%;
          /* Reserva siempre el alto de 2 líneas (aunque el nombre entre en 1) para que
             el precio y el botón queden a la misma altura en todas las tarjetas, sin
             importar cuán largo sea el nombre del producto. */
          min-height: 1.88rem;
          font-size: 0.78rem;
          font-weight: 700;
          color: #1a2333;
          line-height: 1.2;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .pedido-sugerido-precios {
          width: 100%;
          font-size: 0.76rem;
          font-weight: 700;
          color: #e8630c;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .pedido-sugerido-agregar {
          width: 100%;
          margin-top: auto;
          background: #dcfce7;
          color: #16a34a;
          border: none;
          padding: 7px 10px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.72rem;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.15s ease;
        }
        .pedido-sugerido-agregar:hover {
          background: #bbf7d0;
        }

        .pedido-sugerido-stepper {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-top: auto;
          border: 1px solid #ece1d6;
          border-radius: 999px;
          padding: 3px 6px;
          width: 100%;
        }
        .pedido-sugerido-stepper button {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: none;
          background: #f4ede6;
          color: #1a2333;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .pedido-sugerido-stepper span {
          font-size: 0.78rem;
          font-weight: 700;
          color: #1a2333;
          min-width: 12px;
          text-align: center;
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
          color: #1a2333;
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

        .pedido-sugeridos .pedido-seccion-icono {
          background: #dbeafe;
        }

        .pedido-seccion-icono-contacto {
          background: #ede9fe;
        }

        .pedido-campo {
          margin-bottom: 10px;
        }

        .pedido-input {
          width: 100%;
          padding: 12px 14px;
          border-radius: 12px;
          border: 1.5px solid #eef0f3;
          background: #f8f9fb;
          font-size: 0.9rem;
          font-family: inherit;
          color: #1a2333;
          transition: border-color 0.15s ease;
        }
        .pedido-input::placeholder {
          color: #9aa4b2;
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
          color: #1a2333;
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

        .pedido-btn-finalizar {
          width: 100%;
          background: #14181f;
          color: #ffffff;
          border: none;
          padding: 14px 24px;
          border-radius: 999px;
          font-weight: 700;
          font-size: 0.95rem;
          font-family: inherit;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        .pedido-btn-finalizar:hover {
          transform: translateY(-1px);
          box-shadow: 0 8px 16px -6px rgba(20, 24, 31, 0.4);
        }
        .pedido-btn-finalizar:disabled {
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
          color: #1a2333;
        }

        .pedido-exito-icono {
          font-size: 3rem;
        }

        .pedido-link-whatsapp {
          display: inline-block;
          width: auto;
          text-decoration: none;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
