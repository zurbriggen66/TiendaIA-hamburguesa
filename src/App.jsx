import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Inicio from './VistaCliente/Inicio';
import Dashboard from './VistaNegocio/Dashboard/Dashboard';
import DashboardLayout from './VistaNegocio/DashboardLayout';
import ProductosPage from './VistaNegocio/Productos/ProductosPage';
import PedidosPage from './VistaNegocio/Pedidos/PedidosPage';
import GastosPage from './VistaNegocio/Gastos/GastosPage';
import EstadisticasPage from './VistaNegocio/Estadisticas/EstadisticasPage';
import CombosPage from './VistaNegocio/Combos/CombosPage';
import ImpresionPage from './VistaNegocio/Impresion/ImpresionPage';
import AntojoConfigPage from './VistaNegocio/Antojo/AntojoConfigPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/admin" element={<DashboardLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="productos" element={<ProductosPage />} />
          <Route path="pedidos" element={<PedidosPage />} />
          <Route path="gastos" element={<GastosPage />} />
          <Route path="estadisticas" element={<EstadisticasPage />} />
          <Route path="combos" element={<CombosPage />} />
          <Route path="impresion" element={<ImpresionPage />} />
          <Route path="antojo" element={<AntojoConfigPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;