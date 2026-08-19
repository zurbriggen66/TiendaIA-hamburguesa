import React, { useState } from 'react';
import api, { guardarToken } from '../services/api';

export default function CuentaModal({ onClose, onIngreso }) {
  const [modo, setModo] = useState('login');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const esRegistro = modo === 'registro';

  const enviar = async (e) => {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const url = esRegistro ? '/clientes/registro/' : '/clientes/login/';
      const datos = esRegistro
        ? { nombre: nombre.trim(), email: email.trim(), telefono: telefono.trim(), password }
        : { email: email.trim(), password };
      const { data } = await api.post(url, datos);
      guardarToken(data.token);
      onIngreso(data.cliente);
      onClose();
    } catch (err) {
      const d = err.response?.data;
      // El backend devuelve {detail} o {campo: [errores]}; mostramos el primero que haya.
      setError(d?.detail || Object.values(d || {}).flat()[0] || 'No se pudo completar. Probá de nuevo.');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{esRegistro ? 'Crear mi cuenta' : 'Ingresar'}</h3>
          <button type="button" className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="tabs-bar">
          <button type="button" className={`tab-boton ${!esRegistro ? 'tab-activo' : ''}`} onClick={() => { setModo('login'); setError(''); }}>
            Ya tengo cuenta
          </button>
          <button type="button" className={`tab-boton ${esRegistro ? 'tab-activo' : ''}`} onClick={() => { setModo('registro'); setError(''); }}>
            Registrarme
          </button>
        </div>

        <form onSubmit={enviar}>
          {esRegistro && (
            <>
              <p className="aviso-envio">Sumá puntos con cada compra y canjealos por descuento.</p>
              <div className="form-group">
                <label className="form-label">Tu nombre</label>
                <input type="text" className="input-vibrante" value={nombre} onChange={(e) => setNombre(e.target.value)} required autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input type="tel" className="input-vibrante" value={telefono} onChange={(e) => setTelefono(e.target.value)} />
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Email</label>
            <input type="email" className="input-vibrante" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus={!esRegistro} />
          </div>

          <div className="form-group">
            <label className="form-label">Contraseña</label>
            <input type="password" className="input-vibrante" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          {error && <p className="cuenta-error">{error}</p>}

          <div className="modal-actions">
            <button type="submit" className="btn-vibrante" disabled={enviando} style={{ width: '100%' }}>
              {enviando ? 'Un momento...' : esRegistro ? 'Crear cuenta' : 'Ingresar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
