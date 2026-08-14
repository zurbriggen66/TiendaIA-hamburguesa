import React, { useState } from 'react';

export const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(precio);

const formatearFechaCorta = (iso) =>
  new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

// Lista de barras proporcionales (mismo formato visual que el ranking de productos),
// donde cada fila se puede tocar para desplegar el detalle de esos gastos.
export default function BarrasDesglose({ filas, total, detalleSecundario }) {
  const [abierta, setAbierta] = useState(null);

  if (filas.length === 0) return null;
  const maximo = Math.max(...filas.map((f) => Number(f.total)));

  return (
    <div className="ranking-productos">
      {filas.map((fila) => {
        const monto = Number(fila.total);
        const porcentajeDelTotal = total > 0 ? Math.round((monto / total) * 100) : 0;
        const estaAbierta = abierta === fila.clave;
        const detalle = fila.gastos || [];
        const sePuedeAbrir = detalle.length > 0;

        const contenido = (
          <div className="ranking-info">
            <div className="ranking-nombre-linea">
              <strong>
                {sePuedeAbrir && <span className="desglose-flecha">{estaAbierta ? '▾' : '▸'}</span>} {fila.etiqueta}
              </strong>
              <span>{formatearPrecio(monto)} · {porcentajeDelTotal}%</span>
            </div>
            <div className="ranking-barra-fondo">
              <div className="ranking-barra" style={{ '--bar-width': `${Math.max((monto / maximo) * 100, 6)}%` }} />
            </div>
          </div>
        );

        return (
          <div key={fila.clave} className="desglose-grupo">
            {sePuedeAbrir ? (
              <button
                type="button"
                className={`ranking-fila desglose-fila ${estaAbierta ? 'desglose-fila-abierta' : ''}`}
                onClick={() => setAbierta(estaAbierta ? null : fila.clave)}
                aria-expanded={estaAbierta}
              >
                {contenido}
              </button>
            ) : (
              <div className="ranking-fila">{contenido}</div>
            )}

            {estaAbierta && (
              <div className="desglose-detalle">
                {detalle.map((g) => (
                  <div key={g.id} className="desglose-detalle-fila">
                    <div className="desglose-detalle-info">
                      <strong>{g.descripcion}</strong>
                      <span>
                        {formatearFechaCorta(g.fecha)} ·{' '}
                        {detalleSecundario === 'categoria'
                          ? `🏷️ ${g.categoria_label}`
                          : `💳 ${g.metodo_label}`}
                      </span>
                    </div>
                    <span className="desglose-detalle-monto">{formatearPrecio(g.monto)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
