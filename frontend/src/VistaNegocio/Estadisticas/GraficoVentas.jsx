import React, { useState } from 'react';
import { formatearPrecio } from './BarrasDesglose';

const formatearDia = (iso) => {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
};

const formatearDiaLargo = (iso) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('es-AR', { weekday: 'long', day: '2-digit', month: 'long' });

/** Techo del eje redondeado a un número "limpio" (1, 2 o 5 por la magnitud). */
const techoLimpio = (valor) => {
  if (valor <= 0) return 1;
  const magnitud = 10 ** Math.floor(Math.log10(valor));
  const paso = [1, 2, 5, 10].find((p) => valor <= p * magnitud) ?? 10;
  return paso * magnitud;
};

/** Formato corto para el eje: $120k entra donde $120.000 no. */
const formatearEje = (valor) => {
  if (valor >= 1_000_000) return `$${(valor / 1_000_000).toFixed(valor % 1_000_000 ? 1 : 0)}M`;
  if (valor >= 1000) return `$${Math.round(valor / 1000)}k`;
  return `$${valor}`;
};

// Coordenadas internas del viewBox. El SVG escala solo al ancho del contenedor, así
// que estos números son proporciones, no píxeles en pantalla.
const ANCHO = 720;
const ALTO = 260;
const MARGEN = { arriba: 16, derecha: 8, abajo: 28, izquierda: 52 };
const PLOT_ANCHO = ANCHO - MARGEN.izquierda - MARGEN.derecha;
const PLOT_ALTO = ALTO - MARGEN.arriba - MARGEN.abajo;

/**
 * Barra con las esquinas de arriba redondeadas y la base apoyada en el eje.
 * Redondear las cuatro esquinas despega la barra del cero y hace leer mal los
 * valores chicos; el radio se achica solo cuando la barra es más baja que él.
 */
const barraPath = (x, y, ancho, alto, radio) => {
  const r = Math.max(Math.min(radio, ancho / 2, alto), 0);
  const base = y + alto;
  return `M${x},${base} L${x},${y + r} Q${x},${y} ${x + r},${y} L${x + ancho - r},${y} Q${x + ancho},${y} ${x + ancho},${y + r} L${x + ancho},${base} Z`;
};

/**
 * Ventas por día.
 *
 * Una sola serie, así que va en un solo color y sin leyenda: el título ya dice qué
 * es. Los días son intervalos discretos, por eso barras y no línea.
 */
export default function GraficoVentas({ datos, titulo = 'Ventas por día' }) {
  const [foco, setFoco] = useState(null);
  const [verTabla, setVerTabla] = useState(false);

  if (!datos || datos.length === 0) {
    return <p className="estado-vacio-chico">Todavía no hay ventas en este período.</p>;
  }

  const valores = datos.map((d) => Number(d.total));
  const maximo = techoLimpio(Math.max(...valores, 1));
  const marcas = [0, maximo * 0.25, maximo * 0.5, maximo * 0.75, maximo];

  const paso = PLOT_ANCHO / datos.length;
  // 2px de aire entre barras: sin la separación, dos barras altas contiguas se leen
  // como un bloque único.
  const anchoBarra = Math.max(paso - 4, 2);

  const y = (valor) => MARGEN.arriba + PLOT_ALTO - (valor / maximo) * PLOT_ALTO;
  const indiceMaximo = valores.indexOf(Math.max(...valores));

  // Con 14+ días las fechas se pisan: se muestra una de cada N.
  const saltoEtiquetas = Math.ceil(datos.length / 8);
  const enFoco = foco !== null ? datos[foco] : null;

  return (
    <div className="grafico">
      <div className="grafico-encabezado">
        <span className="grafico-titulo">{titulo}</span>
        <button type="button" className="grafico-toggle-tabla" onClick={() => setVerTabla((v) => !v)}>
          {verTabla ? '📊 Ver gráfico' : '▤ Ver tabla'}
        </button>
      </div>

      {verTabla ? (
        // Vista de tabla: el gráfico no puede ser la única forma de leer el dato
        // (lector de pantalla, daltonismo, o simplemente querer el número exacto).
        <div className="grafico-tabla-wrap">
          <table className="grafico-tabla">
            <thead>
              <tr><th>Día</th><th>Ventas</th></tr>
            </thead>
            <tbody>
              {datos.map((d) => (
                <tr key={d.dia}>
                  <td>{formatearDiaLargo(d.dia)}</td>
                  <td>{formatearPrecio(d.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grafico-lienzo">
          <svg
            viewBox={`0 0 ${ANCHO} ${ALTO}`}
            className="grafico-svg"
            role="img"
            aria-label={`${titulo}. Máximo ${formatearPrecio(Math.max(...valores))}.`}
          >
            {/* Grilla y eje Y: recesivos, nunca compiten con los datos. */}
            {marcas.map((m) => (
              <g key={m}>
                <line
                  x1={MARGEN.izquierda} x2={ANCHO - MARGEN.derecha}
                  y1={y(m)} y2={y(m)}
                  className={m === 0 ? 'grafico-eje-base' : 'grafico-grilla'}
                />
                <text x={MARGEN.izquierda - 8} y={y(m) + 4} className="grafico-eje-texto" textAnchor="end">
                  {formatearEje(m)}
                </text>
              </g>
            ))}

            {datos.map((d, i) => {
              const valor = Number(d.total);
              const xBarra = MARGEN.izquierda + i * paso + (paso - anchoBarra) / 2;
              const alto = (valor / maximo) * PLOT_ALTO;
              const activa = foco === i;

              return (
                <g key={d.dia}>
                  {valor > 0 && (
                    <path
                      d={barraPath(xBarra, y(valor), anchoBarra, alto, 4)}
                      className={`grafico-barra${activa ? ' grafico-barra-activa' : ''}`}
                    />
                  )}
                  {/* Etiqueta directa solo en el pico: un número sobre cada barra es ruido. */}
                  {i === indiceMaximo && valor > 0 && !activa && (
                    <text
                      x={xBarra + anchoBarra / 2} y={y(valor) - 6}
                      className="grafico-etiqueta-pico" textAnchor="middle"
                    >
                      {formatearEje(valor)}
                    </text>
                  )}
                  {/* Zona sensible de alto completo: apuntar a una barra de 2px de alto
                      es imposible, sobre todo en pantalla táctil. */}
                  <rect
                    x={MARGEN.izquierda + i * paso} y={MARGEN.arriba}
                    width={paso} height={PLOT_ALTO}
                    className="grafico-zona-hover"
                    onMouseEnter={() => setFoco(i)}
                    onMouseLeave={() => setFoco(null)}
                    onFocus={() => setFoco(i)}
                    onBlur={() => setFoco(null)}
                    tabIndex={0}
                    role="button"
                    aria-label={`${formatearDiaLargo(d.dia)}: ${formatearPrecio(valor)}`}
                  />
                </g>
              );
            })}

            {/* Eje X, con las fechas raleadas para que no se pisen. */}
            {datos.map((d, i) => (
              (i % saltoEtiquetas === 0 || i === datos.length - 1) && (
                <text
                  key={d.dia}
                  x={MARGEN.izquierda + i * paso + paso / 2}
                  y={ALTO - 8}
                  className="grafico-eje-texto" textAnchor="middle"
                >
                  {formatearDia(d.dia)}
                </text>
              )
            ))}
          </svg>

          {enFoco && (
            <div
              className="grafico-tooltip"
              style={{
                left: `${((MARGEN.izquierda + foco * paso + paso / 2) / ANCHO) * 100}%`,
                // Desde ABAJO del lienzo hasta el tope de la barra: el margen inferior
                // (donde vive el eje X) más el alto de la barra, en % del alto total.
                bottom: `${((MARGEN.abajo + (Number(enFoco.total) / maximo) * PLOT_ALTO) / ALTO) * 100 + 2}%`,
              }}
            >
              <strong>{formatearPrecio(enFoco.total)}</strong>
              <span>{formatearDiaLargo(enFoco.dia)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
