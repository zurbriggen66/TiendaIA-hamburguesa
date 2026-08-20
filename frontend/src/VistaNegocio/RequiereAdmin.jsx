import React, { useState } from 'react';
import { leerTokenAdmin } from '../services/api';
import AdminLogin from './AdminLogin';

// Portero del panel: mientras no haya token de admin guardado, muestra el login en vez
// de las rutas de /admin. El token no vence solo, así que una vez logueado no vuelve
// a pedir la contraseña hasta que alguien cierre sesión a mano.
export default function RequiereAdmin({ children }) {
  const [autenticado, setAutenticado] = useState(!!leerTokenAdmin());

  if (!autenticado) {
    return <AdminLogin onIngreso={() => setAutenticado(true)} />;
  }
  return children;
}
