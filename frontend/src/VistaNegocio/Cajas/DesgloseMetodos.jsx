import React from 'react';
import { formatearPrecio } from '../Estadisticas/BarrasDesglose';

/**
 * Cuánta plata quedó en cada método del turno.
 *
 * Es lo único de la caja que se puede contrastar contra la realidad: el efectivo se
 * cuenta del cajón y el resto se compara contra el banco o Mercado Pago.
 *
 * SIN barras a propósito. Una barra proporcional necesita que las filas compartan un
 * todo, y acá no lo comparten: el efectivo del cajón y lo que entró por transferencia
 * son plata en lugares distintos, y encima un saldo puede ser negativo (un vuelto que
 * salió por esa vía). Dibujar eso daba dos barras llenas que no significaban nada.
 * Con tres o cuatro filas etiquetadas, los números alineados se leen mejor que
 * cualquier gráfico.
 */
export default function DesgloseMetodos({ desglose, titulo = 'Debería haber en cada método' }) {
  const conMovimiento = (desglose || []).filter((d) => Number(d.monto) !== 0);
  if (conMovimiento.length === 0) return null;

  return (
    <div className="desglose-metodos">
      {titulo && <span className="desglose-metodos-titulo">{titulo}</span>}
      {conMovimiento.map((d) => {
        const monto = Number(d.monto);
        return (
          <div key={d.metodo} className="desglose-metodos-fila">
            <span className="desglose-metodos-label">{d.label}</span>
            <span className={`desglose-metodos-monto${monto < 0 ? ' desglose-metodos-negativo' : ''}`}>
              {formatearPrecio(monto)}
            </span>
            {/* Un saldo negativo no se explica solo: salió más de lo que entró por esa
                vía, típicamente un vuelto devuelto por ahí. */}
            {monto < 0 && (
              <span className="desglose-metodos-nota">salió más de lo que entró</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
