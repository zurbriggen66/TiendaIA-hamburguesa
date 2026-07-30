import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(precio);

const formatearDia = (iso) => {
  const [, mes, dia] = iso.split('-');
  return `${dia}/${mes}`;
};

// Redondea el techo del eje Y a un número "limpio" (múltiplos de 1, 2 o 5 según la magnitud)
const techoLimpio = (valor) => {
  if (valor <= 0) return 1;
  const magnitud = 10 ** Math.floor(Math.log10(valor));
  const pasos = [1, 2, 5, 10];
  const paso = pasos.find((p) => valor <= p * magnitud) ?? 10;
  return paso * magnitud;
};

function GraficoVentas({ datos }) {
  const [foco, setFoco] = useState(null);

  if (datos.length === 0) {
    return <p className="estado-vacio-chico">Todavía no hay ventas en los últimos 14 días.</p>;
  }

  const maximo = techoLimpio(Math.max(...datos.map((d) => d.total)));
  const marcasEje = [0, maximo * 0.5, maximo];

  return (
    <div className="grafico-ventas">
      <div className="grafico-ventas-plot">
        <div className="grafico-ventas-ejeY">
          {marcasEje.slice().reverse().map((m) => (
            <span key={m}>{formatearPrecio(m)}</span>
          ))}
        </div>

        <div className="grafico-ventas-barras">
          {marcasEje.map((m) => (
            <div key={m} className="grafico-ventas-gridline" style={{ bottom: `${(m / maximo) * 100}%` }} />
          ))}

          {datos.map((d) => (
            <button
              type="button"
              key={d.dia}
              className="grafico-ventas-barra-slot"
              onMouseEnter={() => setFoco(d.dia)}
              onMouseLeave={() => setFoco(null)}
              onFocus={() => setFoco(d.dia)}
              onBlur={() => setFoco(null)}
            >
              {foco === d.dia && (
                <div className="grafico-ventas-tooltip">
                  <strong>{formatearPrecio(d.total)}</strong>
                  <span>{formatearDia(d.dia)}</span>
                </div>
              )}
              <div
                className={`grafico-ventas-barra ${foco === d.dia ? 'grafico-ventas-barra-activa' : ''}`}
                style={{ height: `${Math.max((d.total / maximo) * 100, 2)}%` }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="grafico-ventas-ejeX">
        {datos.map((d) => (
          <span key={d.dia}>{formatearDia(d.dia)}</span>
        ))}
      </div>
    </div>
  );
}

export default function EstadisticasPage() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const { data } = await api.get('/estadisticas/');
        setDatos(data);
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  return (
    <div className="estadisticas-page">
      <header className="main-header">
        <h2>Estadísticas</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        {cargando || !datos ? (
          <p className="estado-vacio">Cargando...</p>
        ) : (
          <>
            <div className="resumen-grid">
              <div className="resumen-tile resumen-tile-servicios">
                <span>Ventas totales</span>
                <strong>{formatearPrecio(datos.ventas_totales)}</strong>
              </div>
              <div className="resumen-tile resumen-tile-otros">
                <span>Gastos totales</span>
                <strong>{formatearPrecio(datos.gastos_totales)}</strong>
              </div>
              <div className={`resumen-tile ${datos.ganancia_neta >= 0 ? 'resumen-tile-ganancia-positiva' : 'resumen-tile-ganancia-negativa'}`}>
                <span>Ganancia neta</span>
                <strong>{formatearPrecio(datos.ganancia_neta)}</strong>
              </div>
              <div className="resumen-tile resumen-tile-insumos">
                <span>Ticket promedio</span>
                <strong>{formatearPrecio(datos.ticket_promedio)}</strong>
              </div>
              <div className="resumen-tile resumen-tile-total">
                <span>Pedidos totales</span>
                <strong>{datos.total_pedidos}</strong>
              </div>
            </div>

            <div className="seccion-header">
              <h3>Ventas de los últimos 14 días</h3>
            </div>
            <GraficoVentas datos={datos.ventas_por_dia} />

            <div className="seccion-header">
              <h3>Productos más vendidos</h3>
            </div>
            {datos.productos_mas_vendidos.length === 0 ? (
              <p className="estado-vacio-chico">Todavía no hay ventas registradas.</p>
            ) : (
              <div className="ranking-productos">
                {datos.productos_mas_vendidos.map((p, i) => {
                  const maxCantidad = datos.productos_mas_vendidos[0].cantidad_total;
                  const porcentaje = Math.max((p.cantidad_total / maxCantidad) * 100, 6);
                  return (
                    <div key={p.producto_id} className="ranking-fila">
                      <span className="ranking-puesto">#{i + 1}</span>
                      <div className="ranking-info">
                        <div className="ranking-nombre-linea">
                          <strong>{p.producto_nombre}</strong>
                          <span>{p.cantidad_total} vendidos · {formatearPrecio(p.total)}</span>
                        </div>
                        <div className="ranking-barra-fondo">
                          <div className="ranking-barra" style={{ width: `${porcentaje}%` }} />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
