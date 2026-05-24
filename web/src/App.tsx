import * as Sentry from '@sentry/react';
import { type ReactNode } from 'react';
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
import AdminPlanesPage from './pages/Admin/AdminPlanesPage';
import ImportPage from './pages/Import/ImportPage';
import BiPage from './pages/BI/BiPage';
import RankingPage from './pages/Ranking/RankingPage';
import CampanasPage from './pages/Campanas/CampanasPage';
import MetaPage from './pages/Meta/MetaPage';
import HelpPage from './pages/Help/HelpPage';
import OnboardingPage from './pages/Onboarding/OnboardingPage';
import SettingsPortalPage from './pages/Settings/SettingsPortalPage';
import SettingsIntegracionesPage from './pages/Settings/SettingsIntegracionesPage';
import SettingsPerfilPage from './pages/Settings/SettingsPerfilPage';
import AppLayout from './components/AppLayout';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuthStore } from './stores/authStore';
import './index.css';

type PlanFeatureKey = 'tiene_campanas' | 'tiene_portal' | 'tiene_integraciones' | 'tiene_meta' | 'tiene_correo' | 'tiene_sitio_propio';

function PlanRoute({ feature, children }: { feature: PlanFeatureKey; children: ReactNode }) {
  const { plan, planFeatures } = useAuthStore();
  if (planFeatures && !planFeatures[feature]) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400, gap: 12, color: 'var(--text-muted)' }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        <h2 style={{ color: 'var(--text-primary)', margin: 0 }}>Funcionalidad no disponible</h2>
        <p style={{ margin: 0, textAlign: 'center' }}>
          Tu plan actual ({plan}) no incluye esta funcionalidad.<br/>
          Contacta con el administrador para actualizar tu plan.
        </p>
      </div>
    );
  }
  return <>{children}</>;
}

function DashboardOrRedirect() {
  const { user } = useAuthStore();
  if (user?.rol === 'SUPER_ADMIN') return <Navigate to="/admin/empresas" replace />;
  return <DashboardPage />;
}

export default function App() {
  return (
    <Sentry.ErrorBoundary fallback={<p style={{ padding: 32, color: 'red' }}>Error inesperado. Por favor recarga la página.</p>}>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify-2fa" element={<Verify2FAPage />} />
        <Route path="/onboarding" element={<OnboardingPage />} />
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
          <Route path="/dashboard" element={<DashboardOrRedirect />} />
          <Route path="/propiedades" element={<PropertiesListPage />} />
          <Route path="/propiedades/nueva" element={<PropertyFormPage />} />
          <Route path="/propiedades/:id" element={<PropertyDetailPage />} />
          <Route path="/propiedades/:id/editar" element={<PropertyFormPage />} />
          <Route path="/clientes" element={<ClientsListPage />} />
          <Route path="/clientes/nuevo" element={<ClientFormPage />} />
          <Route path="/clientes/:id" element={<ClientDetailPage />} />
          <Route path="/clientes/:id/editar" element={<ClientFormPage />} />
          <Route path="/propietarios" element={<Navigate to="/clientes?esPropietario=true" replace />} />
          <Route path="/propietarios/nuevo" element={<Navigate to="/clientes/nuevo" replace />} />
          <Route path="/propietarios/:id/editar" element={<Navigate to="/clientes" replace />} />
          <Route path="/pipeline" element={<PipelinePage />} />
          <Route path="/agenda" element={<AgendaPage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/bi" element={<BiPage />} />
          <Route path="/campanas" element={<PlanRoute feature="tiene_campanas"><CampanasPage /></PlanRoute>} />
          <Route path="/meta" element={<MetaPage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/admin/empresas" element={<AdminTenantsPage />} />
          <Route path="/admin/usuarios" element={<AdminUsersPage />} />
          <Route path="/admin/planes" element={<AdminPlanesPage />} />
          <Route path="/settings/portal" element={<SettingsPortalPage />} />
          <Route path="/settings/integraciones" element={<PlanRoute feature="tiene_integraciones"><SettingsIntegracionesPage /></PlanRoute>} />
          <Route path="/settings/perfil" element={<SettingsPerfilPage />} />
          <Route path="/help" element={<HelpPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
    </Sentry.ErrorBoundary>
  );
}
