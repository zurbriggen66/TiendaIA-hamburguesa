import React from 'react';
import { formatearPrecio } from '../Estadisticas/BarrasDesglose';

/**
 * Cuánta plata quedó en cada método del turno.
 *
 * Es lo único de la caja que se puede contrastar contra la realidad: el efectivo se
 * cuenta del cajón, el resto contra el banco o Mercado Pago. Un total único que mezcla
 * los cuatro métodos no se puede verificar contra nada.
 *
 * Un solo color para las barras: cada fila ya va etiquetada con su método, así que
 * repartir colores por fila pintaría el ranking en vez de la identidad. La excepción
 * son los saldos negativos, donde el color SÍ dice algo (salió más de lo que entró,
 * típicamente un vuelto devuelto por esa vía).
 */
export default function DesgloseMetodos({ desglose, titulo = 'Debería haber en cada método' }) {
  const conMovimiento = (desglose || []).filter((d) => Number(d.monto) !== 0);
  if (conMovimiento.length === 0) return null;

  // La barra se escala contra el saldo más grande en valor absoluto: si no, un método
  // en negativo rompería la proporción o quedaría sin barra.
  const maximo = Math.max(...conMovimiento.map((d) => Math.abs(Number(d.monto))));

  return (
    <div className="desglose-metodos">
      {titulo && <span className="desglose-metodos-titulo">{titulo}</span>}
      {conMovimiento.map((d) => {
        const monto = Number(d.monto);
        const ancho = maximo > 0 ? Math.max((Math.abs(monto) / maximo) * 100, 3) : 0;
        return (
          <div key={d.metodo} className="desglose-metodos-fila">
            <span className="desglose-metodos-label">{d.label}</span>
            <span className={`desglose-metodos-monto${monto < 0 ? ' desglose-metodos-negativo' : ''}`}>
              {formatearPrecio(monto)}
            </span>
            <div className="desglose-metodos-pista">
              <div
                className={`desglose-metodos-barra${monto < 0 ? ' desglose-metodos-barra-negativa' : ''}`}
                style={{ width: `${ancho}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
