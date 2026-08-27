import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../services/api';
import {
  MODO_DUENO,
  MODO_EMPLEADO,
  PERMISOS_DEFAULT,
  SECCIONES,
  guardarModo,
  leerModo,
} from '../utils/modoEmpleado';

// Un único lugar donde vive el modo actual y la lista de permisos. Sin esto, el
// menú lateral, el guard de rutas e Inicio harían tres GET /configuracion/ en
// paralelo (el proyecto no tiene ningún contexto de configuración).
const ModoContext = createContext(null);

export function ModoProvider({ children }) {
  const [modo, setModo] = useState(leerModo);
  const [permisos, setPermisos] = useState(PERMISOS_DEFAULT);

  useEffect(() => {
    api.get('/configuracion/')
      .then((res) => {
        const ultima = res.data[res.data.length - 1];
        // El backend recorta permisos_empleado si el token no es de staff, así que
        // puede no venir; en ese caso quedan los defaults.
        if (Array.isArray(ultima?.permisos_empleado)) setPermisos(ultima.permisos_empleado);
      })
      .catch(() => {});
  }, []);

  const valor = useMemo(() => {
    const esEmpleado = modo === MODO_EMPLEADO;
    // En modo dueño no hay nada bloqueado: `puede` siempre da true.
    const puede = (clave) => !esEmpleado || permisos.includes(clave);
    return {
      modo,
      esEmpleado,
      permisos,
      puede,
      seccionesVisibles: SECCIONES.filter((s) => puede(s.clave)),
      entrarModoEmpleado: () => { guardarModo(MODO_EMPLEADO); setModo(MODO_EMPLEADO); },
      // Solo se llama después de un login válido contra /admin-login/ (ver
      // RequiereAdmin.jsx y el botón de volver del menú lateral).
      volverAModoDueno: () => { guardarModo(MODO_DUENO); setModo(MODO_DUENO); },
      // Para refrescar la lista sin recargar la página tras guardar la config.
      actualizarPermisos: setPermisos,
    };
  }, [modo, permisos]);

  return <ModoContext.Provider value={valor}>{children}</ModoContext.Provider>;
}

export function useModo() {
  const contexto = useContext(ModoContext);
  if (!contexto) throw new Error('useModo tiene que usarse dentro de <ModoProvider>');
  return contexto;
}
