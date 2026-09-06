import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import BarrasDesglose, { formatearPrecio } from './BarrasDesglose';
import GraficoVentas from './GraficoVentas';
import GraficoTorta from './GraficoTorta';
import BarraProporcion from './BarraProporcion';

const pad2 = (n) => String(n).padStart(2, '0');
// OJO: no usar toISOString() acá — convierte a UTC y en Argentina (UTC-3) eso hace
// que "hoy" salte al día siguiente a partir de las 21:00 hora local.
const hoyISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};
const mesActualISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};

const primerYUltimoDiaDelMes = (mesStr) => {
  const [anio, mes] = mesStr.split('-').map(Number);
  const ultimoDia = new Date(anio, mes, 0).getDate();
  return { primero: `${mesStr}-01`, ultimo: `${mesStr}-${String(ultimoDia).padStart(2, '0')}` };
};

export default function EstadisticasPage() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState('general');
  const [mesSeleccionado, setMesSeleccionado] = useState(mesActualISO());
  const [diaSeleccionado, setDiaSeleccionado] = useState(hoyISO());

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        let params = {};
        if (tab === 'mensual') {
          const { primero, ultimo } = primerYUltimoDiaDelMes(mesSeleccionado);
          params = { desde: primero, hasta: ultimo };
        } else if (tab === 'dia') {
          params = { desde: diaSeleccionado, hasta: diaSeleccionado };
        }
        const { data } = await api.get('/estadisticas/', { params });
        setDatos(data);
      } catch (error) {
        console.error('Error al cargar estadísticas:', error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [tab, mesSeleccionado, diaSeleccionado]);

  return (
    <div className="estadisticas-page">
      <header className="main-header">
        <h2>Estadísticas</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        <div className="tabs-bar">
          <button type="button" className={`tab-boton ${tab === 'general' ? 'tab-activo' : ''}`} onClick={() => setTab('general')}>
            General
          </button>
          <button type="button" className={`tab-boton ${tab === 'mensual' ? 'tab-activo' : ''}`} onClick={() => setTab('mensual')}>
            Mensual
          </button>
          <button type="button" className={`tab-boton ${tab === 'dia' ? 'tab-activo' : ''}`} onClick={() => setTab('dia')}>
            Por día
          </button>
        </div>

        {tab === 'mensual' && (
          <div className="form-group estadisticas-selector-periodo">
            <label className="form-label">Mes</label>
            <input
              type="month"
              className="input-vibrante"
              value={mesSeleccionado}
              onChange={(e) => setMesSeleccionado(e.target.value)}
            />
          </div>
        )}

        {tab === 'dia' && (
          <div className="form-group estadisticas-selector-periodo">
            <label className="form-label">Día</label>
            <input
              type="date"
              className="input-vibrante"
              value={diaSeleccionado}
              onChange={(e) => setDiaSeleccionado(e.target.value)}
            />
          </div>
        )}

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
              <div className="resumen-tile resumen-tile-insumos">
                <span>Insumos de lo vendido</span>
                <strong>{formatearPrecio(datos.costo_insumos_periodo || 0)}</strong>
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

            {/* El título va DENTRO del gráfico: con una sola serie no hay leyenda,
                así que el título es lo único que nombra el dato. */}
            {tab !== 'dia' && (
              <GraficoVentas
                datos={datos.ventas_por_dia}
                titulo={tab === 'mensual' ? 'Ventas del mes' : 'Ventas de los últimos 14 días'}
              />
            )}

            {/* Torta y no barras: los métodos de pago SUMAN las ventas, así que es una
                relación parte-todo real y el porcentaje significa algo. */}
            <GraficoTorta
              titulo="Con qué te pagaron las ventas"
              total={Number(datos.ventas_totales)}
              datos={(datos.ventas_por_metodo || []).map((f) => ({
                clave: f.metodo,
                etiqueta: f.metodo_label,
                total: f.total,
              }))}
            />

            <div className="seccion-header">
              <h3>En qué se fue la plata</h3>
            </div>
            {Number(datos.gastos_totales) === 0 ? (
              <p className="estado-vacio-chico">No hay gastos registrados en este período.</p>
            ) : (
              <div className="gastos-desglose-grid">
                <div>
                  <h4 className="gastos-desglose-titulo">Por rubro</h4>
                  <BarrasDesglose
                    filas={(datos.gastos_por_categoria || []).map((f) => ({
                      clave: f.categoria,
                      etiqueta: f.categoria_label,
                      total: f.total,
                      gastos: f.gastos,
                    }))}
                    total={Number(datos.gastos_totales)}
                    detalleSecundario="metodo"
                  />
                </div>
                <div>
                  <h4 className="gastos-desglose-titulo">Con qué se pagó</h4>
                  <BarrasDesglose
                    filas={(datos.gastos_por_metodo || []).map((f) => ({
                      clave: f.metodo,
                      etiqueta: f.metodo_label,
                      total: f.total,
                      gastos: f.gastos,
                    }))}
                    total={Number(datos.gastos_totales)}
                    detalleSecundario="categoria"
                  />
                </div>
              </div>
            )}

            <div className="seccion-header">
              <h3>Productos más vendidos</h3>
            </div>
            {datos.productos_mas_vendidos.length === 0 ? (
              <p className="estado-vacio-chico">Todavía no hay ventas registradas.</p>
            ) : (
              <div className="ranking-productos">
                {/* El porcentaje es sobre el TOTAL vendido, no sobre el primer puesto:
                    escalar contra el máximo hacía que el #1 siempre se viera lleno,
                    llevándose el 80% de las ventas o el 12%. */}
                {(() => {
                  const totalUnidades = datos.productos_mas_vendidos.reduce(
                    (acc, p) => acc + Number(p.cantidad_total), 0,
                  );
                  return datos.productos_mas_vendidos.map((p, i) => (
                    <div key={p.producto_id} className="ranking-fila">
                      <span className="ranking-puesto">#{i + 1}</span>
                      <div className="ranking-info">
                        <div className="ranking-nombre-linea">
                          <strong>{p.producto_nombre}</strong>
                          <span>{p.cantidad_total} vendidos · {formatearPrecio(p.total)}</span>
                        </div>
                        <BarraProporcion valor={p.cantidad_total} total={totalUnidades} />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}

            {/* El costo por producto vive en Balance, que además muestra el desglose de
                la receta. Tenerlo también acá era mantener la misma pantalla dos veces
                y garantizar que en algún momento dijeran cosas distintas. */}
            <div className="panel balance-alerta">
              <strong>⚖️ ¿Cuánto te cuesta cada producto?</strong>
              <p>
                Está en <a href="/admin/balance" className="enlace-seccion">Balance</a>, con el
                desglose de la receta: cuántas unidades de cada insumo lleva, a qué precio, y
                cuánto te deja al venderlo.
              </p>
            </div>
            <div className="seccion-header">
              <h3>Insumos con más gasto</h3>
            </div>
            {datos.insumos_mas_comprados.length === 0 ? (
              <p className="estado-vacio-chico">Todavía no registraste compras de insumos.</p>
            ) : (
              <div className="ranking-productos">
                {(() => {
                  const totalComprado = datos.insumos_mas_comprados.reduce(
                    (acc, ins) => acc + Number(ins.total), 0,
                  );
                  return datos.insumos_mas_comprados.map((ins, i) => (
                    <div key={ins.insumo_id} className="ranking-fila">
                      <span className="ranking-puesto">#{i + 1}</span>
                      <div className="ranking-info">
                        <div className="ranking-nombre-linea">
                          <strong>{ins.insumo_nombre}</strong>
                          <span>{ins.cantidad_total} {ins.unidad} · {formatearPrecio(ins.total)}</span>
                        </div>
                        <BarraProporcion valor={ins.total} total={totalComprado} />
                      </div>
                    </div>
                  ));
                })()}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
