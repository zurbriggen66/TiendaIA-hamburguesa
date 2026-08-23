const CLAVE_LOCAL_STORAGE = 'antojo_config_impresion';

const CONFIG_DEFAULT = {
  anchoPapel: '80mm',
  copias: 1,
  autoImprimir: false,
};

export function obtenerConfigImpresion() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE_LOCAL_STORAGE));
    return { ...CONFIG_DEFAULT, ...guardado };
  } catch {
    return { ...CONFIG_DEFAULT };
  }
}

export function guardarConfigImpresion(config) {
  localStorage.setItem(CLAVE_LOCAL_STORAGE, JSON.stringify(config));
}

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

function escapeHtml(texto) {
  const div = document.createElement('div');
  div.textContent = String(texto);
  return div.innerHTML;
}

function construirBloqueTicket(pedido) {
  const fecha = pedido.creado ? new Date(pedido.creado) : new Date();
  const fechaTexto = fecha.toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' });

  const filasItems = pedido.items
    .map((item) => {
      const nombre = item.producto_nombre || item.combo_nombre || 'Producto';
      const presentacionTexto = item.presentacion_nombre ? ` (${item.presentacion_nombre})` : '';
      const subtotal = item.subtotal ?? item.precio_unitario * item.cantidad;
      const extrasTexto = item.extras_detalle && item.extras_detalle.length > 0
        ? `<div class="ticket-extra">  + ${item.extras_detalle.map((e) => escapeHtml(`${e.cantidad > 1 ? `${e.cantidad}x ` : ''}${e.nombre}`)).join(', ')}</div>`
        : '';
      return `
        <div class="ticket-item">
          <span>${item.cantidad} x ${escapeHtml(nombre)}${escapeHtml(presentacionTexto)}</span>
          <span>${formatearPrecio(subtotal)}</span>
        </div>
        ${extrasTexto}`;
    })
    .join('');

  return `
    <div class="ticket">
      <div class="ticket-header">
        <strong>ANTOJO</strong>
        <span>de Hamburguesas</span>
      </div>
      <div class="ticket-linea"></div>
      <div class="ticket-dato">Pedido #${pedido.id ?? '-'}</div>
      <div class="ticket-dato">${fechaTexto}</div>
      ${pedido.cliente ? `<div class="ticket-dato">Cliente: ${escapeHtml(pedido.cliente)}</div>` : ''}
      ${pedido.telefono ? `<div class="ticket-dato">Tel: ${escapeHtml(pedido.telefono)}</div>` : ''}
      <div class="ticket-dato">${pedido.tipo_entrega === 'delivery' ? 'Delivery' : 'Retiro en local'}</div>
      ${pedido.tipo_entrega === 'delivery' && pedido.direccion ? `<div class="ticket-dato">Dir: ${escapeHtml(pedido.direccion)}</div>` : ''}
      ${pedido.hora_salida ? `<div class="ticket-dato">Sale: ${String(pedido.hora_salida).slice(0, 5)}</div>` : ''}
      <div class="ticket-linea"></div>
      ${filasItems}
      <div class="ticket-linea"></div>
      ${construirDesgloseTicket(pedido)}
      <div class="ticket-total">
        <span>TOTAL</span>
        <span>${formatearPrecio(pedido.total)}</span>
      </div>
      ${pedido.nota ? `<div class="ticket-linea"></div><div class="ticket-nota">NOTA: ${escapeHtml(pedido.nota)}</div>` : ''}
      ${pedido.recompensa_nombre ? `<div class="ticket-linea"></div><div class="ticket-nota">PREMIO: ${escapeHtml(pedido.recompensa_nombre)}</div>` : ''}
      <div class="ticket-linea"></div>
      <div class="ticket-footer">¡Gracias por tu pedido!</div>
    </div>`;
}

function construirBloqueTicketCocina(pedido) {
  const entregaTexto = pedido.tipo_entrega === 'delivery'
    ? `🛵 Delivery${pedido.localidad_nombre ? ` — ${escapeHtml(pedido.localidad_nombre)}` : ''}`
    : '🏠 Retiro en local';

  const filasItems = pedido.items
    .map((item) => {
      const nombre = item.producto_nombre || item.combo_nombre || 'Producto';
      const presentacionTexto = item.presentacion_nombre ? ` (${item.presentacion_nombre})` : '';
      const extrasTexto = item.extras_detalle && item.extras_detalle.length > 0
        ? `<div class="ticket-cocina-extra">+ ${item.extras_detalle.map((e) => escapeHtml(`${e.cantidad > 1 ? `${e.cantidad}x ` : ''}${e.nombre}`)).join(', ')}</div>`
        : '';
      return `
        <div class="ticket-cocina-item">${item.cantidad} x ${escapeHtml(nombre)}${escapeHtml(presentacionTexto)}</div>
        ${extrasTexto}`;
    })
    .join('');

  return `
    <div class="ticket">
      <div class="ticket-header">
        <strong>COCINA</strong>
        ${pedido.id ? `<span>Pedido #${pedido.id}</span>` : ''}
      </div>
      <div class="ticket-linea"></div>
      <div class="ticket-cocina-dato">${entregaTexto}</div>
      <div class="ticket-cocina-dato">${escapeHtml(pedido.cliente || 'Sin nombre')}</div>
      ${pedido.hora_salida ? `<div class="ticket-cocina-dato">🕒 Aprox. ${String(pedido.hora_salida).slice(0, 5)}</div>` : ''}
      <div class="ticket-linea"></div>
      ${filasItems}
      ${pedido.nota ? `<div class="ticket-linea"></div><div class="ticket-cocina-nota">${escapeHtml(pedido.nota)}</div>` : ''}
      ${pedido.recompensa_nombre ? `<div class="ticket-linea"></div><div class="ticket-cocina-nota">PREMIO: ${escapeHtml(pedido.recompensa_nombre)}</div>` : ''}
    </div>`;
}

function construirDesgloseTicket(pedido) {
  const tieneEnvio = Number(pedido.costo_envio) > 0;
  const tieneDescuento = Number(pedido.descuento_pct) > 0;
  if (!tieneEnvio && !tieneDescuento) return '';

  return `
    <div class="ticket-item"><span>Subtotal</span><span>${formatearPrecio(pedido.subtotal)}</span></div>
    ${tieneEnvio ? `<div class="ticket-item"><span>Envío</span><span>${formatearPrecio(pedido.costo_envio)}</span></div>` : ''}
    ${tieneDescuento ? `<div class="ticket-item"><span>Descuento</span><span>-${pedido.descuento_pct}%</span></div>` : ''}
    <div class="ticket-linea"></div>`;
}

export function construirHtmlTicket(pedido, config) {
  const anchoMm = config.anchoPapel === '58mm' ? 58 : 80;
  const copias = Math.max(1, Number(config.copias) || 1);
  const bloque = construirBloqueTicket(pedido);
  const bloquesCliente = Array.from({ length: copias }, () => bloque);
  const bloques = [...bloquesCliente, construirBloqueTicketCocina(pedido)].join('<div class="ticket-corte"></div>');

  return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: ${anchoMm}mm auto; margin: 0; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 4mm;
    width: ${anchoMm}mm;
    font-family: 'Courier New', monospace;
    font-size: 19px;
    font-weight: 700;
    line-height: 1.3;
    color: #000;
  }
  .ticket-header { text-align: center; display: flex; flex-direction: column; margin-bottom: 8px; }
  .ticket-header strong { font-size: 28px; letter-spacing: 1px; }
  .ticket-header span { font-size: 18px; }
  .ticket-linea { border-top: 3px dashed #000; margin: 8px 0; }
  .ticket-dato { margin: 3px 0; }
  .ticket-item { display: flex; justify-content: space-between; gap: 8px; margin: 4px 0; }
  .ticket-extra { font-size: 16px; margin: 0 0 4px 8px; }
  .ticket-total { display: flex; justify-content: space-between; font-weight: 800; font-size: 24px; margin: 6px 0; }
  .ticket-nota { font-size: 18px; margin: 6px 0; }
  .ticket-footer { text-align: center; margin-top: 10px; }
  .ticket-corte { border-top: 3px dashed #000; margin: 14px 0; page-break-before: always; }
  .ticket-cocina-dato { font-size: 22px; margin: 4px 0; }
  .ticket-cocina-item { font-size: 30px; font-weight: 800; margin: 10px 0 0; line-height: 1.2; }
  .ticket-cocina-extra { font-size: 22px; margin: 2px 0 6px 10px; }
  .ticket-cocina-nota { font-size: 26px; font-weight: 800; margin: 10px 0 0; padding: 8px; border: 3px solid #000; }
</style>
</head>
<body>${bloques}</body>
</html>`;
}

function imprimirHtml(html) {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  iframe.onload = () => {
    try {
      iframe.contentWindow.focus();
      iframe.contentWindow.print();
    } catch (error) {
      console.error('Error al imprimir el ticket:', error);
    }
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1000);
  };

  iframe.srcdoc = html;
}

export function imprimirPedido(pedido) {
  const config = obtenerConfigImpresion();
  imprimirHtml(construirHtmlTicket(pedido, config));
}

export function imprimirPrueba() {
  const config = obtenerConfigImpresion();
  const pedidoDePrueba = {
    id: 'PRUEBA',
    cliente: 'Cliente de prueba',
    telefono: '3541000000',
    tipo_entrega: 'delivery',
    direccion: 'Calle Falsa 123',
    localidad_nombre: 'Centro',
    hora_salida: '20:30',
    creado: new Date().toISOString(),
    total: 12000,
    nota: 'Sin cebolla, gracias',
    items: [{ cantidad: 2, producto_nombre: 'Hamburguesa Clásica', subtotal: 12000 }],
  };
  imprimirHtml(construirHtmlTicket(pedidoDePrueba, config));
}
