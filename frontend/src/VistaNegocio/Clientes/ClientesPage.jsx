import React, { useCallback, useEffect, useState } from 'react';
import api from '../../services/api';

const formatearPrecio = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(v);

const formatearFecha = (iso) => new Date(iso).toLocaleDateString('es-AR');

const COMPRA_EJEMPLO = 10000;

export default function ClientesPage() {
  const [tab, setTab] = useState('clientes');
  const [clientes, setClientes] = useState([]);
  const [recompensas, setRecompensas] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [configId, setConfigId] = useState(null);
  const [pesosPorPunto, setPesosPorPunto] = useState(100);
  const [valorPunto, setValorPunto] = useState(1);
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  const [nuevoNombre, setNuevoNombre] = useState('');
  const [nuevoPuntos, setNuevoPuntos] = useState('');

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [resClientes, resRecompensas, resConfig] = await Promise.all([
        api.get('/clientes/'),
        api.get('/recompensas/'),
        api.get('/configuracion/'),
      ]);
      setClientes(resClientes.data);
      setRecompensas(resRecompensas.data);
      if (resConfig.data && resConfig.data.length > 0) {
        const c = resConfig.data[resConfig.data.length - 1];
        setConfigId(c.id);
        setPesosPorPunto(c.pesos_por_punto ?? 100);
        setValorPunto(c.valor_punto ?? 1);
      }
    } catch (e) {
      console.error('Error al cargar clientes/recompensas:', e);
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargar(); }, [cargar]);

  const guardarConfig = async (e) => {
    e.preventDefault();
    if (Number(pesosPorPunto) < 1) {
      alert('Cada punto tiene que costar al menos $1 de compra.');
      return;
    }
    setGuardandoConfig(true);
    try {
      await api.patch(`/configuracion/${configId}/`, {
        pesos_por_punto: Number(pesosPorPunto),
        valor_punto: Number(valorPunto),
      });
      alert('Programa de puntos guardado.');
    } catch (err) {
      console.error('Error al guardar el programa de puntos:', err);
      alert(Object.values(err.response?.data || {}).flat()[0] || 'No se pudo guardar.');
    } finally {
      setGuardandoConfig(false);
    }
  };

  const crearRecompensa = async (e) => {
    e.preventDefault();
    if (!nuevoNombre.trim() || Number(nuevoPuntos) <= 0) {
      alert('Poné un nombre y cuántos puntos cuesta.');
      return;
    }
    try {
      await api.post('/recompensas/', { nombre: nuevoNombre.trim(), puntos: Number(nuevoPuntos) });
      setNuevoNombre('');
      setNuevoPuntos('');
      cargar();
    } catch (err) {
      console.error('Error al crear el premio:', err);
      alert('No se pudo crear el premio.');
    }
  };

  const alternarActiva = async (r) => {
    try {
      await api.patch(`/recompensas/${r.id}/`, { activa: !r.activa });
      cargar();
    } catch (err) {
      console.error('Error al actualizar el premio:', err);
    }
  };

  const eliminarRecompensa = async (r) => {
    if (!window.confirm(`¿Eliminar el premio "${r.nombre}"? Los pedidos que ya lo canjearon lo siguen mostrando.`)) return;
    try {
      await api.delete(`/recompensas/${r.id}/`);
      cargar();
    } catch (err) {
      console.error('Error al eliminar el premio:', err);
    }
  };

  // Ejemplo en vivo, para que se entienda qué se está configurando.
  const puntosEjemplo = Math.floor(COMPRA_EJEMPLO / Math.max(Number(pesosPorPunto) || 1, 1));

  return (
    <>
      <header className="main-header">
        <h2>Clientes</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        <div className="tabs-bar">
          <button type="button" className={`tab-boton ${tab === 'clientes' ? 'tab-activo' : ''}`} onClick={() => setTab('clientes')}>
            Registrados
          </button>
          <button type="button" className={`tab-boton ${tab === 'puntos' ? 'tab-activo' : ''}`} onClick={() => setTab('puntos')}>
            Programa de puntos
          </button>
        </div>

        {tab === 'clientes' && (
          cargando ? (
            <p className="estado-vacio">Cargando...</p>
          ) : clientes.length === 0 ? (
            <div className="estado-vacio">
              <p>Todavía no se registró ningún cliente en la tienda.</p>
            </div>
          ) : (
            <div className="gastos-tabla">
              {clientes.map((c) => (
                <div key={c.id} className="gasto-fila">
                  <span className="badge-categoria badge-categoria-servicios">⭐ {c.puntos} pts</span>
                  <div className="gasto-fila-info">
                    <strong>{c.nombre || c.email}</strong>
                    <span className="gasto-fila-insumo">
                      {c.email}{c.telefono && ` · 📞 ${c.telefono}`}
                    </span>
                  </div>
                  <span className="gasto-fila-fecha">desde {formatearFecha(c.creado)}</span>
                  <span className="gasto-fila-monto">{formatearPrecio(c.puntos_en_pesos)}</span>
                </div>
              ))}
            </div>
          )
        )}

        {tab === 'puntos' && (
          <>
            <div className="seccion-header"><h3>Cuánto vale cada punto</h3></div>
            <form className="form-card" onSubmit={guardarConfig}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Se gana 1 punto cada</label>
                  <div className="input-con-sufijo">
                    <input
                      type="number"
                      min="1"
                      className="input-vibrante"
                      value={pesosPorPunto}
                      onChange={(e) => setPesosPorPunto(e.target.value)}
                    />
                    <span>pesos de compra</span>
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Cada punto vale</label>
                  <div className="input-con-sufijo">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="input-vibrante"
                      value={valorPunto}
                      onChange={(e) => setValorPunto(e.target.value)}
                    />
                    <span>pesos de descuento</span>
                  </div>
                </div>
              </div>

              <p className="aviso-envio">
                Ejemplo: una compra de {formatearPrecio(COMPRA_EJEMPLO)} da <strong>{puntosEjemplo} puntos</strong>,
                que valen <strong>{formatearPrecio(puntosEjemplo * (Number(valorPunto) || 0))}</strong> de descuento.
              </p>

              <div className="modal-actions">
                <button type="submit" className="btn-vibrante" disabled={guardandoConfig || !configId}>
                  {guardandoConfig ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>

            <div className="seccion-header"><h3>Premios por puntos</h3></div>
            <form className="form-card" onSubmit={crearRecompensa}>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Premio</label>
                  <input
                    type="text"
                    className="input-vibrante"
                    placeholder="Ej: Hamburguesa gratis"
                    value={nuevoNombre}
                    onChange={(e) => setNuevoNombre(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Cuesta</label>
                  <div className="input-con-sufijo">
                    <input
                      type="number"
                      min="1"
                      className="input-vibrante"
                      placeholder="100"
                      value={nuevoPuntos}
                      onChange={(e) => setNuevoPuntos(e.target.value)}
                    />
                    <span>puntos</span>
                  </div>
                </div>
              </div>
              <div className="modal-actions">
                <button type="submit" className="btn-vibrante">+ Agregar premio</button>
              </div>
            </form>

            {recompensas.length === 0 ? (
              <p className="estado-vacio-chico">Todavía no cargaste premios.</p>
            ) : (
              <div className="gastos-tabla">
                {recompensas.map((r) => (
                  <div key={r.id} className={`gasto-fila ${!r.activa ? 'recompensa-inactiva' : ''}`}>
                    <span className="badge-categoria badge-categoria-servicios">⭐ {r.puntos} pts</span>
                    <div className="gasto-fila-info">
                      <strong>{r.nombre}</strong>
                      <span className="gasto-fila-insumo">
                        {r.activa ? 'Se puede canjear' : 'Pausado — no se ofrece en la tienda'}
                      </span>
                    </div>
                    <span className="gasto-fila-monto">{formatearPrecio(r.puntos * (Number(valorPunto) || 0))}</span>
                    <button
                      type="button"
                      className="gasto-fila-borrar"
                      title={r.activa ? 'Pausar' : 'Activar'}
                      onClick={() => alternarActiva(r)}
                    >
                      {r.activa ? '⏸' : '▶'}
                    </button>
                    <button type="button" className="gasto-fila-borrar" title="Eliminar" onClick={() => eliminarRecompensa(r)}>🗑</button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
