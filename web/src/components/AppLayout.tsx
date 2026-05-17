import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { apiRequest } from '../lib/api';
import NotificationBell from './NotificationBell';
import CommandPalette, { useGlobalSearch, GlobalSearchTrigger } from './GlobalSearch';
import '../pages/Dashboard/Dashboard.css';

const rolLabels: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  SENIOR: 'Agente Senior',
  JUNIOR: 'Agente Junior',
};

export default function AppLayout() {
  const { user, logout, accessToken, plan, planFeatures } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const { open: searchOpen, setOpen: setSearchOpen } = useGlobalSearch();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [tenantNombre, setTenantNombre] = useState('');

  const toggleCollapse = () => {
    setCollapsed((v) => {
      try { localStorage.setItem('sidebar-collapsed', String(!v)); } catch { /* noop */ }
      return !v;
    });
  };

  useEffect(() => {
    if (!accessToken) return;
    apiRequest<{ nombre: string }>('/api/tenants/branding', { token: accessToken })
      .then((d) => setTenantNombre(d.nombre ?? ''))
      .catch(() => {});
  }, [accessToken]);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent body scroll when sidebar is open on mobile
  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [sidebarOpen]);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isSuperAdmin = user?.rol === 'SUPER_ADMIN';
  const isAdmin = user?.rol === 'ADMIN' || isSuperAdmin;

  // null = features still loading — show items by default to avoid flicker
  const pf = planFeatures;

  return (
    <div className="dashboard">
      <a href="#main-content" className="skip-link">Saltar al contenido principal</a>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        id="sidebar"
        className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}${collapsed ? ' sidebar-collapsed' : ''}`}
        role="complementary"
        aria-label="Navegación lateral"
      >
        <div className="sidebar-header">
          <div className="sidebar-logo" aria-label="GestPro">
            <img
              src="/gestpro.png"
              alt="GestPro"
              style={{
                height: 60,
                width: collapsed ? 60 : 'auto',
                maxWidth: 200,
                objectFit: 'cover',
                objectPosition: 'left center',
              }}
            />
          </div>
          {!collapsed && plan && (
            <div className="sidebar-plan-badge">{plan}</div>
          )}
        </div>

        <nav className="sidebar-nav" aria-label="Menú principal">
          {/* ─── Super Admin: solo Empresas y Usuarios ─── */}
          {isSuperAdmin ? (
            <>
              <div className="nav-section-label">{!collapsed && 'Administración'}</div>
              {[
                { to: '/admin/empresas', label: 'Empresas', icon: <><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></> },
                { to: '/admin/usuarios', label: 'Usuarios',  icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> },
                { to: '/admin/planes',   label: 'Planes',    icon: <><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></> },
              ].map(({ to, label, icon }) => (
                <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`} aria-label={label} title={collapsed ? label : undefined}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
                  <span className="nav-label">{label}</span>
                </NavLink>
              ))}
            </>
          ) : (
            <>
              {[
                { to: '/dashboard',   label: 'Dashboard',      icon: <><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></> },
                { to: '/propiedades', label: 'Propiedades',     icon: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></> },
                { to: '/clientes',      label: 'Clientes',        icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></> },
                { to: '/propietarios', label: 'Propietarios',    icon: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></> },
                { to: '/pipeline',     label: 'Pipeline',        icon: <><rect x="1" y="3" width="6" height="18" rx="1"/><rect x="9" y="8" width="6" height="13" rx="1"/><rect x="17" y="1" width="6" height="20" rx="1"/></> },
                { to: '/agenda',      label: 'Agenda',          icon: <><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></> },
                ...(!pf || pf.tiene_portal ? [{ to: '/portal', label: 'Portal público', icon: <><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></> }] : []),
                { to: '/ranking',     label: 'Ranking',         icon: <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/> },
                { to: '/help',              label: 'Ayuda',            icon: <><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></> },
                { to: '/settings/perfil',  label: 'Preferencias',     icon: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></> },
              ].map(({ to, label, icon }) => (
                <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`} aria-label={label} title={collapsed ? label : undefined}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
                  <span className="nav-label">{label}</span>
                </NavLink>
              ))}

              {/* ─── Admin Section ─── */}
              {isAdmin && (
                <>
                  <div className="nav-section-label">{!collapsed && 'Administración'}</div>
                  {[
                    { to: '/bi',       label: 'Reportes',        show: true, icon: <><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/><line x1="2" y1="20" x2="22" y2="20"/></> },
                    { to: '/campanas', label: 'Campañas',        show: !pf || pf.tiene_campanas, icon: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></> },
                    { to: '/meta',     label: 'Publicar en Meta',show: true, icon: <><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></> },
                    { to: '/import',              label: 'Importar datos',  show: true, icon: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></> },
                    { to: '/settings/portal',        label: 'Mi Portal',      show: !pf || pf.tiene_portal,        icon: <><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></> },
                    { to: '/settings/integraciones', label: 'Integraciones',  show: !pf || pf.tiene_integraciones, icon: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></> },
                  ].filter(item => item.show).map(({ to, label, icon }) => (
                    <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`} aria-label={label} title={collapsed ? label : undefined}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icon}</svg>
                      <span className="nav-label">{label}</span>
                    </NavLink>
                  ))}
                  <NavLink to="/admin/usuarios" className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`} aria-label="Gestión de usuarios">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span className="nav-label">Usuarios</span>
                  </NavLink>
                </>
              )}
            </>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user" title={collapsed ? `${user?.email} (${rolLabels[user?.rol || ''] || user?.rol})` : undefined}>
            <div className="sidebar-avatar">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-email">{user?.email}</span>
              <span className="sidebar-user-rol">{rolLabels[user?.rol || ''] || user?.rol}</span>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Cerrar sesión" aria-label="Cerrar sesión">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
        <button
          className="sidebar-collapse-btn"
          onClick={toggleCollapse}
          title={collapsed ? 'Expandir menú' : 'Colapsar menú'}
          aria-label={collapsed ? 'Expandir menú' : 'Colapsar menú'}
        >
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            style={{ transition: 'transform 0.25s ease', transform: collapsed ? 'rotate(180deg)' : 'none' }}
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </aside>

      <main className="dashboard-main" id="main-content" tabIndex={-1}>
        <div className="global-topbar" role="banner">
          <button
            className="hamburger-btn"
            onClick={() => setSidebarOpen((v) => !v)}
            aria-label={sidebarOpen ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={sidebarOpen}
            aria-controls="sidebar"
          >
            <span className={`hamburger-icon${sidebarOpen ? ' hamburger-open' : ''}`}>
              <span /><span /><span />
            </span>
          </button>
          {tenantNombre && (
            <span className="topbar-tenant-nombre" title={tenantNombre}>
              {tenantNombre}
            </span>
          )}
          <GlobalSearchTrigger onClick={() => setSearchOpen(true)} />
          <NotificationBell />
        </div>
        <Outlet />
      </main>

      <CommandPalette open={searchOpen} onClose={() => setSearchOpen(false)} />
    </div>
  );
}
