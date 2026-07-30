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
      const subtotal = item.subtotal ?? item.precio_unitario * item.cantidad;
      return `
        <div class="ticket-item">
          <span>${item.cantidad} x ${escapeHtml(nombre)}</span>
          <span>${formatearPrecio(subtotal)}</span>
        </div>`;
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
      <div class="ticket-linea"></div>
      ${filasItems}
      <div class="ticket-linea"></div>
      <div class="ticket-total">
        <span>TOTAL</span>
        <span>${formatearPrecio(pedido.total)}</span>
      </div>
      <div class="ticket-linea"></div>
      <div class="ticket-footer">¡Gracias por tu pedido!</div>
    </div>`;
}

export function construirHtmlTicket(pedido, config) {
  const anchoMm = config.anchoPapel === '58mm' ? 58 : 80;
  const copias = Math.max(1, Number(config.copias) || 1);
  const bloque = construirBloqueTicket(pedido);
  const bloques = Array.from({ length: copias }, () => bloque).join('<div class="ticket-corte"></div>');

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
    font-size: 11px;
    color: #000;
  }
  .ticket-header { text-align: center; display: flex; flex-direction: column; margin-bottom: 4px; }
  .ticket-header strong { font-size: 15px; letter-spacing: 1px; }
  .ticket-linea { border-top: 1px dashed #000; margin: 4px 0; }
  .ticket-dato { margin: 1px 0; }
  .ticket-item { display: flex; justify-content: space-between; gap: 6px; margin: 2px 0; }
  .ticket-total { display: flex; justify-content: space-between; font-weight: bold; font-size: 13px; margin: 2px 0; }
  .ticket-footer { text-align: center; margin-top: 6px; }
  .ticket-corte { border-top: 1px dashed #000; margin: 10px 0; page-break-before: always; }
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
    tipo_entrega: 'retiro',
    direccion: '',
    creado: new Date().toISOString(),
    total: 12000,
    items: [{ cantidad: 2, producto_nombre: 'Hamburguesa Clásica', subtotal: 12000 }],
  };
  imprimirHtml(construirHtmlTicket(pedidoDePrueba, config));
}
