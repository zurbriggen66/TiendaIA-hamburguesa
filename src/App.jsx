import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Inicio from './VistaCliente/Inicio';
import Dashboard from './VistaNegocio/Dashboard/Dashboard';
import DashboardLayout from './VistaNegocio/DashboardLayout';
import RequiereAdmin from './VistaNegocio/RequiereAdmin';
import InicioPage from './VistaNegocio/Inicio/Inicio';
import ProductosPage from './VistaNegocio/Productos/ProductosPage';
import PedidosPage from './VistaNegocio/Pedidos/PedidosPage';
import GastosPage from './VistaNegocio/Gastos/GastosPage';
import EstadisticasPage from './VistaNegocio/Estadisticas/EstadisticasPage';
import CombosPage from './VistaNegocio/Combos/CombosPage';
import ImpresionPage from './VistaNegocio/Impresion/ImpresionPage';
import AntojoConfigPage from './VistaNegocio/Antojo/AntojoConfigPage';
import CobranzasPage from './VistaNegocio/Cobranzas/CobranzasPage';
import ClientesPage from './VistaNegocio/Clientes/ClientesPage';
import CajasPage from './VistaNegocio/Cajas/CajasPage';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/producto/:id" element={<Inicio />} />
        <Route path="/admin" element={<RequiereAdmin><DashboardLayout /></RequiereAdmin>}>
          <Route index element={<Dashboard />} />
          <Route path="inicio" element={<InicioPage />} />
          <Route path="cajas" element={<CajasPage />} />
          <Route path="productos" element={<ProductosPage />} />
          <Route path="pedidos" element={<PedidosPage />} />
          <Route path="gastos" element={<GastosPage />} />
          <Route path="estadisticas" element={<EstadisticasPage />} />
          <Route path="combos" element={<CombosPage />} />
          <Route path="impresion" element={<ImpresionPage />} />
          <Route path="antojo" element={<AntojoConfigPage />} />
          <Route path="cobranzas" element={<CobranzasPage />} />
          <Route path="clientes" element={<ClientesPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;