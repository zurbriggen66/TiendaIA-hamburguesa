import React from 'react';
import { formatearPrecio } from '../Estadisticas/BarrasDesglose';

/**
 * Cuánta plata quedó en cada método del turno.
 *
 * Es lo único de la caja que se puede contrastar contra la realidad: el efectivo se
 * cuenta del cajón, el resto contra el banco o Mercado Pago. Un total único que mezcla
 * los cuatro métodos no se puede verificar contra nada.
 */
export default function DesgloseMetodos({ desglose, titulo = 'Debería haber en cada método' }) {
  // Solo los métodos que se movieron: cuatro ceros no le dicen nada a nadie.
  const conMovimiento = (desglose || []).filter((d) => Number(d.monto) !== 0);
  if (conMovimiento.length === 0) return null;

  return (
    <div className="caja-desglose">
      <span className="caja-desglose-titulo">{titulo}</span>
      {conMovimiento.map((d) => (
        <div key={d.metodo} className="caja-desglose-fila">
          <span>{d.label}</span>
          <strong className={Number(d.monto) < 0 ? 'caja-desglose-negativo' : ''}>
            {formatearPrecio(d.monto)}
          </strong>
        </div>
      ))}
    </div>
  );
}
