import React, { useEffect, useState } from 'react';
import api from '../services/api';

const formatearPrecio = (precio) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(precio);

const calcularFaltante = () => {
  const ahora = new Date();
  const medianoche = new Date(ahora);
  medianoche.setHours(24, 0, 0, 0);
  const ms = medianoche.getTime() - ahora.getTime();
  const horas = Math.floor(ms / 3_600_000);
  const minutos = Math.floor((ms % 3_600_000) / 60_000);
  const segundos = Math.floor((ms % 60_000) / 1_000);
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}:${String(segundos).padStart(2, '0')}`;
};

export default function AntojoDelDia({ onAgregar }) {
  const [antojo, setAntojo] = useState(null);
  const [faltante, setFaltante] = useState(calcularFaltante());

  useEffect(() => {
    api.get('/antojo-del-dia/')
      .then((res) => setAntojo(res.data))
      .catch((error) => console.error('Error al cargar el antojo del día:', error));
  }, []);

  useEffect(() => {
    const intervalo = setInterval(() => setFaltante(calcularFaltante()), 1000);
    return () => clearInterval(intervalo);
  }, []);

  if (!antojo) return null;

  const { producto } = antojo;

  const agregar = () => {
    onAgregar({ ...producto, precio: antojo.precio_con_descuento }, 1);
  };

  return (
    <section className="antojo-dia">
      <div className="antojo-dia-imagen">
        {producto.imagen ? (
          <img src={producto.imagen} alt={producto.nombre} />
        ) : (
          <div className="menu-card-imagen-placeholder">🍔</div>
        )}
      </div>

      <div className="antojo-dia-info">
        <span className="antojo-dia-titulo">🔥 Antojo del día</span>
        <h3>{producto.nombre}</h3>
        {producto.descripcion && <p className="antojo-dia-descripcion">{producto.descripcion}</p>}

        <div className="antojo-dia-precios">
          <span className="antojo-dia-precio-original">{formatearPrecio(antojo.precio_original)}</span>
          <span className="antojo-dia-precio-descuento">{formatearPrecio(antojo.precio_con_descuento)}</span>
          <span className="antojo-dia-badge-descuento">-{antojo.descuento_pct}%</span>
        </div>

        <div className="antojo-dia-footer">
          <div className="antojo-dia-cuenta-regresiva">
            <span>Termina en</span>
            <strong>{faltante}</strong>
          </div>
          <button type="button" className="btn-vibrante" onClick={agregar}>
            Agregar al pedido
          </button>
        </div>
      </div>
    </section>
  );
}
