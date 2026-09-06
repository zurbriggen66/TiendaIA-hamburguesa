import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { aplicarTema, leerTema } from './utils/tema.js'

// Antes del primer render: si se aplicara dentro de un efecto, la pantalla arrancaría
// en oscuro y pegaría un flash blanco al montar el panel en modo claro.
aplicarTema(leerTema())

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
