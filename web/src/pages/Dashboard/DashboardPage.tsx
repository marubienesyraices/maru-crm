import './Dashboard.css';

export default function DashboardPage() {
  return (
    <>
      <header className="dashboard-topbar">
        <div>
          <h1>Dashboard</h1>
          <p>Bienvenido a Maru CRM — Fase 2 en progreso</p>
        </div>
      </header>

      <div className="dashboard-content animate-fade-in">
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon stat-icon-blue">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">Activa</span>
              <span className="stat-label">Seguridad RLS</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-violet">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /></svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">4</span>
              <span className="stat-label">Usuarios Activos</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-cyan">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">Fase 2</span>
              <span className="stat-label">Propiedades</span>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon stat-icon-green">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12" /></svg>
            </div>
            <div className="stat-info">
              <span className="stat-value">100%</span>
              <span className="stat-label">Uptime API</span>
            </div>
          </div>
        </div>

        <div className="phase-card">
          <h2>Roadmap de Desarrollo</h2>
          <div className="phase-list">
            <div className="phase-item phase-done">
              <div className="phase-check">✓</div>
              <div className="phase-info"><strong>Fase 1 — Infraestructura</strong><span>Multi-tenancy, Auth, 2FA, RLS, Jerarquía</span></div>
              <span className="phase-status-badge phase-badge-done">Completada</span>
            </div>
            <div className="phase-item phase-next">
              <div className="phase-number">2</div>
              <div className="phase-info"><strong>Fase 2 — Inventario y Clientes</strong><span>Propiedades, Leads, Pipeline Kanban</span></div>
              <span className="phase-status-badge phase-badge-next">En Progreso</span>
            </div>
            <div className="phase-item">
              <div className="phase-number">3</div>
              <div className="phase-info"><strong>Fase 3 — Agenda y Automatización</strong><span>Calendario, Notificaciones, Recordatorios</span></div>
              <span className="phase-status-badge">Pendiente</span>
            </div>
            <div className="phase-item">
              <div className="phase-number">4</div>
              <div className="phase-info"><strong>Fase 4 — Reportes y Marketing</strong><span>Dashboards, WhatsApp, Email</span></div>
              <span className="phase-status-badge">Pendiente</span>
            </div>
            <div className="phase-item">
              <div className="phase-number">5</div>
              <div className="phase-info"><strong>Fase 5 — QA y Despliegue</strong><span>Testing, CI/CD, Producción</span></div>
              <span className="phase-status-badge">Pendiente</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
