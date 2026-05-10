import * as Sentry from '@sentry/react';
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
import AgendaPage from './pages/Agenda/AgendaPage';
import PortalPage from './pages/Portal/PortalPage';
import PortalDetailPage from './pages/Portal/PortalDetailPage';
import PortalVerifyPage from './pages/Portal/PortalVerifyPage';
import PortalReprogramarPage from './pages/Portal/PortalReprogramarPage';
import AdminTenantsPage from './pages/Admin/AdminTenantsPage';
import AdminUsersPage from './pages/Admin/AdminUsersPage';
import ImportPage from './pages/Import/ImportPage';
import BiPage from './pages/BI/BiPage';
import RankingPage from './pages/Ranking/RankingPage';
import CampanasPage from './pages/Campanas/CampanasPage';
import MetaPage from './pages/Meta/MetaPage';
import HelpPage from './pages/Help/HelpPage';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import './index.css';

export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={<p style={{ padding: 32, color: 'red' }}>Error inesperado. Por favor recarga la página.</p>}>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-2fa" element={<Verify2FAPage />} />
        <Route path="/portal" element={<PortalPage />} />
        <Route path="/portal/verificar" element={<PortalVerifyPage />} />
        <Route path="/portal/reprogramar/:token" element={<PortalReprogramarPage />} />
        <Route path="/portal/:id" element={<PortalDetailPage />} />

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
          <Route path="/clientes/:id/editar" element={<ClientFormPage />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/bi" element={<BiPage />} />
          <Route path="/campanas" element={<CampanasPage />} />
          <Route path="/meta" element={<MetaPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/admin/empresas" element={<AdminTenantsPage />} />
          <Route path="/admin/usuarios" element={<AdminUsersPage />} />
          <Route path="/help" element={<HelpPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
    </Sentry.ErrorBoundary>
  );
}
