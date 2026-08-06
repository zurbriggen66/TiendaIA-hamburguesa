import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';
import GastoModal from './GastoModal';
import InsumoModal from './InsumoModal';

const ETIQUETA_CATEGORIA = {
  insumos: 'Insumos / Stock',
  servicios: 'Servicios',
  sueldos: 'Sueldos',
  otros: 'Otros',
};

export default function GastosPage() {
  const [gastos, setGastos] = useState([]);
  const [insumos, setInsumos] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [mostrarGastoModal, setMostrarGastoModal] = useState(false);
  const [modalInsumo, setModalInsumo] = useState(null);
  const [tab, setTab] = useState('stock');

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    try {
      const [resGastos, resInsumos, resResumen] = await Promise.all([
        api.get('/gastos/'),
        api.get('/insumos/'),
        api.get('/gastos/resumen/'),
      ]);
      setGastos(resGastos.data);
      setInsumos(resInsumos.data);
      setResumen(resResumen.data);
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
                      {gasto.insumo_nombre && (
                        <span className="gasto-fila-insumo">{gasto.cantidad} × {gasto.insumo_nombre}</span>
                      )}
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
    </div>
  );
}
