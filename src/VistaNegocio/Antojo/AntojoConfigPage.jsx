import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

export default function AntojoConfigPage() {
  const [configId, setConfigId] = useState(null);
  const [productos, setProductos] = useState([]);
  const [productoId, setProductoId] = useState('');
  const [descuentoPct, setDescuentoPct] = useState(15);
  const [activo, setActivo] = useState(false);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    const cargar = async () => {
      setCargando(true);
      try {
        const [resConfig, resProductos] = await Promise.all([
          api.get('/antojo-config/'),
          api.get('/productos/'),
        ]);
        setProductos(resProductos.data.filter((p) => !p.es_extra));
        if (resConfig.data.length > 0) {
          const config = resConfig.data[resConfig.data.length - 1];
          setConfigId(config.id);
          setProductoId(config.producto || '');
          setDescuentoPct(config.descuento_pct);
          setActivo(config.activo);
        }
      } catch (error) {
        console.error('Error al cargar el Antojo del día:', error);
      } finally {
        setCargando(false);
      }
    };
    cargar();
  }, []);

  const guardar = async (e) => {
    e.preventDefault();
    if (activo && !productoId) {
      alert('Elegí un producto para poder activar el Antojo del día.');
      return;
    }

    const datos = {
      producto: productoId || null,
      descuento_pct: Number(descuentoPct) || 0,
      activo,
    };

    setGuardando(true);
    try {
      if (configId) {
        await api.patch(`/antojo-config/${configId}/`, datos);
      } else {
        const { data } = await api.post('/antojo-config/', datos);
        setConfigId(data.id);
      }
      alert('¡Antojo del día guardado!');
    } catch (error) {
      console.error('Error al guardar el Antojo del día:', error);
      alert(error.response?.data?.non_field_errors?.[0] || 'Hubo un problema al guardar.');
    } finally {
      setGuardando(false);
    }
  };

  const productoElegido = productos.find((p) => String(p.id) === String(productoId));

  return (
    <>
      <header className="main-header">
        <h2>Antojo del día</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        {cargando ? (
          <p className="estado-vacio">Cargando...</p>
        ) : (
          <div className="form-card">
            <h3 className="form-card-title">🔥 Antojo del día</h3>
            <p className="aviso-envio">
              Elegí qué hamburguesa mostrar con descuento en la página principal, qué porcentaje aplicarle, y si querés que esté visible ahora mismo.
            </p>

            <form onSubmit={guardar}>
              <div className="form-group">
                <label className="form-label">Producto</label>
                <select className="input-vibrante" value={productoId} onChange={(e) => setProductoId(e.target.value)}>
                  <option value="">Elegir producto...</option>
                  {productos.map((p) => (
                    <option key={p.id} value={p.id}>{p.nombre} — {formatearPrecio(p.precio)}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Porcentaje de descuento</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input-vibrante"
                  value={descuentoPct}
                  onChange={(e) => setDescuentoPct(e.target.value)}
                />
              </div>

              {productoElegido && Number(descuentoPct) > 0 && (
                <p className="aviso-sin-insumos">
                  Precio con descuento: {formatearPrecio(productoElegido.precio * (1 - Number(descuentoPct) / 100))}
                  {' '}(antes {formatearPrecio(productoElegido.precio)})
                </p>
              )}

              <div className="form-group">
                <label className="checkbox-vibrante">
                  <input type="checkbox" checked={activo} onChange={(e) => setActivo(e.target.checked)} />
                  <span>🟢 Activo (visible en la web ahora mismo)</span>
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '24px' }}>
                <button type="submit" className="btn-vibrante" disabled={guardando}>
                  {guardando ? 'Guardando...' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
