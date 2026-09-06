import React, { useState } from 'react';
import { formatearPrecio } from './BarrasDesglose';

// Orden FIJO de slots. La clave de cada porción manda su color, no su posición en el
// ranking: si un mes no hubo transferencias, el efectivo NO se queda con el color de
// ellas. Es lo que hace que dos períodos se puedan comparar de un vistazo.
const SLOTS = {
  efectivo: 1,
  transferencia: 2,
  mercado_pago: 3,
  tarjeta_debito: 4,
  tarjeta_credito: 5,
  otro: 6,
};

const RADIO = 60;
const GROSOR = 22;
const CIRCUNFERENCIA = 2 * Math.PI * RADIO;
// 2px de superficie entre porciones: sin la separación, dos colores contiguos se leen
// como una sola porción más grande.
const SEPARACION = 2;

const colorDe = (clave, indice) => `var(--serie-${SLOTS[clave] || ((indice % 6) + 1)})`;

/**
 * Torta (dona) para relaciones parte-todo: las porciones tienen que sumar el total.
 *
 * Sirve para "con qué te pagaron" porque los métodos suman las ventas. NO sirve para
 * mezclar cobros con gastos: eso no es un todo, uno entra y el otro sale, y los
 * porcentajes no significarían nada.
 */
export default function GraficoTorta({ datos, titulo, total }) {
  const [foco, setFoco] = useState(null);
  const [verTabla, setVerTabla] = useState(false);

  const porciones = (datos || []).filter((d) => Number(d.total) > 0);
  if (porciones.length === 0) {
    return <p className="estado-vacio-chico">No hay datos para este período.</p>;
  }

  const suma = Number(total) || porciones.reduce((acc, d) => acc + Number(d.total), 0);

  let acumulado = 0;
  const segmentos = porciones.map((d, i) => {
    const monto = Number(d.total);
    const fraccion = suma > 0 ? monto / suma : 0;
    const largo = Math.max(fraccion * CIRCUNFERENCIA - SEPARACION, 0.5);
    const segmento = {
      ...d,
      monto,
      // Se redondea al mostrar, no al calcular: acumular redondeos corre las porciones.
      porcentaje: fraccion * 100,
      color: colorDe(d.clave, i),
      largo,
      offset: -acumulado,
    };
    acumulado += fraccion * CIRCUNFERENCIA;
    return segmento;
  });

  const enFoco = foco !== null ? segmentos[foco] : null;

  return (
    <div className="grafico">
      <div className="grafico-encabezado">
        <span className="grafico-titulo">{titulo}</span>
        <button type="button" className="grafico-toggle-tabla" onClick={() => setVerTabla((v) => !v)}>
          {verTabla ? '🍩 Ver gráfico' : '▤ Ver tabla'}
        </button>
      </div>

      {verTabla ? (
        <div className="grafico-tabla-wrap">
          <table className="grafico-tabla">
            <thead>
              <tr><th>Método</th><th>Monto</th><th>%</th></tr>
            </thead>
            <tbody>
              {segmentos.map((s) => (
                <tr key={s.clave}>
                  <td>{s.etiqueta}</td>
                  <td>{formatearPrecio(s.monto)}</td>
                  <td>{s.porcentaje.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="torta-layout">
          <div className="torta-lienzo">
            <svg viewBox="0 0 160 160" className="torta-svg" role="img" aria-label={titulo}>
              {/* rotado -90° para que la primera porción arranque arriba */}
              <g transform="rotate(-90 80 80)">
                {segmentos.map((s, i) => (
                  <circle
                    key={s.clave}
                    cx="80" cy="80" r={RADIO}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={foco === i ? GROSOR + 4 : GROSOR}
                    strokeDasharray={`${s.largo} ${CIRCUNFERENCIA - s.largo}`}
                    strokeDashoffset={s.offset}
                    className="torta-porcion"
                    onMouseEnter={() => setFoco(i)}
                    onMouseLeave={() => setFoco(null)}
                  />
                ))}
              </g>
              {/* El centro del anillo no se desperdicia: lleva el total, que es la
                  cifra que da sentido a los porcentajes de alrededor. */}
              <text x="80" y="74" className="torta-centro-label" textAnchor="middle">
                {enFoco ? enFoco.etiqueta : 'Total'}
              </text>
              <text x="80" y="92" className="torta-centro-valor" textAnchor="middle">
                {formatearPrecio(enFoco ? enFoco.monto : suma)}
              </text>
            </svg>
          </div>

          {/* La leyenda es obligatoria con 2+ series: sin ella la identidad de cada
              porción quedaría solo en el color, y eso deja afuera a quien no lo
              distingue. Además lleva el valor, que el anillo por sí solo no da. */}
          <ul className="torta-leyenda">
            {segmentos.map((s, i) => (
              <li
                key={s.clave}
                className={`torta-leyenda-fila${foco === i ? ' torta-leyenda-activa' : ''}`}
                onMouseEnter={() => setFoco(i)}
                onMouseLeave={() => setFoco(null)}
              >
                <span className="torta-punto" style={{ background: s.color }} aria-hidden="true" />
                <span className="torta-leyenda-nombre">{s.etiqueta}</span>
                <span className="torta-leyenda-monto">{formatearPrecio(s.monto)}</span>
                <span className="torta-leyenda-pct">{s.porcentaje.toFixed(0)}%</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
