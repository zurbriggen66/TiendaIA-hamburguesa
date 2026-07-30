import React, { useState, useEffect } from 'react';
import api from '../../services/api';

export default function Dashboard() {
  const [logo, setLogo] = useState(null);
  const [portada, setPortada] = useState(null);
  
  // Guardamos el ID para saber si tenemos que actualizar (PATCH) o crear (POST)
  const [configId, setConfigId] = useState(null);
  const [logoActivo, setLogoActivo] = useState(null);
  const [portadaActiva, setPortadaActiva] = useState(null);
  const [whatsapp, setWhatsapp] = useState('');
  const [instagram, setInstagram] = useState('');

  // Traer las imágenes activas y el ID al cargar el panel
  useEffect(() => {
    const obtenerDatos = async () => {
      try {
        const respuesta = await api.get('/configuracion/');
        if (respuesta.data && respuesta.data.length > 0) {
          const ultimaConfig = respuesta.data[respuesta.data.length - 1];
          setConfigId(ultimaConfig.id); // ¡Guardamos el ID del registro!
          setLogoActivo(ultimaConfig.logo);
          setPortadaActiva(ultimaConfig.imagen_principal);
          setWhatsapp(ultimaConfig.whatsapp || '');
          setInstagram(ultimaConfig.instagram || '');
        }
      } catch (error) {
        console.error("Error al cargar el panel:", error);
      }
    };
    obtenerDatos();
  }, []);

  const prevenirNavegador = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDropLogo = (e) => {
    prevenirNavegador(e);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setLogo(e.dataTransfer.files[0]);
  };

  const handleDropPortada = (e) => {
    prevenirNavegador(e);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) setPortada(e.dataTransfer.files[0]);
  };

  const guardarCambios = async (e) => {
    e.preventDefault();
    if (!logo && !portada && !configId) {
      alert("Por favor, selecciona al menos una imagen antes de guardar.");
      return;
    }

    const formData = new FormData();
    if (logo) formData.append('logo', logo);
    if (portada) formData.append('imagen_principal', portada);
    formData.append('whatsapp', whatsapp);
    formData.append('instagram', instagram);

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
      </div>
    </>
  );
}