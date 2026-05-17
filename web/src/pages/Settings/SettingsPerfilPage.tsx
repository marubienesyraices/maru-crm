import { useAuthStore } from '../../stores/authStore';
import './Settings.css';
import './SettingsPerfil.css';

export default function SettingsPerfilPage() {
  const { tema, updateTema } = useAuthStore();

  return (
    <div className="settings-page">
      <div className="settings-header">
        <h1>Preferencias</h1>
        <p>Personaliza tu experiencia en el CRM</p>
      </div>

      <div className="settings-card">
        <div className="settings-card-header">
          <div className="settings-card-title">
            <div className="settings-card-icon">🎨</div>
            <div>
              <h2>Apariencia</h2>
              <p>Selecciona el tema visual que prefieras</p>
            </div>
          </div>
        </div>

        <div className="tema-options">
          <button
            className={`tema-card${tema === 'oscuro' ? ' tema-card-active' : ''}`}
            onClick={() => updateTema('oscuro')}
            aria-pressed={tema === 'oscuro'}
          >
            <div className="tema-preview tema-preview-oscuro">
              <div className="tp-sidebar" />
              <div className="tp-content">
                <div className="tp-bar tp-bar-1" />
                <div className="tp-bar tp-bar-2" />
                <div className="tp-card" />
              </div>
            </div>
            <div className="tema-label">
              <span className="tema-name">Oscuro</span>
              {tema === 'oscuro' && (
                <span className="tema-badge">Activo</span>
              )}
            </div>
          </button>

          <button
            className={`tema-card${tema === 'claro' ? ' tema-card-active' : ''}`}
            onClick={() => updateTema('claro')}
            aria-pressed={tema === 'claro'}
          >
            <div className="tema-preview tema-preview-claro">
              <div className="tp-sidebar" />
              <div className="tp-content">
                <div className="tp-bar tp-bar-1" />
                <div className="tp-bar tp-bar-2" />
                <div className="tp-card" />
              </div>
            </div>
            <div className="tema-label">
              <span className="tema-name">Claro</span>
              {tema === 'claro' && (
                <span className="tema-badge">Activo</span>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
