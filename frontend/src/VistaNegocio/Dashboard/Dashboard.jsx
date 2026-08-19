import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import api from '../../services/api';

function CampoColor({ label, value, onChange }) {
  return (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <div className="color-picker-fila">
        <input
          type="color"
          className="color-picker-swatch"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <input
          type="text"
          className="input-vibrante"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#000000"
        />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [logo, setLogo] = useState(null);
  const [logoPrecarga, setLogoPrecarga] = useState(null);
  const [portada, setPortada] = useState(null);
  const [qrCarta, setQrCarta] = useState(null);

  // Guardamos el ID para saber si tenemos que actualizar (PATCH) o crear (POST)
  const [configId, setConfigId] = useState(null);
  const [logoActivo, setLogoActivo] = useState(null);
  const [logoPrecargaActivo, setLogoPrecargaActivo] = useState(null);
  const [portadaActiva, setPortadaActiva] = useState(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');
  const [colorNavbar, setColorNavbar] = useState('#0d2b23');
  const [colorFondo, setColorFondo] = useState('#0d2b23');
  const [colorSuperficie, setColorSuperficie] = useState('#163a30');
  const [colorAcento, setColorAcento] = useState('#e8630c');
  const [colorBotonAgregar, setColorBotonAgregar] = useState('#ffc700');

  // Traer las imágenes activas y el ID al cargar el panel
  useEffect(() => {
    const obtenerDatos = async () => {
      try {
        const respuesta = await api.get('/configuracion/');
        if (respuesta.data && respuesta.data.length > 0) {
          const ultimaConfig = respuesta.data[respuesta.data.length - 1];
          setConfigId(ultimaConfig.id); // ¡Guardamos el ID del registro!
          setLogoActivo(ultimaConfig.logo);
          setLogoPrecargaActivo(ultimaConfig.logo_precarga);
          setPortadaActiva(ultimaConfig.imagen_principal);
          setWhatsapp(ultimaConfig.whatsapp || '');
          setInstagram(ultimaConfig.instagram || '');
          setColorNavbar(ultimaConfig.color_navbar || '#0d2b23');
          setColorFondo(ultimaConfig.color_fondo || '#0d2b23');
          setColorSuperficie(ultimaConfig.color_superficie || '#163a30');
          setColorAcento(ultimaConfig.color_acento || '#e8630c');
          setColorBotonAgregar(ultimaConfig.color_boton_agregar || '#ffc700');
        }
      } catch (error) {
        console.error("Error al cargar el panel:", error);
      }
    };
    obtenerDatos();
  }, []);

  // El QR apunta a la tienda tal cual se ve desde afuera (mismo dominio donde
  // se está viendo este panel), directo a la sección del menú.
  useEffect(() => {
    QRCode.toDataURL(`${window.location.origin}/#menu`, {
      width: 480,
      margin: 2,
      color: { dark: '#0d2b23', light: '#ffffff' },
    })
      .then(setQrCarta)
      .catch((error) => console.error('Error al generar el QR de la carta:', error));
  }, []);

  const descargarQr = () => {
    if (!qrCarta) return;
    const enlace = document.createElement('a');
    enlace.href = qrCarta;
    enlace.download = 'carta-qr.png';
    enlace.click();
  };

  const prevenirNavegador = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDropLogo = (e) => {
    prevenirNavegador(e);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setLogo(e.dataTransfer.files[0]);
  };

  const handleDropLogoPrecarga = (e) => {
    prevenirNavegador(e);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setLogoPrecarga(e.dataTransfer.files[0]);
  };

  const handleDropPortada = (e) => {
    prevenirNavegador(e);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setPortada(e.dataTransfer.files[0]);
  };

  const guardarCambios = async (e) => {
    e.preventDefault();

    const formData = new FormData();
    if (logo) formData.append('logo', logo);
    if (logoPrecarga) formData.append('logo_precarga', logoPrecarga);
    if (portada) formData.append('imagen_principal', portada);
    formData.append('whatsapp', whatsapp);
    formData.append('instagram', instagram);
    formData.append('color_navbar', colorNavbar);
    formData.append('color_fondo', colorFondo);
    formData.append('color_superficie', colorSuperficie);
    formData.append('color_acento', colorAcento);
    formData.append('color_boton_agregar', colorBotonAgregar);

    try {
      if (configId) {
        // Si ya existe un registro, usamos PATCH para actualizar solo ese ID y no crear duplicados
        await api.patch(`/configuracion/${configId}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        // Si no existe ninguno previo, usamos POST para crear el primero
        await api.post('/configuracion/', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      alert('¡Imágenes guardadas y actualizadas con éxito!');
      window.location.reload(); 
    } catch (error) {
      console.error("Error al guardar:", error);
      alert('Hubo un problema al guardar las imágenes.');
    }
  };

  // Lógica para previsualizar: si recién cargó un archivo, muestra ese. Si no, muestra el de la base de datos.
  const previewLogo = logo ? URL.createObjectURL(logo) : logoActivo;
  const previewLogoPrecarga = logoPrecarga ? URL.createObjectURL(logoPrecarga) : logoPrecargaActivo;
  const previewPortada = portada ? URL.createObjectURL(portada) : portadaActiva;

  return (
    <>
      <header className="main-header">
        <h2>Diseño del Sitio</h2>
        <div className="avatar">A</div>
      </header>

      <div className="scroll-area">
        <div className="form-card">
          <h3 className="form-card-title">Configuración Visual</h3>

          <form onSubmit={guardarCambios}>

            {/* Input de Logo */}
            <div className="form-group">
                <label className="form-label">Logo del negocio</label>
                <label 
                  className="upload-box upload-box-vibrante"
                  onDragOver={prevenirNavegador}
                  onDrop={handleDropLogo}
                >
                  {/* AQUÍ MOSTRAMOS LA IMAGEN EN VEZ DEL ÍCONO */}
                  {previewLogo ? (
                    <img src={previewLogo} alt="Preview Logo" className="upload-preview" />
                  ) : (
                    <div className="upload-icon">📁</div>
                  )}
                  
                  <p className="upload-text">
                    {logo ? (
                      <span className="upload-file-name">{logo.name}</span>
                    ) : (
                      <><span className="upload-link">Cargar archivo</span> o arrastrar y soltar</>
                    )}
                  </p>
                  <p className="upload-hint">PNG o JPG (500x500px)</p>
                  
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    className="input-file-hidden"
                    onChange={(e) => {
                      if(e.target.files && e.target.files[0]) setLogo(e.target.files[0]);
                    }}
                  />
                </label>
              </div>

              {/* Input de Logo de la pantalla de carga */}
              <div className="form-group">
                <label className="form-label">Imagen de la pantalla de carga</label>
                <label
                  className="upload-box upload-box-vibrante"
                  onDragOver={prevenirNavegador}
                  onDrop={handleDropLogoPrecarga}
                >
                  {previewLogoPrecarga ? (
                    <img src={previewLogoPrecarga} alt="Preview logo de carga" className="upload-preview" />
                  ) : (
                    <div className="upload-icon">📁</div>
                  )}

                  <p className="upload-text">
                    {logoPrecarga ? (
                      <span className="upload-file-name">{logoPrecarga.name}</span>
                    ) : (
                      <><span className="upload-link">Cargar archivo</span> o arrastrar y soltar</>
                    )}
                  </p>
                  <p className="upload-hint">
                    PNG sin fondo recomendado. Es lo primero que ve el cliente al entrar a la tienda.
                  </p>

                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    className="input-file-hidden"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) setLogoPrecarga(e.target.files[0]);
                    }}
                  />
                </label>
              </div>

              {/* Input de Portada */}
              <div className="form-group">
                <label className="form-label">Imagen principal (Portada)</label>
                <label 
                  className="upload-box upload-box-vibrante"
                  onDragOver={prevenirNavegador}
                  onDrop={handleDropPortada}
                >
                  {/* AQUÍ MOSTRAMOS LA IMAGEN DE PORTADA */}
                  {previewPortada ? (
                    <img src={previewPortada} alt="Preview Portada" className="upload-preview upload-preview-portada" />
                  ) : (
                    <div className="upload-icon">🖼️</div>
                  )}

                  <p className="upload-text">
                    {portada ? (
                      <span className="upload-file-name">{portada.name}</span>
                    ) : (
                      <><span className="upload-link">Cargar archivo</span> o arrastrar y soltar</>
                    )}
                  </p>
                  <p className="upload-hint">Recomendado: 1920x1080px</p>
                  
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="input-file-hidden"
                    onChange={(e) => {
                      if(e.target.files && e.target.files[0]) setPortada(e.target.files[0]);
                    }}
                  />
                </label>
              </div>

              {/* Colores de la vista del cliente */}
              <div className="form-group">
                <label className="form-label">Colores de la tienda</label>
                <p className="form-ayuda" style={{ marginTop: 0, marginBottom: 14 }}>
                  Así se ve hoy tu tienda. Cambiá cualquier color y guardá para aplicarlo.
                </p>
                <div className="colores-grid">
                  <CampoColor label="Fondo del navbar" value={colorNavbar} onChange={setColorNavbar} />
                  <CampoColor label="Fondo de la página" value={colorFondo} onChange={setColorFondo} />
                  <CampoColor label="Tarjetas de producto" value={colorSuperficie} onChange={setColorSuperficie} />
                  <CampoColor label="Botón &quot;Agregar al pedido&quot;" value={colorBotonAgregar} onChange={setColorBotonAgregar} />
                  <CampoColor label="Color de acento (detalles, degradés)" value={colorAcento} onChange={setColorAcento} />
                </div>
              </div>

              {/* Contacto */}
              <div className="form-group">
                <label className="form-label">WhatsApp (con código de país, sin espacios)</label>
                <input
                  type="text"
                  className="input-vibrante"
                  placeholder="5493544400993"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Instagram (URL del perfil)</label>
                <input
                  type="text"
                  className="input-vibrante"
                  placeholder="https://www.instagram.com/antojoburger_/"
                  value={instagram}
                  onChange={(e) => setInstagram(e.target.value)}
                />
              </div>

              <div className="form-actions-right">
                <button type="submit" className="btn-vibrante">
                  Guardar Cambios
                </button>
              </div>
            </form>
        </div>

        <div className="form-card qr-carta-card">
          <h3 className="form-card-title">Carta QR para el local</h3>
          <p className="qr-carta-texto">
            Imprimí este código y ponelo en las mesas: quien lo escanee entra directo al menú de la tienda,
            sin buscar nada. Sirve para pedir sentado en el local o para llevarse la carta a casa.
          </p>
          <div className="qr-carta-cuerpo">
            {qrCarta ? (
              <img src={qrCarta} alt="Código QR de la carta" className="qr-carta-imagen" />
            ) : (
              <div className="qr-carta-imagen qr-carta-cargando">Generando...</div>
            )}
            <button type="button" className="btn-vibrante" onClick={descargarQr} disabled={!qrCarta}>
              Descargar QR
            </button>
          </div>
        </div>
      </div>
    </>
  );
}