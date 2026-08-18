import React, { useEffect, useState } from 'react';
import api from '../../services/api';

const formatearPrecio = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(v);

const formatearFecha = (iso) => new Date(iso).toLocaleDateString('es-AR');

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.get('/clientes/')
      .then((res) => setClientes(res.data))
      .catch((e) => console.error('Error al cargar los clientes:', e))
      .finally(() => setCargando(false));
  }, []);

  return (
    <>
      <header className="main-header">
        <h2>Clientes registrados</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        {cargando ? (
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
        )}
      </div>
    </>
  );
}
