import React, { useState } from 'react';
import api, { guardarTokenAdmin } from '../services/api';

export default function AdminLogin({ onIngreso }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const ingresar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const { data } = await api.post('/admin-login/', { usuario: usuario.trim(), password });
      guardarTokenAdmin(data.token);
      onIngreso();
    } catch (err) {
      // Solo un 401 es "datos incorrectos". Sin señal o con el servidor caído decía lo
      // mismo, y desde el celular parecía que la contraseña estaba mal.
      setError(err.response?.status === 401
        ? 'Usuario o contraseña incorrectos.'
        : 'No se pudo conectar con el servidor. Revisá la conexión y probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="admin-login-pantalla">
      <form className="admin-login-card" onSubmit={ingresar}>
        <div className="admin-login-logo">🍔 ANTOJO Admin</div>
        <h2 className="admin-login-titulo">Ingresar al panel</h2>

        <div className="form-group">
          <label className="form-label">Usuario</label>
          <input
            type="text"
            className="input-vibrante"
            value={usuario}
            onChange={(e) => setUsuario(e.target.value)}
            autoFocus
            autoComplete="username"
            // El teclado del celular ponía la primera letra en mayúscula ("Antojo").
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        <div className="form-group">
          <label className="form-label">Contraseña</label>
          <input
            type="password"
            className="input-vibrante"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && <p className="admin-login-error">{error}</p>}

        <button type="submit" className="btn-vibrante admin-login-boton" disabled={enviando}>
          {enviando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
