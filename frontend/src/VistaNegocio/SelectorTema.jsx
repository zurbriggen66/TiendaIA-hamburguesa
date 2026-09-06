import React, { useEffect, useRef, useState } from 'react';
import { TEMAS, escucharCambioDelSistema, guardarTema, leerTema } from '../utils/tema';

/**
 * Claro / Oscuro / Según el sistema, para el sidebar del panel.
 *
 * La preferencia vive en este dispositivo: la tablet del mostrador y el celular del
 * dueño pueden ir distintas. Los tickets impresos salen siempre en negro sobre blanco,
 * sin importar el tema.
 */
export default function SelectorTema() {
  const [tema, setTema] = useState(leerTema);

  // El ref evita resuscribirse en cada cambio: el listener del sistema se registra una
  // sola vez y siempre lee la preferencia actual.
  const temaRef = useRef(tema);
  temaRef.current = tema;
  useEffect(() => escucharCambioDelSistema(() => temaRef.current), []);

  const elegir = (valor) => {
    setTema(valor);
    guardarTema(valor);
  };

  return (
    <div className="selector-tema" role="group" aria-label="Apariencia del panel">
      {TEMAS.map((opcion) => (
        <button
          key={opcion.valor}
          type="button"
          className={`selector-tema-opcion${tema === opcion.valor ? ' selector-tema-activa' : ''}`}
          onClick={() => elegir(opcion.valor)}
          aria-pressed={tema === opcion.valor}
          title={opcion.etiqueta}
        >
          <span aria-hidden="true">{opcion.icono}</span>
          <span className="selector-tema-etiqueta">{opcion.etiqueta}</span>
        </button>
      ))}
    </div>
  );
}
