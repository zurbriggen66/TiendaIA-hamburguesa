import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import { toast } from '../../utils/toast';
import InsumoModal from '../Gastos/InsumoModal';
import RestockModal from '../Gastos/RestockModal';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

/**
 * Insumos y stock, en su propia sección.
 *
 * Vivía como una pestaña dentro de Gastos, que mezclaba dos cosas distintas: cuánta
 * mercadería hay (stock) y en qué se fue la plata (gastos). Comparten el momento de la
 * compra, pero se consultan en momentos opuestos — el stock antes de abrir, los gastos
 * al cerrar el mes.
 */
export default function StockPage() {
  const [insumos, setInsumos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [modalInsumo, setModalInsumo] = useState(null);
  const [modalRestock, setModalRestock] = useState(null);
  const [soloBajos, setSoloBajos] = useState(false);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const { data } = await api.get('/insumos/');
      setInsumos(data);
    } catch (error) {
      console.error('Error al cargar los insumos:', error);
      toast.error('No se pudieron cargar los insumos.');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const estaBajo = (insumo) =>
    Number(insumo.stock_minimo) > 0 && Number(insumo.cantidad_disponible) <= Number(insumo.stock_minimo);

  const bajos = insumos.filter(estaBajo);
  const sinCosto = insumos.filter((i) => i.costo_unitario === null);
  const visibles = soloBajos ? bajos : insumos;
  // Lo que vale la mercadería parada: es plata comprada que todavía no se vendió.
  const valorInmovilizado = insumos.reduce(
    (acc, i) => acc + Number(i.cantidad_disponible || 0) * Number(i.costo_unitario || 0),
    0,
  );

  return (
    <div className="stock-page">
      <header className="pagina-header">
        <div>
          <h2>Stock & Insumos</h2>
          <p className="pagina-subtitulo">Qué mercadería hay y cuál está por acabarse.</p>
        </div>
        <div className="pagina-header-acciones">
          <button type="button" className="btn-vibrante" onClick={() => setModalInsumo({ insumo: null })}>
            + Nuevo insumo
          </button>
          <div className="avatar">A</div>
        </div>
      </header>

      <div className="scroll-area">
        {cargando ? (
          <p className="estado-vacio">Cargando...</p>
        ) : insumos.length === 0 ? (
          <div className="panel panel-vacio">
            <span className="panel-vacio-icono" aria-hidden="true">📦</span>
            <div className="panel-vacio-texto">
              <strong>Todavía no cargaste insumos</strong>
              <p>Los insumos son lo que comprás (pan, carne, queso). Con ellos se calcula cuánto cuesta cada producto.</p>
            </div>
            <button type="button" className="btn-vibrante" onClick={() => setModalInsumo({ insumo: null })}>
              Cargar el primero
            </button>
          </div>
        ) : (
          <>
            <div className="kpi-grid">
              <div className="kpi kpi-info">
                <div className="kpi-texto">
                  <span className="kpi-etiqueta">Insumos cargados</span>
                  <strong className="kpi-valor">{insumos.length}</strong>
                  <span className="kpi-detalle">En el depósito</span>
                </div>
                <span className="kpi-icono" aria-hidden="true">📦</span>
              </div>
              <div className={`kpi ${bajos.length > 0 ? 'kpi-alerta' : 'kpi-exito'}`}>
                <div className="kpi-texto">
                  <span className="kpi-etiqueta">Por reponer</span>
                  <strong className="kpi-valor">{bajos.length}</strong>
                  <span className="kpi-detalle">
                    {bajos.length === 0 ? 'Nada bajo el mínimo' : 'Llegaron al mínimo que fijaste'}
                  </span>
                </div>
                <span className="kpi-icono" aria-hidden="true">{bajos.length > 0 ? '⚠️' : '✅'}</span>
              </div>
              <div className="kpi kpi-exito">
                <div className="kpi-texto">
                  <span className="kpi-etiqueta">Valor en depósito</span>
                  <strong className="kpi-valor">{formatearPrecio(valorInmovilizado)}</strong>
                  <span className="kpi-detalle">Comprado y sin vender</span>
                </div>
                <span className="kpi-icono" aria-hidden="true">💰</span>
              </div>
            </div>

            {sinCosto.length > 0 && (
              <div className="panel balance-alerta">
                <strong>ℹ️ {sinCosto.length} insumo{sinCosto.length === 1 ? '' : 's'} sin costo cargado</strong>
                <p>
                  {sinCosto.map((i) => i.nombre).join(', ')} — sin saber cuánto cuestan, los
                  productos que los usan aparecen más rentables de lo que son en Balance.
                  Tocá el insumo y cargá cuánto te cuesta una unidad.
                </p>
              </div>
            )}

            {bajos.length > 0 && (
              <div className="tabs">
                <button
                  type="button"
                  className={`tab${!soloBajos ? ' tab-activa' : ''}`}
                  onClick={() => setSoloBajos(false)}
                >
                  Todos ({insumos.length})
                </button>
                <button
                  type="button"
                  className={`tab${soloBajos ? ' tab-activa' : ''}`}
                  onClick={() => setSoloBajos(true)}
                >
                  ⚠️ Por reponer ({bajos.length})
                </button>
              </div>
            )}

            <div className="stock-grid">
              {visibles.map((insumo) => (
                <div
                  key={insumo.id}
                  className={`stock-card ${estaBajo(insumo) ? 'stock-card-bajo' : ''}`}
                  onClick={() => setModalInsumo({ insumo })}
                  role="button"
                  tabIndex={0}
                  title="Editar insumo"
                >
                  {estaBajo(insumo) && <span className="stock-card-aviso">⚠️ Queda poco</span>}
                  {insumo.descuento_activo && (
                    <span className="badge-descuento">🏷️ -{insumo.descuento_pct}%</span>
                  )}
                  <span className="stock-card-nombre">{insumo.nombre}</span>
                  <strong className="stock-card-cantidad">{insumo.cantidad_disponible}</strong>
                  <span className="stock-card-unidad">{insumo.unidad}</span>
                  <span className="stock-card-costo">
                    {insumo.costo_unitario === null
                      ? '⚠️ sin costo'
                      : `${formatearPrecio(insumo.costo_unitario)} c/${insumo.unidad.replace(/s$/, '')}`}
                  </span>
                  <button
                    type="button"
                    className="stock-card-restock"
                    onClick={(e) => { e.stopPropagation(); setModalRestock(insumo); }}
                    title={`Sumar stock de ${insumo.nombre}`}
                  >
                    + Stock
                  </button>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {modalInsumo && (
        <InsumoModal
          insumo={modalInsumo.insumo}
          onClose={() => setModalInsumo(null)}
          onSaved={() => { setModalInsumo(null); cargarDatos(); }}
        />
      )}

      {modalRestock && (
        <RestockModal
          insumo={modalRestock}
          onClose={() => setModalRestock(null)}
          onSaved={() => { setModalRestock(null); cargarDatos(); }}
        />
      )}
    </div>
  );
}
