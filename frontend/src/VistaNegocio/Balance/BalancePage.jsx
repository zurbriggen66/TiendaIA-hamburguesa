import React, { useEffect, useState } from 'react';
import api from '../../services/api';
import { formatearPrecio } from '../Estadisticas/BarrasDesglose';

const pad2 = (n) => String(n).padStart(2, '0');
const mesActualISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`;
};

const rangoDelMes = (mes) => {
  const [anio, numero] = mes.split('-').map(Number);
  const ultimo = new Date(anio, numero, 0).getDate();
  return { desde: `${mes}-01`, hasta: `${mes}-${pad2(ultimo)}` };
};

const pct = (valor) => `${valor >= 0 ? '' : '−'}${Math.abs(valor).toFixed(1)}%`;

/** Barra de margen: verde si deja plata, roja si el producto se vende a pérdida. */
function BarraMargen({ margen }) {
  if (margen === null || margen === undefined) {
    return <span className="balance-sin-dato">sin costo cargado</span>;
  }
  const ancho = Math.min(Math.abs(margen), 100);
  return (
    <div className="balance-margen">
      <div className="balance-margen-pista">
        <div
          className={`balance-margen-barra${margen < 0 ? ' balance-margen-perdida' : ''}`}
          style={{ width: `${ancho}%` }}
        />
      </div>
      <span className={margen < 0 ? 'balance-margen-valor balance-margen-negativo' : 'balance-margen-valor'}>
        {pct(margen)}
      </span>
    </div>
  );
}

/**
 * Balance: qué deja realmente lo que se vende.
 *
 * Cruza la receta de cada producto (los insumos que usa) con lo que costó reponer esos
 * insumos, y lo compara contra el precio de venta. El dato ya existía repartido entre
 * Estadísticas y Stock; acá se junta para poder responder una sola pregunta: de cada
 * cosa que vendo, ¿cuánto me queda?
 */
export default function BalancePage() {
  const [datos, setDatos] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mes, setMes] = useState(mesActualISO());
  const [orden, setOrden] = useState('margen');
  const [abierto, setAbierto] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const { data } = await api.get('/estadisticas/', { params: rangoDelMes(mes) });
        setDatos(data);
      } catch (error) {
        console.error('Error al cargar el balance:', error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, [mes]);

  if (cargando || !datos) {
    return (
      <div className="balance-page">
        <header className="pagina-header">
          <div>
            <h2>Balance</h2>
            <p className="pagina-subtitulo">Qué deja cada producto después de los insumos.</p>
          </div>
        </header>
        <div className="scroll-area"><p className="estado-vacio">Cargando...</p></div>
      </div>
    );
  }

  const ventas = Number(datos.ventas_totales);
  const costoInsumos = Number(datos.costo_insumos_periodo || 0);
  const gastos = Number(datos.gastos_totales);
  const margenBruto = ventas - costoInsumos;
  const margenPct = ventas > 0 ? (margenBruto / ventas) * 100 : 0;
  const resultado = ventas - gastos;

  // Las unidades vienen en la misma fila que el costo. Cruzar contra
  // `productos_mas_vendidos` no serviría: esa lista está cortada en el top 5, así que
  // todo lo demás figuraría con 0 vendidos.
  const productos = (datos.costos_productos || []).map((p) => {
    const unidades = Number(p.unidades_vendidas || 0);
    return { ...p, unidades, aporte: unidades * Number(p.ganancia) };
  });

  const ordenados = [...productos].sort((a, b) => {
    if (orden === 'aporte') return b.aporte - a.aporte;
    if (orden === 'unidades') return b.unidades - a.unidades;
    // Peor margen primero: lo que hay que mirar es lo que deja poco, no lo que va bien.
    const ma = a.margen_pct === null ? Infinity : a.margen_pct;
    const mb = b.margen_pct === null ? Infinity : b.margen_pct;
    return ma - mb;
  });

  const sinCosto = productos.filter((p) => p.insumos_sin_costo?.length > 0);
  const aPerdida = productos.filter((p) => p.margen_pct !== null && p.margen_pct < 0);

  return (
    <div className="balance-page">
      <header className="pagina-header">
        <div>
          <h2>Balance</h2>
          <p className="pagina-subtitulo">Qué deja cada producto después de los insumos que usa.</p>
        </div>
        <div className="pagina-header-acciones">
          <input
            type="month"
            className="input-vibrante"
            value={mes}
            onChange={(e) => setMes(e.target.value)}
            aria-label="Mes"
          />
          <div className="avatar">A</div>
        </div>
      </header>

      <div className="scroll-area">
        {/* Las dos miradas van SEPARADAS y nunca se suman: los insumos que compraste ya
            están dentro de los gastos, así que restar las dos cosas contaría dos veces
            la misma plata. Una responde "¿mi precio está bien?", la otra "¿cuánto se
            movió este mes?". */}
        <div className="balance-miradas">
          <section className="panel balance-mirada">
            <h3 className="panel-titulo">¿Está bien mi precio?</h3>
            <dl className="datos-lista">
              <div><dt>Vendido</dt><dd>{formatearPrecio(ventas)}</dd></div>
              <div><dt>Costo en insumos de lo vendido</dt><dd>−{formatearPrecio(costoInsumos)}</dd></div>
            </dl>
            <div className={`balance-resultado ${margenBruto >= 0 ? 'balance-ok' : 'balance-mal'}`}>
              <span>Margen bruto</span>
              <strong>{formatearPrecio(margenBruto)}</strong>
              <small>{ventas > 0 ? `${margenPct.toFixed(1)}% de lo vendido` : 'sin ventas'}</small>
            </div>
            <p className="panel-pie">
              Los insumos se valúan a lo que cuesta reponerlos hoy, no a lo que salieron
              el día de la compra: sirve para decidir precios.
            </p>
          </section>

          <section className="panel balance-mirada">
            <h3 className="panel-titulo">¿Cuánta plata se movió?</h3>
            <dl className="datos-lista">
              <div><dt>Vendido</dt><dd>{formatearPrecio(ventas)}</dd></div>
              <div><dt>Gastos pagados</dt><dd>−{formatearPrecio(gastos)}</dd></div>
            </dl>
            <div className={`balance-resultado ${resultado >= 0 ? 'balance-ok' : 'balance-mal'}`}>
              <span>Resultado del mes</span>
              <strong>{formatearPrecio(resultado)}</strong>
              <small>{datos.total_pedidos} pedidos</small>
            </div>
            <p className="panel-pie">
              Incluye todo lo que se pagó en el mes, aunque se consuma más adelante
              (una compra grande de insumos hunde un mes y alivia el siguiente).
            </p>
          </section>
        </div>

        {aPerdida.length > 0 && (
          <div className="panel balance-alerta balance-alerta-mal">
            <strong>⚠️ {aPerdida.length} producto{aPerdida.length === 1 ? '' : 's'} se vende{aPerdida.length === 1 ? '' : 'n'} a pérdida</strong>
            <p>{aPerdida.map((p) => p.producto_nombre).join(', ')} — el precio no cubre ni los insumos.</p>
          </div>
        )}

        {sinCosto.length > 0 && (
          <div className="panel balance-alerta">
            <strong>ℹ️ {sinCosto.length} producto{sinCosto.length === 1 ? '' : 's'} con el costo incompleto</strong>
            <p>
              Les falta el precio de compra de algún insumo, así que su margen se ve
              mejor de lo que es. Cargá una compra de: {[...new Set(sinCosto.flatMap((p) => p.insumos_sin_costo))].join(', ')}.
            </p>
          </div>
        )}

        <section className="panel">
          <div className="panel-encabezado">
            <h3 className="panel-titulo">Producto por producto</h3>
            <div className="tabs">
              <button type="button" className={`tab${orden === 'margen' ? ' tab-activa' : ''}`} onClick={() => setOrden('margen')}>
                Peor margen
              </button>
              <button type="button" className={`tab${orden === 'aporte' ? ' tab-activa' : ''}`} onClick={() => setOrden('aporte')}>
                Más aporta
              </button>
              <button type="button" className={`tab${orden === 'unidades' ? ' tab-activa' : ''}`} onClick={() => setOrden('unidades')}>
                Más vendido
              </button>
            </div>
          </div>

          {ordenados.length === 0 ? (
            <p className="estado-vacio-chico">
              Todavía no hay productos con receta cargada. Asigná insumos a tus productos
              en Productos para poder ver cuánto cuesta hacerlos.
            </p>
          ) : (
            <div className="grafico-tabla-wrap">
              <table className="grafico-tabla balance-tabla">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Precio</th>
                    <th>Cuesta</th>
                    <th>Deja c/u</th>
                    <th>Margen</th>
                    <th>Vendidos</th>
                    <th>Aportó</th>
                  </tr>
                </thead>
                <tbody>
                  {ordenados.map((p) => {
                    const estaAbierto = abierto === p.producto_id;
                    return (
                      <React.Fragment key={p.producto_id}>
                        <tr
                          className="balance-fila"
                          onClick={() => setAbierto(estaAbierto ? null : p.producto_id)}
                          title="Ver de qué se compone el costo"
                        >
                          <td>
                            <span className="balance-flecha">{estaAbierto ? '▾' : '▸'}</span>
                            {' '}{p.producto_nombre}
                            {p.insumos_sin_costo?.length > 0 && (
                              <span className="balance-incompleto" title={`Falta el costo de: ${p.insumos_sin_costo.join(', ')}`}>
                                {' '}ℹ️
                              </span>
                            )}
                          </td>
                          <td>{formatearPrecio(p.precio)}</td>
                          <td>{formatearPrecio(p.costo)}</td>
                          <td className={Number(p.ganancia) < 0 ? 'balance-margen-negativo' : ''}>
                            {formatearPrecio(p.ganancia)}
                          </td>
                          <td><BarraMargen margen={p.margen_pct} /></td>
                          <td>{p.unidades}</td>
                          <td>{p.unidades > 0 ? formatearPrecio(p.aporte) : '—'}</td>
                        </tr>
                        {/* La cuenta completa, para que el costo no sea un número que
                            haya que creer: 2 fetas a $200 + 1 disco a $300 = $500. */}
                        {estaAbierto && (
                          <tr className="balance-receta-fila">
                            <td colSpan={7}>
                              <div className="balance-receta">
                                <span className="balance-receta-titulo">
                                  Para hacer un{p.producto_nombre.endsWith('a') ? 'a' : ''} {p.producto_nombre} se usa:
                                </span>
                                {(p.receta || []).map((r) => (
                                  <div key={r.insumo_id} className="balance-receta-linea">
                                    <span>
                                      {Number(r.cantidad)} {r.unidad} de <strong>{r.insumo_nombre}</strong>
                                    </span>
                                    <span className="balance-receta-cuenta">
                                      {r.costo_unitario === null
                                        ? 'sin costo cargado'
                                        : `${Number(r.cantidad)} × ${formatearPrecio(r.costo_unitario)}`}
                                    </span>
                                    <span className="balance-receta-subtotal">
                                      {r.subtotal === null ? '—' : formatearPrecio(r.subtotal)}
                                    </span>
                                  </div>
                                ))}
                                <div className="balance-receta-linea balance-receta-total">
                                  <span><strong>Cuesta hacerlo</strong></span>
                                  <span />
                                  <span className="balance-receta-subtotal">{formatearPrecio(p.costo)}</span>
                                </div>
                                <div className="balance-receta-linea balance-receta-total">
                                  <span><strong>Se vende a</strong></span>
                                  <span />
                                  <span className="balance-receta-subtotal">{formatearPrecio(p.precio)}</span>
                                </div>
                                <div className={`balance-receta-linea balance-receta-deja ${Number(p.ganancia) < 0 ? 'balance-margen-negativo' : ''}`}>
                                  <span><strong>Deja</strong></span>
                                  <span />
                                  <span className="balance-receta-subtotal">{formatearPrecio(p.ganancia)}</span>
                                </div>
                                {p.insumos_sin_costo?.length > 0 && (
                                  <p className="balance-receta-aviso">
                                    ℹ️ Falta cargar cuánto cuesta {p.insumos_sin_costo.join(', ')}, así que
                                    el costo real es mayor y el margen se ve mejor de lo que es.
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
