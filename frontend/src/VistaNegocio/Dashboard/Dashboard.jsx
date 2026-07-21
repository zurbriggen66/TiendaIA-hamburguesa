import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Dashboard() {
  const [logo, setLogo] = useState(null);
  const [portada, setPortada] = useState(null);
  
  // Guardamos el ID para saber si tenemos que actualizar (PATCH) o crear (POST)
  const [configId, setConfigId] = useState(null);
  const [logoActivo, setLogoActivo] = useState(null);
  const [portadaActiva, setPortadaActiva] = useState(null);

  // Traer las imágenes activas y el ID al cargar el panel
  useEffect(() => {
    const obtenerDatos = async () => {
      try {
        const respuesta = await axios.get('http://127.0.0.1:8000/api/configuracion/');
        if (respuesta.data && respuesta.data.length > 0) {
          const ultimaConfig = respuesta.data[respuesta.data.length - 1];
          setConfigId(ultimaConfig.id); // ¡Guardamos el ID del registro!
          setLogoActivo(ultimaConfig.logo);
          setPortadaActiva(ultimaConfig.imagen_principal);
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

    try {
      if (configId) {
        // Si ya existe un registro, usamos PATCH para actualizar solo ese ID y no crear duplicados
        await axios.patch(`http://127.0.0.1:8000/api/configuracion/${configId}/`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        // Si no existe ninguno previo, usamos POST para crear el primero
        await axios.post('http://127.0.0.1:8000/api/configuracion/', formData, {
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
          <h3 style={{marginBottom: '24px', color: '#111827'}}>Configuración Visual</h3>

          <form onSubmit={guardarCambios}>

            {/* Input de Logo */}
            <div className="form-group">
                <label className="form-label">Logo del negocio</label>
                <label 
                  className="upload-box" 
                  style={{display: 'block'}}
                  onDragOver={prevenirNavegador}
                  onDrop={handleDropLogo}
                >
                  {/* AQUÍ MOSTRAMOS LA IMAGEN EN VEZ DEL ÍCONO */}
                  {previewLogo ? (
                    <img src={previewLogo} alt="Preview Logo" style={{ maxHeight: '100px', objectFit: 'contain', marginBottom: '12px' }} />
                  ) : (
                    <div className="upload-icon">📁</div>
                  )}
                  
                  <p className="upload-text">
                    {logo ? (
                      <span style={{color: '#10b981', fontWeight: 'bold'}}>{logo.name}</span>
                    ) : (
                      <><span className="upload-link">Cargar archivo</span> o arrastrar y soltar</>
                    )}
                  </p>
                  <p style={{fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px'}}>PNG o JPG (500x500px)</p>
                  
                  <input 
                    type="file" 
                    accept="image/png, image/jpeg" 
                    style={{display: 'none'}} 
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
                  className="upload-box" 
                  style={{display: 'block'}}
                  onDragOver={prevenirNavegador}
                  onDrop={handleDropPortada}
                >
                  {/* AQUÍ MOSTRAMOS LA IMAGEN DE PORTADA */}
                  {previewPortada ? (
                    <img src={previewPortada} alt="Preview Portada" style={{ maxHeight: '120px', width: '100%', objectFit: 'cover', borderRadius: '4px', marginBottom: '12px' }} />
                  ) : (
                    <div className="upload-icon">🖼️</div>
                  )}

                  <p className="upload-text">
                    {portada ? (
                      <span style={{color: '#10b981', fontWeight: 'bold'}}>{portada.name}</span>
                    ) : (
                      <><span className="upload-link">Cargar archivo</span> o arrastrar y soltar</>
                    )}
                  </p>
                  <p style={{fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px'}}>Recomendado: 1920x1080px</p>
                  
                  <input 
                    type="file" 
                    accept="image/*" 
                    style={{display: 'none'}} 
                    onChange={(e) => {
                      if(e.target.files && e.target.files[0]) setPortada(e.target.files[0]);
                    }}
                  />
                </label>
              </div>

              <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '32px'}}>
                <button type="submit" className="btn-guardar">
                  Guardar Cambios
                </button>
              </div>
            </form>
        </div>
      </div>
    </>
  );
}