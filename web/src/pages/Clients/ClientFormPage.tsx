import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../components/Toast';
import './Clients.css';

const ORIGENES = [
  { value: 'PORTAL_WEB', label: '🌐 Portal Web' },
  { value: 'REFERIDO', label: '🤝 Referido' },
  { value: 'LLAMADA', label: '📞 Llamada' },
  { value: 'WHATSAPP', label: '💬 WhatsApp' },
  { value: 'REDES_SOCIALES', label: '📱 Redes Sociales' },
  { value: 'FERIA', label: '🏪 Feria' },
  { value: 'OTRO', label: '📋 Otro' },
];

const TIPOS_PROPIEDAD = [
  { value: '', label: 'Cualquiera' },
  { value: 'CASA', label: 'Casa' },
  { value: 'APARTAMENTO', label: 'Apartamento' },
  { value: 'TERRENO', label: 'Terreno' },
  { value: 'LOCAL_COMERCIAL', label: 'Local Comercial' },
  { value: 'OFICINA', label: 'Oficina' },
  { value: 'BODEGA', label: 'Bodega' },
  { value: 'FINCA', label: 'Finca' },
  { value: 'EDIFICIO', label: 'Edificio' },
  { value: 'OTRO', label: 'Otro' },
];

const GESTIONES = [
  { value: '', label: 'Cualquiera' },
  { value: 'VENTA', label: 'Compra' },
  { value: 'RENTA', label: 'Renta' },
  { value: 'AMBAS', label: 'Compra o Renta' },
];

const EMPTY_FORM = {
  nombre: '', email: '', telefono: '', dpi: '', nit: '', direccion: '',
  origen: 'OTRO', notas: '', esPropietario: false,
  tipoInteres: '', gestionInteres: '', presupuestoMax: '', zonaInteres: '', habitacionesMin: '', superficieMinM2: '',
};

interface ClienteDetail {
  nombre?: string;
  email?: string;
  telefono?: string;
  dpi?: string;
  nit?: string;
  direccion?: string;
  origen?: string;
  notas?: string;
  es_propietario?: boolean;
  tipo_interes?: string;
  gestion_interes?: string;
  presupuesto_max?: number | string | null;
  zona_interes?: string;
  habitaciones_min?: number | string | null;
  superficie_min_m2?: number | string | null;
}

export default function ClientFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(isEdit);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const set = (f: string, v: string | boolean) => {
    setForm((p) => ({ ...p, [f]: v }));
    if (fieldErrors[f]) setFieldErrors((p) => ({ ...p, [f]: '' }));
  };

  useEffect(() => {
    if (!isEdit) return;
    apiRequest<ClienteDetail>(`/api/clientes/${id}`, { token: accessToken! })
      .then((c) => {
        setForm({
          nombre: c.nombre || '',
          email: c.email || '',
          telefono: c.telefono || '',
          dpi: c.dpi || '',
          nit: c.nit || '',
          direccion: c.direccion || '',
          origen: c.origen || 'OTRO',
          notas: c.notas || '',
          esPropietario: c.es_propietario ?? false,
          tipoInteres: c.tipo_interes || '',
          gestionInteres: c.gestion_interes || '',
          presupuestoMax: c.presupuesto_max ? String(c.presupuesto_max) : '',
          zonaInteres: c.zona_interes || '',
          habitacionesMin: c.habitaciones_min != null ? String(c.habitaciones_min) : '',
          superficieMinM2: c.superficie_min_m2 != null ? String(c.superficie_min_m2) : '',
        });
      })
      .catch(() => setError('No se pudo cargar el contacto'))
      .finally(() => setLoading(false));
  }, [id, isEdit, accessToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!form.nombre.trim()) errs.nombre = 'El nombre es requerido';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Formato de email inválido';
    if (Object.keys(errs).length) { setFieldErrors(errs); return; }
    setSaving(true); setError('');
    try {
      const body: Record<string, unknown> = {
        nombre: form.nombre,
        email: form.email || undefined,
        telefono: form.telefono || undefined,
        dpi: form.dpi || undefined,
        nit: form.nit || undefined,
        direccion: form.direccion || undefined,
        origen: form.origen,
        notas: form.notas || undefined,
        esPropietario: form.esPropietario,
        tipoInteres: form.tipoInteres || undefined,
        gestionInteres: form.gestionInteres || undefined,
        presupuestoMax: form.presupuestoMax ? parseFloat(form.presupuestoMax) : undefined,
        zonaInteres: form.zonaInteres || undefined,
        habitacionesMin: form.habitacionesMin ? parseInt(form.habitacionesMin) : undefined,
        superficieMinM2: form.superficieMinM2 ? parseFloat(form.superficieMinM2) : undefined,
      };
      if (isEdit) {
        await apiRequest(`/api/clientes/${id}`, { method: 'PUT', body, token: accessToken! });
        toast.success('Contacto actualizado correctamente');
        navigate(`/clientes/${id}`);
      } else {
        await apiRequest('/api/clientes', { method: 'POST', body, token: accessToken! });
        toast.success('Contacto creado correctamente');
        navigate('/clientes');
      }
    } catch (err) { setError(err instanceof Error ? err.message : String(err)); } finally { setSaving(false); }
  };

  if (loading) return <div className="clients-loading"><div className="spinner" /><span>Cargando...</span></div>;

  return (
    <div className="client-form">
      <button className="btn btn-ghost" onClick={() => navigate(isEdit ? `/clientes/${id}` : '/clientes')} style={{ marginBottom: 8 }}>
        ← Volver
      </button>
      <h1>{isEdit ? 'Editar Contacto' : 'Nuevo Contacto'}</h1>
      <form onSubmit={handleSubmit}>
        <div className="client-form-grid">

          {/* ─── Rol ─── */}
          <div className="form-group">
            <label className="form-label">Rol</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '10px 14px', background: 'var(--bg-input)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
              <input
                type="checkbox"
                checked={form.esPropietario}
                onChange={(e) => set('esPropietario', e.target.checked)}
                style={{ width: 16, height: 16, accentColor: 'var(--accent-blue)' }}
              />
              <span style={{ fontWeight: 500 }}>🏠 Es propietario de inmueble</span>
            </label>
          </div>

          {/* ─── Datos personales ─── */}
          <div className="form-group">
            <label className="form-label">Nombre *</label>
            <input
              className={`form-input${fieldErrors.nombre ? ' input-error' : ''}`}
              value={form.nombre}
              onChange={(e) => set('nombre', e.target.value)}
              placeholder="Nombre completo"
              aria-describedby={fieldErrors.nombre ? 'err-nombre' : undefined}
            />
            {fieldErrors.nombre && <span id="err-nombre" className="field-error">{fieldErrors.nombre}</span>}
          </div>
          <div className="client-form-row">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                className={`form-input${fieldErrors.email ? ' input-error' : ''}`}
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="correo@ejemplo.com"
                aria-describedby={fieldErrors.email ? 'err-email' : undefined}
              />
              {fieldErrors.email && <span id="err-email" className="field-error">{fieldErrors.email}</span>}
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input className="form-input" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="+502 5555-1234" />
            </div>
          </div>
          <div className="client-form-row">
            <div className="form-group">
              <label className="form-label">DPI</label>
              <input className="form-input" value={form.dpi} onChange={(e) => set('dpi', e.target.value)} placeholder="Número de DPI" />
            </div>
            <div className="form-group">
              <label className="form-label">NIT</label>
              <input className="form-input" value={form.nit} onChange={(e) => set('nit', e.target.value)} placeholder="NIT (propietarios)" />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Dirección</label>
            <input className="form-input" value={form.direccion} onChange={(e) => set('direccion', e.target.value)} placeholder="Dirección del contacto" />
          </div>
          <div className="form-group">
            <label className="form-label">Origen</label>
            <div className="client-origen-options">
              {ORIGENES.map((o) => (
                <button key={o.value} type="button" className={`client-origen-btn ${form.origen === o.value ? 'active' : ''}`} onClick={() => set('origen', o.value)}>
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Notas</label>
            <textarea className="form-input" rows={3} value={form.notas} onChange={(e) => set('notas', e.target.value)} placeholder="Información adicional..." />
          </div>

          {/* ─── Preferencias de búsqueda ─── */}
          <div className="client-prefs-divider">
            <span>Preferencias de búsqueda</span>
            <span className="client-prefs-hint">Opcional — para matching automático con propiedades</span>
          </div>

          <div className="client-form-row">
            <div className="form-group">
              <label className="form-label">Tipo de propiedad</label>
              <select className="form-input form-select" value={form.tipoInteres} onChange={(e) => set('tipoInteres', e.target.value)}>
                {TIPOS_PROPIEDAD.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Gestión</label>
              <select className="form-input form-select" value={form.gestionInteres} onChange={(e) => set('gestionInteres', e.target.value)}>
                {GESTIONES.map((g) => <option key={g.value} value={g.value}>{g.label}</option>)}
              </select>
            </div>
          </div>

          <div className="client-form-row">
            <div className="form-group">
              <label className="form-label">Presupuesto máximo (GTQ)</label>
              <input className="form-input" type="number" min="0" value={form.presupuestoMax} onChange={(e) => set('presupuestoMax', e.target.value)} placeholder="Ej. 2500000" />
            </div>
            <div className="form-group">
              <label className="form-label">Habitaciones mínimas</label>
              <input className="form-input" type="number" min="0" value={form.habitacionesMin} onChange={(e) => set('habitacionesMin', e.target.value)} placeholder="Ej. 3" />
            </div>
          </div>

          <div className="client-form-row">
            <div className="form-group">
              <label className="form-label">Superficie mínima (m²)</label>
              <input className="form-input" type="number" min="0" step="0.01" value={form.superficieMinM2} onChange={(e) => set('superficieMinM2', e.target.value)} placeholder="Ej. 120" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Zona / Ubicación de interés</label>
            <input className="form-input" value={form.zonaInteres} onChange={(e) => set('zonaInteres', e.target.value)} placeholder="Ej. Zona 15, San Lucas, Antigua..." />
          </div>

          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: 8 }}>
            {saving ? 'Guardando...' : (isEdit ? 'Actualizar Contacto' : 'Guardar Contacto')}
          </button>
        </div>
      </form>
    </div>
  );
}
