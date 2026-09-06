import React, { useEffect, useState } from 'react';
import { quitarToast, suscribirToasts } from '../utils/toast';

// Cada tipo va con ícono además del color: el color solo no alcanza para alguien que
// no distingue rojo de verde, y en una cocina la pantalla se mira de reojo.
const ICONOS = { exito: '✅', error: '⚠️', alerta: '🔔', info: 'ℹ️' };

export default function Toasts() {
  const [lista, setLista] = useState([]);

  useEffect(() => suscribirToasts(setLista), []);

  if (lista.length === 0) return null;

  return (
    <div className="toasts" aria-live="polite">
      {lista.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.tipo}`}
          // Un error interrumpe al lector de pantalla; un aviso común espera su turno.
          role={t.tipo === 'error' ? 'alert' : 'status'}
        >
          <span className="toast-icono" aria-hidden="true">{ICONOS[t.tipo] || 'ℹ️'}</span>
          <span className="toast-mensaje">{t.mensaje}</span>
          <button
            type="button"
            className="toast-cerrar"
            onClick={() => quitarToast(t.id)}
            aria-label="Cerrar aviso"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}
