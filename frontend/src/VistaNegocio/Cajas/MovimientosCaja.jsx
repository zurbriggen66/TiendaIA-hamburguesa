import React, { useState } from 'react';
import { formatearPrecio } from '../Estadisticas/BarrasDesglose';

const formatearHora = (iso) =>
  new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false });

// El ícono dice el tipo de movimiento sin tener que leer: en el mostrador la pantalla
// se mira de reojo. El color solo nunca alcanza.
const ESTILO = {
  apertura: { icono: '🔓', clase: 'mov-apertura' },
  cobro: { icono: '💰', clase: 'mov-cobro' },
  vuelto: { icono: '↩️', clase: 'mov-vuelto' },
  gasto: { icono: '🧾', clase: 'mov-gasto' },
  ingreso: { icono: '⬇️', clase: 'mov-ingreso' },
  retiro: { icono: '⬆️', clase: 'mov-retiro' },
};

const VISIBLES_AL_INICIO = 6;

/**
 * Entradas y salidas de plata del turno.
 *
 * Es lo que faltaba para poder explicar un descuadre: antes la caja mostraba totales y,
 * cuando no cerraban, había que ir pedido por pedido. Estos movimientos suman
 * exactamente el desglose por método — las dos vistas leen los mismos hechos.
 */
export default function MovimientosCaja({ movimientos, cargando }) {
  const [verTodos, setVerTodos] = useState(false);

  if (cargando) {
    return <p className="estado-vacio-chico">Cargando movimientos...</p>;
  }
  if (!movimientos || movimientos.length === 0) {
    return <p className="estado-vacio-chico">Todavía no hubo movimientos en este turno.</p>;
  }

  const mostrados = verTodos ? movimientos : movimientos.slice(0, VISIBLES_AL_INICIO);

  return (
    <>
      <ul className="mov-lista">
        {mostrados.map((m, i) => {
          const monto = Number(m.monto);
          const estilo = ESTILO[m.tipo] || ESTILO.cobro;
          return (
            <li key={`${m.tipo}-${m.fecha}-${i}`} className="mov-fila">
              <span className={`mov-icono ${estilo.clase}`} aria-hidden="true">{estilo.icono}</span>
              <div className="mov-info">
                <strong>{m.descripcion}</strong>
                <span>
                  {m.detalle}
                  {m.nota && <span className="mov-nota"> · {m.nota}</span>}
                </span>
              </div>
              <span className="mov-metodo">{m.metodo_label}</span>
              <span className="mov-hora">{formatearHora(m.fecha)}</span>
              {monto === 0 ? (
                <span className="mov-monto mov-monto-neutro">—</span>
              ) : (
                <span className={`mov-monto ${monto < 0 ? 'mov-monto-negativo' : 'mov-monto-positivo'}`}>
                  {monto < 0 ? '−' : '+'} {formatearPrecio(Math.abs(monto))}
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {movimientos.length > VISIBLES_AL_INICIO && (
        <button type="button" className="mov-ver-todos" onClick={() => setVerTodos((v) => !v)}>
          {verTodos
            ? '▲ Ver menos'
            : `▼ Ver los ${movimientos.length} movimientos`}
        </button>
      )}
    </>
  );
}
