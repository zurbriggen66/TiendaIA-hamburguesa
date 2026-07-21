import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Inicio from './VistaCliente/Inicio';
import Dashboard from './VistaNegocio/Dashboard/Dashboard';
import DashboardLayout from './VistaNegocio/DashboardLayout';
import ProductosPage from './VistaNegocio/Productos/ProductosPage';
import PedidosPage from './VistaNegocio/Pedidos/PedidosPage';
import GastosPage from './VistaNegocio/Gastos/GastosPage';

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
        </Route>
      </Routes>
    </Router>
  );
}

export default App;