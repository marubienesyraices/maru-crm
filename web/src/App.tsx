import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/Login/LoginPage';
import Verify2FAPage from './pages/Verify2FA/Verify2FAPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import PropertiesListPage from './pages/Properties/PropertiesListPage';
import PropertyFormPage from './pages/Properties/PropertyFormPage';
import PropertyDetailPage from './pages/Properties/PropertyDetailPage';
import ClientsListPage from './pages/Clients/ClientsListPage';
import ClientFormPage from './pages/Clients/ClientFormPage';
import ClientDetailPage from './pages/Clients/ClientDetailPage';
import PipelinePage from './pages/Pipeline/PipelinePage';
import AdminTenantsPage from './pages/Admin/AdminTenantsPage';
import AdminUsersPage from './pages/Admin/AdminUsersPage';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-2fa" element={<Verify2FAPage />} />

        {/* Authenticated routes with shared sidebar layout */}
        <Route
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/propiedades" element={<PropertiesListPage />} />
          <Route path="/propiedades/nueva" element={<PropertyFormPage />} />
          <Route path="/propiedades/:id" element={<PropertyDetailPage />} />
          <Route path="/propiedades/:id/editar" element={<PropertyFormPage />} />
          <Route path="/clientes" element={<ClientsListPage />} />
          <Route path="/clientes/nuevo" element={<ClientFormPage />} />
          <Route path="/clientes/:id" element={<ClientDetailPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/admin/empresas" element={<AdminTenantsPage />} />
          <Route path="/admin/usuarios" element={<AdminUsersPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
