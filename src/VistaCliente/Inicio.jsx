import React, { useState, useEffect } from 'react';
import axios from 'axios';

export default function Inicio() {
  // 1. Estado inicial con imágenes por defecto (por si falla internet o la base de datos está vacía)
  const [configuracion, setConfiguracion] = useState({
    logo: "https://cdn-icons-png.flaticon.com/512/3075/3075977.png",
    imagen_principal: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=80"
  });

  // 2. useEffect se ejecuta automáticamente cuando el cliente entra a la página
  useEffect(() => {
    const obtenerConfiguracion = async () => {
      try {
        const respuesta = await axios.get('http://127.0.0.1:8000/api/configuracion/');
        
        // Verificamos si hay al menos una configuración guardada en la base de datos
        if (respuesta.data && respuesta.data.length > 0) {
          // Tomamos la última configuración del array (la más reciente)
          const ultimaConfig = respuesta.data[respuesta.data.length - 1];
          
          setConfiguracion({
            // Usamos la imagen de la BD, si no existe (null), mantenemos la por defecto
            logo: ultimaConfig.logo || configuracion.logo,
            imagen_principal: ultimaConfig.imagen_principal || configuracion.imagen_principal
          });
        }
      } catch (error) {
        console.error("Error al cargar los datos del backend:", error);
      }
    };

    obtenerConfiguracion();
  }, []); // Los corchetes vacíos indican que esto se ejecuta solo una vez al cargar

  return (
    <div className="cliente-container">
      <header className="cliente-header">
        <span>Hamburguesería IA</span>
      </header>

      <main className="cliente-hero">
        <div 
          className="hero-background"
          style={{ backgroundImage: `url(${configuracion.imagen_principal})` }}
        >
          <div className="hero-overlay"></div>
        </div>

        <div className="logo-contenedor">
          <img 
            src={configuracion.logo} 
            alt="Logo Negocio" 
            className="logo-img"
          />
        </div>
      </main>

      <footer className="cliente-footer">
        <span>© 2026 - Todos los derechos reservados</span>
      </footer>
    </div>
  );
}