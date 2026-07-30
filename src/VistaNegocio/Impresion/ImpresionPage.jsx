import React, { useEffect, useState } from 'react';
import { obtenerConfigImpresion, guardarConfigImpresion, imprimirPrueba } from '../../utils/impresion';

export default function ImpresionPage() {
  const [config, setConfig] = useState(obtenerConfigImpresion);

  useEffect(() => {
    guardarConfigImpresion(config);
  }, [config]);

  const actualizar = (campo, valor) => {
    setConfig((prev) => ({ ...prev, [campo]: valor }));
  };

  return (
    <>
      <header className="main-header">
        <h2>Impresión</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        <div className="form-card impresion-card">
          <h3 className="impresion-titulo">🖨️ Impresión</h3>

          <div className="impresion-banner">
            Esta configuración es de <strong>este dispositivo</strong>, no del negocio. Configurala en la máquina que tenga la impresora conectada.
          </div>

          <div className="form-group">
            <label className="form-label">Ancho del papel</label>
            <select
              className="input-vibrante"
              value={config.anchoPapel}
              onChange={(e) => actualizar('anchoPapel', e.target.value)}
            >
              <option value="80mm">80 mm (comandera estándar)</option>
              <option value="58mm">58 mm (impresora chica)</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Copias por impresión</label>
            <select
              className="input-vibrante"
              value={config.copias}
              onChange={(e) => actualizar('copias', Number(e.target.value))}
            >
              <option value={1}>1 copia</option>
              <option value={2}>2 copias</option>
              <option value={3}>3 copias</option>
            </select>
          </div>

          <div className="impresion-switch-fila">
            <div>
              <p className="impresion-switch-titulo">Imprimir pedidos automáticamente</p>
              <p className="impresion-switch-texto">
                Cada pedido nuevo sale por la impresora de este dispositivo apenas llega. Prendelo en una sola máquina.
              </p>
            </div>
            <label className="switch-vibrante">
              <input
                type="checkbox"
                checked={config.autoImprimir}
                onChange={(e) => actualizar('autoImprimir', e.target.checked)}
              />
              <span className="switch-track"></span>
            </label>
          </div>

          <div className="impresion-prueba">
            <button type="button" className="btn-secundario" onClick={imprimirPrueba}>
              Imprimir prueba
            </button>
            <p className="impresion-switch-texto">
              Sale un ticket de muestra sin cargar ningún pedido. Si el texto entra entero y derecho, la impresora está lista.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
