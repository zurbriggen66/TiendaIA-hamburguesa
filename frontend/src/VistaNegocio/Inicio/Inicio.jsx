import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const formatearPrecio = (valor) =>
  new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 0,
  }).format(valor);

const formatearHora = (fecha) =>
  new Date(fecha).toLocaleTimeString('es-AR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

export default function Inicio() {
  const [reloj, setReloj] = useState(new Date());
  const [ventasHoy, setVentasHoy] = useState(0);
  const [pedidosHoy, setPedidosHoy] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const interval = setInterval(() => setReloj(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const cargarInicio = async () => {
      setCargando(true);
      try {
        const { data } = await api.get('/estadisticas/hoy/');
        setVentasHoy(data.ventas_totales || 0);
        setPedidosHoy(data.pedidos || []);
        setError(null);
      } catch (err) {
        console.error('Error cargando datos de Inicio:', err);
        setError('No se pudieron cargar los datos de hoy.');
      } finally {
        setCargando(false);
      }
    };

    cargarInicio();
  }, []);

  const horas = String(reloj.getHours()).padStart(2, '0');
  const minutos = String(reloj.getMinutes()).padStart(2, '0');
  const segundos = String(reloj.getSeconds()).padStart(2, '0');
  const fechaLegible = reloj.toLocaleDateString('es-AR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return (
    <>
      <header className="main-header">
        <h2>Inicio</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        <div className="inicio-resumen-grid">
          {/* Tarjeta: Reloj en vivo */}
          <div className="inicio-card inicio-card-reloj">
            <div className="inicio-card-encabezado">
              <span className="inicio-card-icono">🕐</span>
              <h3 className="inicio-card-titulo">Reloj en vivo</h3>
            </div>
            <div className="inicio-reloj-numeros">
              <span>{horas}</span>
              <span className="inicio-reloj-separador">:</span>
              <span>{minutos}</span>
              <span className="inicio-reloj-separador">:</span>
              <span className="inicio-reloj-segundos">{segundos}</span>
            </div>
            <p className="inicio-card-subtexto inicio-fecha-capitalizada">{fechaLegible}</p>
          </div>

          {/* Tarjeta: Total vendido */}
          <div className="inicio-card inicio-card-ventas">
            <div className="inicio-card-encabezado">
              <span className="inicio-card-icono">💰</span>
              <h3 className="inicio-card-titulo">Total vendido hoy</h3>
            </div>
            <p className="inicio-monto-grande">{formatearPrecio(ventasHoy)}</p>
            <p className="inicio-card-subtexto">
              {cargando ? (
                <span className="inicio-punteo-cargando">Actualizando</span>
              ) : (
                'Basado en pedidos no cancelados de hoy'
              )}
            </p>
          </div>
        </div>

        <div className="inicio-card inicio-card-pedidos">
          <div className="inicio-card-encabezado">
            <span className="inicio-card-icono">🧾</span>
            <h3 className="inicio-card-titulo">Pedidos salidos / entregados hoy</h3>
            {!cargando && !error && pedidosHoy.length > 0 && (
              <span className="inicio-contador-pedidos">{pedidosHoy.length}</span>
            )}
          </div>

          {cargando ? (
            <p className="estado-vacio">Cargando...</p>
          ) : error ? (
            <p className="estado-vacio">{error}</p>
          ) : pedidosHoy.length === 0 ? (
            <div className="estado-vacio">
              <p>No hay pedidos salidos o entregados hoy.</p>
            </div>
          ) : (
            <div className="inicio-pedidos-lista">
              {pedidosHoy.map((pedido) => (
                <div key={pedido.id} className="inicio-pedido-item">
                  <div className="inicio-pedido-avatar">
                    {(pedido.cliente || '?').charAt(0).toUpperCase()}
                  </div>

                  <div className="inicio-pedido-info">
                    <div className="inicio-pedido-info-top">
                      <h4>{pedido.cliente || `Pedido #${pedido.id}`}</h4>
                      <span className={`badge-estado estado-${pedido.estado}`}>
                        {pedido.estado === 'listo' ? 'Listo' : pedido.estado === 'entregado' ? 'Entregado' : pedido.estado}
                      </span>
                    </div>
                    <div className="inicio-pedido-info-bottom">
                      <span>🕐 {pedido.hora_salida ? pedido.hora_salida.slice(0, 5) : formatearHora(pedido.creado)}</span>
                      <span>{pedido.tipo_entrega === 'delivery' ? '🛵 Delivery' : '🏠 Retiro'}</span>
                    </div>
                  </div>

                  <span className="inicio-pedido-monto">{formatearPrecio(pedido.total)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <style>
        {`
          .inicio-resumen-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
            gap: 20px;
            margin-bottom: 20px;
          }

          .inicio-card {
            position: relative;
            background: linear-gradient(160deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0) 60%),
                        var(--card-bg, #1a1410);
            border: 1px solid rgba(255, 158, 0, 0.15);
            border-radius: 16px;
            padding: 24px 26px;
            overflow: hidden;
            transition: border-color 0.25s ease, transform 0.25s ease;
          }

          .inicio-card::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: linear-gradient(180deg, rgba(255,158,0,0.9), rgba(255,158,0,0.1));
          }

          .inicio-card:hover {
            border-color: rgba(255, 158, 0, 0.35);
          }

          .inicio-card-encabezado {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 4px;
          }

          .inicio-card-icono {
            font-size: 1.1rem;
            filter: drop-shadow(0 0 6px rgba(255, 158, 0, 0.35));
          }

          .inicio-card-titulo {
            margin: 0;
            font-size: 0.85rem;
            font-weight: 600;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.65);
          }

          .inicio-card-subtexto {
            color: var(--text-muted, rgba(255,255,255,0.5));
            margin-top: 10px;
            font-size: 0.85rem;
          }

          .inicio-fecha-capitalizada {
            text-transform: capitalize;
          }

          .inicio-reloj-numeros {
            font-family: 'Courier New', ui-monospace, monospace;
            font-size: 1.9rem;
            font-weight: 600;
            font-variant-numeric: tabular-nums;
            letter-spacing: 1px;
            margin: 12px 0 0;
            color: rgba(255, 255, 255, 0.9);
            display: flex;
            align-items: baseline;
          }

          .inicio-reloj-separador {
            color: rgba(255, 255, 255, 0.35);
            margin: 0 1px;
          }

          .inicio-reloj-segundos {
            font-size: 1.9rem;
            color: rgba(255, 255, 255, 0.9);
          }

          .inicio-monto-grande {
            font-size: 2.4rem;
            font-weight: 800;
            margin: 12px 0 0;
            background: linear-gradient(90deg, #ffb347, #ff9e00);
            -webkit-background-clip: text;
            background-clip: text;
            color: transparent;
          }

          .inicio-punteo-cargando::after {
            content: '...';
            animation: inicioPunteo 1.2s steps(4, end) infinite;
          }

          @keyframes inicioPunteo {
            0% { content: ''; }
            25% { content: '.'; }
            50% { content: '..'; }
            75% { content: '...'; }
            100% { content: ''; }
          }

          .inicio-card-pedidos .inicio-card-encabezado {
            margin-bottom: 18px;
          }

          .inicio-contador-pedidos {
            margin-left: auto;
            background: rgba(255, 158, 0, 0.15);
            color: #ff9e00;
            border: 1px solid rgba(255, 158, 0, 0.35);
            border-radius: 20px;
            padding: 2px 12px;
            font-size: 0.8rem;
            font-weight: 700;
          }

          .inicio-pedidos-lista {
            display: flex;
            flex-direction: column;
            gap: 12px;
          }

          .inicio-pedido-item {
            display: flex;
            align-items: center;
            gap: 16px;
            background: rgba(255, 255, 255, 0.02);
            border: 1px solid rgba(255, 255, 255, 0.06);
            border-radius: 12px;
            padding: 14px 18px;
            transition: background 0.2s ease, border-color 0.2s ease;
          }

          .inicio-pedido-item:hover {
            background: rgba(255, 158, 0, 0.05);
            border-color: rgba(255, 158, 0, 0.2);
          }

          .inicio-pedido-avatar {
            flex-shrink: 0;
            width: 42px;
            height: 42px;
            border-radius: 50%;
            background: linear-gradient(135deg, #ff9e00, #cc5500);
            color: #fff;
            font-weight: 700;
            font-size: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .inicio-pedido-info {
            flex: 1;
            min-width: 0;
          }

          .inicio-pedido-info-top {
            display: flex;
            align-items: center;
            gap: 10px;
          }

          .inicio-pedido-info-top h4 {
            margin: 0;
            font-size: 0.95rem;
            font-weight: 700;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          .inicio-pedido-info-bottom {
            display: flex;
            gap: 14px;
            margin-top: 4px;
            font-size: 0.8rem;
            color: var(--text-muted, rgba(255,255,255,0.5));
          }

          .inicio-pedido-monto {
            flex-shrink: 0;
            font-weight: 700;
            font-size: 1rem;
            color: #ff9e00;
          }

          @media (max-width: 560px) {
            .inicio-pedido-item {
              flex-wrap: wrap;
            }
            .inicio-pedido-monto {
              margin-left: 58px;
            }
          }
        `}
      </style>
    </>
  );
}