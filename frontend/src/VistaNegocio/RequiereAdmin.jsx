import React, { useState } from 'react';
import { leerTokenAdmin } from '../services/api';
import AdminLogin from './AdminLogin';
import { MODO_DUENO, guardarModo } from '../utils/modoEmpleado';

// Portero del panel: mientras no haya token de admin guardado, muestra el login en vez
// de las rutas de /admin. El token no vence solo, así que una vez logueado no vuelve
// a pedir la contraseña hasta que alguien cierre sesión a mano.
//
// Entrar con credenciales siempre deja el panel en modo dueño. Eso hace cumplir las
// dos reglas del modo empleado de una sola vez: no se entra al sistema sin contraseña,
// y la única forma de recuperar el modo dueño es volver a tipearla.
export default function RequiereAdmin({ children }) {
  const [autenticado, setAutenticado] = useState(!!leerTokenAdmin());

  if (!autenticado) {
    return (
      <AdminLogin
        onIngreso={() => {
          guardarModo(MODO_DUENO);
          setAutenticado(true);
        }}
      />
    );
  }
  return children;
}
