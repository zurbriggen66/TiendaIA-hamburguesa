import React, { useEffect, useState } from 'react';
import api, { guardarToken } from '../services/api';

const formatearPrecio = (v) =>
  new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0 }).format(v);

export default function CuentaModal({ onClose, onIngreso }) {
  const [modo, setModo] = useState('registro');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(null);
  const [config, setConfig] = useState({ pesos_por_punto: 100, valor_punto: 1 });

  const esRegistro = modo === 'registro';

  // Los números reales del programa: prometer "1 punto cada $100" cuando el dueño
  // configuró otra cosa sería mentirle al cliente en la cara.
  useEffect(() => {
    api.get('/configuracion/')
      .then((res) => {
        const c = res.data?.[res.data.length - 1];
        if (c) setConfig({ pesos_por_punto: c.pesos_por_punto ?? 100, valor_punto: c.valor_punto ?? 1 });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const alPresionar = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', alPresionar);
    return () => document.removeEventListener('keydown', alPresionar);
  }, [onClose]);

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
      // Momento de recompensa: se muestra la bienvenida antes de cerrar, así el
      // registro no termina en un modal que desaparece sin decir nada.
      setExito(data.cliente);
      setTimeout(() => { onIngreso(data.cliente); onClose(); }, 1900);
    } catch (err) {
      const d = err.response?.data;
      setError(d?.detail || Object.values(d || {}).flat()[0] || 'No se pudo completar. Probá de nuevo.');
      setEnviando(false);
    }
  };

  if (exito) {
    return (
      <div className="cuenta-fondo" onClick={onClose}>
        <div className="cuenta-card cuenta-card-exito" onClick={(e) => e.stopPropagation()}>
          <div className="cuenta-estrella-grande">⭐</div>
          <h3>¡Listo, {(exito.nombre || '').split(' ')[0]}!</h3>
          <p className="cuenta-exito-texto">
            {exito.puntos > 0
              ? <>Ya tenés <strong>{exito.puntos} puntos</strong> esperándote.</>
              : <>Desde tu próxima compra empezás a sumar puntos.</>}
          </p>
          <div className="cuenta-confeti" aria-hidden="true">
            {['🍔', '⭐', '🎁', '⭐', '🍟'].map((emoji, i) => (
              <span key={i} style={{ '--i': i }}>{emoji}</span>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cuenta-fondo" onClick={onClose}>
      <div className="cuenta-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="cuenta-cerrar" onClick={onClose} aria-label="Cerrar">✕</button>

        {/* El beneficio va primero: el formulario solo no vende nada. */}
        <div className="cuenta-encabezado">
          <span className="cuenta-emoji">🍔</span>
          <h3>Sumá puntos con cada compra</h3>
          <p>
            Cada {formatearPrecio(config.pesos_por_punto)} de compra = <strong>1 punto</strong>.
            Después los canjeás por descuento o premios.
          </p>
        </div>

        <div className="cuenta-pasos" aria-hidden="true">
          <div className="cuenta-paso"><span>🛒</span><small>Comprás</small></div>
          <div className="cuenta-flecha">→</div>
          <div className="cuenta-paso"><span>⭐</span><small>Sumás</small></div>
          <div className="cuenta-flecha">→</div>
          <div className="cuenta-paso"><span>🎁</span><small>Canjeás</small></div>
        </div>

        <div className="cuenta-tabs">
          <button
            type="button"
            className={esRegistro ? 'cuenta-tab-activa' : ''}
            onClick={() => { setModo('registro'); setError(''); }}
          >
            Crear cuenta
          </button>
          <button
            type="button"
            className={!esRegistro ? 'cuenta-tab-activa' : ''}
            onClick={() => { setModo('login'); setError(''); }}
          >
            Ya tengo
          </button>
        </div>

        <form onSubmit={enviar} className="cuenta-form">
          {esRegistro && (
            <>
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

          <button type="submit" className="btn-vibrante cuenta-btn" disabled={enviando}>
            {enviando ? 'Un momento...' : esRegistro ? 'Crear mi cuenta' : 'Ingresar'}
          </button>

          <p className="cuenta-pie">Es gratis y te lleva 20 segundos.</p>
        </form>
      </div>
    </div>
  );
}
