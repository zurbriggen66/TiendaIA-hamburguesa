import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import GastoModal from './GastoModal';
import InsumoModal from './InsumoModal';
import GastoFijoModal from './GastoFijoModal';
import GastoFijoPagarModal from './GastoFijoPagarModal';

const ETIQUETA_CATEGORIA = {
  insumos: 'Insumos / Stock',
  servicios: 'Servicios',
  sueldos: 'Sueldos',
  otros: 'Otros',
};

export default function GastosPage() {
  const [gastos, setGastos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [gastosFijos, setGastosFijos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mostrarGastoModal, setMostrarGastoModal] = useState(false);
  const [modalInsumo, setModalInsumo] = useState(null);
  const [modalGastoFijo, setModalGastoFijo] = useState(null);
  const [modalPagar, setModalPagar] = useState(null);
  const [tab, setTab] = useState('stock');

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [resGastos, resInsumos, resResumen, resFijos] = await Promise.all([
        api.get('/gastos/'),
        api.get('/insumos/'),
        api.get('/gastos/resumen/'),
        api.get('/gastos-fijos/'),
      ]);
      setGastos(resGastos.data);
      setInsumos(resInsumos.data);
      setResumen(resResumen.data);
      setGastosFijos(resFijos.data);
    } catch (error) {
      console.error('Error al cargar gastos/insumos:', error);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const eliminarGasto = async (gasto) => {
    if (!window.confirm(`¿Eliminar el gasto "${gasto.descripcion}"?`)) return;
    try {
      await api.delete(`/gastos/${gasto.id}/`);
      cargarDatos();
    } catch (error) {
      console.error('Error al eliminar el gasto:', error);
      alert('No se pudo eliminar el gasto.');
    }
  };

  const eliminarGastoFijo = async (gastoFijo) => {
    if (!window.confirm(`¿Eliminar el gasto fijo "${gastoFijo.nombre}"? Los gastos ya registrados no se borran.`)) return;
    try {
      await api.delete(`/gastos-fijos/${gastoFijo.id}/`);
      cargarDatos();
    } catch (error) {
      console.error('Error al eliminar el gasto fijo:', error);
      alert('No se pudo eliminar el gasto fijo.');
    }
  };

  const textoVencimiento = (dias) => {
    if (dias < 0) return `¡Vencido hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}!`;
    if (dias === 0) return '¡Vence hoy!';
    if (dias === 1) return 'Vence mañana';
    return `Faltan ${dias} días`;
  };

  const formatearPrecio = (precio) =>
    new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

  const formatearFecha = (fecha) =>
    new Date(fecha).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="gastos-page">
      <header className="main-header">
        <h2>Gastos</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        {/* Resumen de egresos */}
        {resumen && (
          <div className="resumen-grid">
            <div className="resumen-tile resumen-tile-total">
              <span>Total gastado</span>
              <strong>{formatearPrecio(resumen.total)}</strong>
            </div>
            {resumen.por_categoria.map((cat) => (
              <div key={cat.categoria} className={`resumen-tile resumen-tile-${cat.categoria}`}>
                <span>{cat.categoria_label}</span>
                <strong>{formatearPrecio(cat.total)}</strong>
              </div>
            ))}
          </div>
        )}

        {/* Pestañas */}
        <div className="tabs-bar">
          <button
            type="button"
            className={`tab-boton ${tab === 'stock' ? 'tab-activo' : ''}`}
            onClick={() => setTab('stock')}
          >
            Stock
          </button>
          <button
            type="button"
            className={`tab-boton ${tab === 'gastos' ? 'tab-activo' : ''}`}
            onClick={() => setTab('gastos')}
          >
            Gastos
          </button>
          <button
            type="button"
            className={`tab-boton ${tab === 'fijos' ? 'tab-activo' : ''}`}
            onClick={() => setTab('fijos')}
          >
            Gastos fijos
          </button>
        </div>

        {tab === 'stock' && (
          <>
            <div className="seccion-header">
              <h3>Insumos & Stock</h3>
              <button type="button" className="btn-vibrante" onClick={() => setModalInsumo({ insumo: null })}>
                + Nuevo insumo
              </button>
            </div>

            {insumos.length === 0 ? (
              <div className="estado-vacio">
                <p>Todavía no cargaste insumos.</p>
                <button type="button" className="btn-vibrante" onClick={() => setModalInsumo({ insumo: null })}>
                  Cargar el primer insumo
                </button>
              </div>
            ) : (
              <div className="stock-grid">
                {insumos.map((insumo) => {
                  const bajo = Number(insumo.stock_minimo) > 0 && Number(insumo.cantidad_disponible) <= Number(insumo.stock_minimo);
                  return (
                    <div
                      key={insumo.id}
                      className={`stock-card ${bajo ? 'stock-card-bajo' : ''}`}
                      onClick={() => setModalInsumo({ insumo })}
                      role="button"
                      tabIndex={0}
                      title="Editar insumo"
                    >
                      {bajo && <span className="stock-card-aviso">⚠️ Queda poco</span>}
                      {insumo.descuento_activo && (
                        <span className="badge-descuento">🏷️ -{insumo.descuento_pct}%</span>
                      )}
                      <span className="stock-card-nombre">{insumo.nombre}</span>
                      <strong className="stock-card-cantidad">{insumo.cantidad_disponible}</strong>
                      <span className="stock-card-unidad">{insumo.unidad}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === 'gastos' && (
          <>
            <div className="seccion-header">
              <h3>Gastos</h3>
              <button type="button" className="btn-vibrante" onClick={() => setMostrarGastoModal(true)}>
                + Nuevo gasto
              </button>
            </div>

            {cargando ? (
              <p className="estado-vacio">Cargando...</p>
            ) : gastos.length === 0 ? (
              <div className="estado-vacio">
                <p>Todavía no hay gastos cargados.</p>
                <button type="button" className="btn-vibrante" onClick={() => setMostrarGastoModal(true)}>
                  Cargar el primer gasto
                </button>
              </div>
            ) : (
              <div className="gastos-tabla">
                {gastos.map((gasto) => (
                  <div key={gasto.id} className="gasto-fila">
                    <span className={`badge-categoria badge-categoria-${gasto.categoria}`}>
                      {ETIQUETA_CATEGORIA[gasto.categoria]}
                    </span>
                    <div className="gasto-fila-info">
                      <strong>{gasto.descripcion}</strong>
                      <span className="gasto-fila-insumo">
                        {gasto.insumo_nombre && `${gasto.cantidad} × ${gasto.insumo_nombre} · `}
                        💳 {gasto.metodo_pago_label}
                      </span>
                    </div>
                    <span className="gasto-fila-fecha">{formatearFecha(gasto.fecha)}</span>
                    <span className="gasto-fila-monto">{formatearPrecio(gasto.monto)}</span>
                    <button type="button" className="gasto-fila-borrar" onClick={() => eliminarGasto(gasto)}>🗑</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab === 'fijos' && (
          <>
            <div className="seccion-header">
              <h3>Gastos fijos</h3>
              <button type="button" className="btn-vibrante" onClick={() => setModalGastoFijo({ gastoFijo: null })}>
                + Nuevo gasto fijo
              </button>
            </div>

            {cargando ? (
              <p className="estado-vacio">Cargando...</p>
            ) : gastosFijos.length === 0 ? (
              <div className="estado-vacio">
                <p>Todavía no cargaste gastos fijos (alquiler, sueldos, servicios...).</p>
                <button type="button" className="btn-vibrante" onClick={() => setModalGastoFijo({ gastoFijo: null })}>
                  Cargar el primer gasto fijo
                </button>
              </div>
            ) : (
              <div className="gastos-tabla">
                {gastosFijos.map((fijo) => (
                  <div key={fijo.id} className={`gasto-fila gasto-fila-fijo ${fijo.esta_por_vencer ? 'gasto-fila-vence' : ''}`}>
                    <span className={`badge-categoria badge-categoria-${fijo.categoria}`}>
                      {ETIQUETA_CATEGORIA[fijo.categoria]}
                    </span>
                    <div className="gasto-fila-info">
                      <strong>{fijo.nombre}</strong>
                      <span className="gasto-fila-insumo">
                        {fijo.frecuencia_label} · vence {formatearFecha(fijo.proximo_vencimiento)}
                      </span>
                    </div>
                    <span className={`gasto-fila-fecha ${fijo.esta_por_vencer ? 'gasto-fila-vence-texto' : ''}`}>
                      {textoVencimiento(fijo.dias_restantes)}
                    </span>
                    <span className="gasto-fila-monto">{formatearPrecio(fijo.monto)}</span>
                    <button
                      type="button"
                      className="btn-vibrante gasto-fijo-pagar"
                      onClick={() => setModalPagar(fijo)}
                      title="Marcar como pagado"
                    >
                      ✓ Pagar
                    </button>
                    <button type="button" className="gasto-fila-borrar" onClick={() => setModalGastoFijo({ gastoFijo: fijo })} title="Editar">✎</button>
                    <button type="button" className="gasto-fila-borrar" onClick={() => eliminarGastoFijo(fijo)} title="Eliminar">🗑</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {mostrarGastoModal && (
        <GastoModal
          insumos={insumos}
          onClose={() => setMostrarGastoModal(false)}
          onSaved={() => { setMostrarGastoModal(false); cargarDatos(); }}
        />
      )}

      {modalInsumo && (
        <InsumoModal
          insumo={modalInsumo.insumo}
          onClose={() => setModalInsumo(null)}
          onSaved={() => { setModalInsumo(null); cargarDatos(); }}
        />
      )}

      {modalGastoFijo && (
        <GastoFijoModal
          gastoFijo={modalGastoFijo.gastoFijo}
          onClose={() => setModalGastoFijo(null)}
          onSaved={() => { setModalGastoFijo(null); cargarDatos(); }}
        />
      )}

      {modalPagar && (
        <GastoFijoPagarModal
          gastoFijo={modalPagar}
          onClose={() => setModalPagar(null)}
          onSaved={() => { setModalPagar(null); cargarDatos(); }}
        />
      )}
    </div>
  );
}
