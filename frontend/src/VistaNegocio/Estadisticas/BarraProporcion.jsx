import React from 'react';

/**
 * Barra que muestra qué parte del total representa un valor.
 *
 * El largo de la barra ES el porcentaje sobre el total, no sobre el valor más grande.
 * Escalar contra el máximo hacía que el primer puesto siempre se viera lleno, sin
 * importar si se llevaba el 80% de las ventas o el 12%: la barra decía "es el mayor",
 * que es justamente lo que ya decía el orden de la lista.
 *
 * Un solo color: cada fila va etiquetada, así que repartir hues pintaría el ranking
 * en vez de la identidad del dato.
 */
export default function BarraProporcion({ valor, total, minimoVisible = 1.5 }) {
  const porcentaje = total > 0 ? (Number(valor) / Number(total)) * 100 : 0;
  // Piso visible: una porción de 0,3% quedaría como una barra invisible y parecería
  // que el dato no existe.
  const ancho = porcentaje > 0 ? Math.max(porcentaje, minimoVisible) : 0;

  return (
    <div className="proporcion">
      <div className="proporcion-pista">
        <div className="proporcion-barra" style={{ width: `${Math.min(ancho, 100)}%` }} />
      </div>
      <span className="proporcion-pct">{porcentaje.toFixed(porcentaje < 10 ? 1 : 0)}%</span>
    </div>
  );
}
