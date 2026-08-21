import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useReveal } from '../utils/useReveal';

const formatearPrecio = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(v);

// La sección toma la forma de la comanda que el local imprime: papel, corte dentado,
// tipografía de impresora térmica. Es el objeto que el cliente ya conoce de la marca,
// así que el programa de puntos se lee como algo del negocio y no como un banner.
export default function Premios({ cliente, onRegistrarse }) {
  const [premios, setPremios] = useState([]);
  const [pesosPorPunto, setPesosPorPunto] = useState(100);
  const [ref, visible] = useReveal();

  useEffect(() => {
    api.get('/recompensas/')
      .then((res) => setPremios((res.data || []).filter((r) => r.activa)))
      .catch(() => setPremios([]));
    api.get('/configuracion/')
      .then((res) => {
        const c = res.data?.[res.data.length - 1];
        if (c?.pesos_por_punto) setPesosPorPunto(c.pesos_por_punto);
      })
      .catch(() => {});
  }, []);

  // Sin premios cargados no hay nada que prometer: la sección no existe.
  if (premios.length === 0) return null;

  const puntos = cliente?.puntos ?? 0;

  return (
    <section className="premios" id="premios">
      <div ref={ref} className={`premios-ticket reveal ${visible ? 'reveal-visible' : ''}`}>
        <div className="premios-encabezado">
          <span className="premios-eyebrow">Programa de puntos</span>
          <h2 className="premios-titulo fuente-impacto">Lo que te llevás gratis</h2>
          <p className="premios-bajada">
            {cliente
              ? <>Tenés <strong>{puntos} {puntos === 1 ? 'punto' : 'puntos'}</strong> para gastar.</>
              : <>Cada {formatearPrecio(pesosPorPunto)} de compra es 1 punto. Juntalos y canjealos por esto.</>}
          </p>
        </div>

        <ul className="premios-lista">
          {premios.map((premio) => {
            const alcanza = cliente && puntos >= premio.puntos;
            const faltan = premio.puntos - puntos;
            return (
              <li key={premio.id} className={`premios-fila ${alcanza ? 'premios-fila-lista' : ''}`}>
                <span className="premios-nombre">{premio.nombre}</span>
                <span className="premios-puntos-linea" aria-hidden="true" />
                <span className="premios-puntos">
                  {premio.puntos} pts
                  {cliente && (
                    <small className={alcanza ? 'premios-estado-ok' : 'premios-estado'}>
                      {alcanza ? 'ya podés' : `faltan ${faltan}`}
                    </small>
                  )}
                </span>
              </li>
            );
          })}
        </ul>

        {!cliente && (
          <div className="premios-pie">
            <button type="button" className="btn-vibrante premios-cta" onClick={onRegistrarse}>
              Crear mi cuenta
            </button>
            <span className="premios-pie-nota">Gratis, con tu email.</span>
          </div>
        )}

        {cliente && (
          <p className="premios-pie-nota premios-pie-nota-sola">
            Elegís el premio al final, en el carrito.
          </p>
        )}
      </div>
    </section>
  );
}
