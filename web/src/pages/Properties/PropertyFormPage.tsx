import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../components/Toast';
import { usePropietarios } from '../../hooks/usePropietarios';
import './PropertyForm.css';

const TIPOS = [
  { value: 'CASA', label: '🏠 Casa' },
  { value: 'APARTAMENTO', label: '🏢 Apartamento' },
  { value: 'TERRENO', label: '🌍 Terreno' },
  { value: 'LOCAL_COMERCIAL', label: '🏪 Local Comercial' },
  { value: 'OFICINA', label: '💼 Oficina' },
  { value: 'BODEGA', label: '📦 Bodega' },
  { value: 'FINCA', label: '🌾 Finca' },
  { value: 'EDIFICIO', label: '🏗️ Edificio' },
];

const MONEDAS_CA = [
  { code: 'GTQ', symbol: 'Q',  name: 'Quetzal Guatemalteco' },
  { code: 'USD', symbol: '$',  name: 'Dólar Estadounidense' },
  { code: 'HNL', symbol: 'L',  name: 'Lempira Hondureño' },
  { code: 'NIO', symbol: 'C$', name: 'Córdoba Nicaragüense' },
  { code: 'CRC', symbol: '₡',  name: 'Colón Costarricense' },
  { code: 'SVC', symbol: '$',  name: 'Colón Salvadoreño' },
  { code: 'PAB', symbol: 'B/', name: 'Balboa Panameño' },
  { code: 'BZD', symbol: 'BZ$',name: 'Dólar Beliceño' },
  { code: 'MXN', symbol: '$',  name: 'Peso Mexicano' },
];

const REGIONES_POR_PAIS: Record<string, string[]> = {
  Guatemala: [
    'Guatemala', 'Sacatepéquez', 'Chimaltenango', 'Escuintla', 'Santa Rosa',
    'Sololá', 'Totonicapán', 'Quetzaltenango', 'Suchitepéquez', 'Retalhuleu',
    'San Marcos', 'Huehuetenango', 'Quiché', 'Baja Verapaz', 'Alta Verapaz',
    'Petén', 'Izabal', 'Zacapa', 'Chiquimula', 'Jalapa', 'Jutiapa', 'El Progreso',
  ],
  'El Salvador': [
    'Ahuachapán', 'Cabañas', 'Chalatenango', 'Cuscatlán', 'La Libertad',
    'La Paz', 'La Unión', 'Morazán', 'San Miguel', 'San Salvador',
    'San Vicente', 'Santa Ana', 'Sonsonate', 'Usulután'
  ],
  Honduras: [
    'Atlántida', 'Choluteca', 'Colón', 'Comayagua', 'Copán', 'Cortés',
    'El Paraíso', 'Francisco Morazán', 'Gracias a Dios', 'Intibucá',
    'Islas de la Bahía', 'La Paz', 'Lempira', 'Ocotepeque', 'Olancho',
    'Santa Bárbara', 'Valle', 'Yoro'
  ],
  Nicaragua: [
    'Boaco', 'Carazo', 'Chinandega', 'Chontales', 'Estelí', 'Granada',
    'Jinotega', 'León', 'Madriz', 'Managua', 'Masaya', 'Matagalpa',
    'Nueva Segovia', 'Rivas', 'Río San Juan', 'RAAN', 'RAAS'
  ],
  'Costa Rica': [
    'San José', 'Alajuela', 'Cartago', 'Heredia', 'Guanacaste',
    'Puntarenas', 'Limón'
  ],
  Panamá: [
    'Bocas del Toro', 'Coclé', 'Colón', 'Chiriquí', 'Darién',
    'Herrera', 'Los Santos', 'Panamá', 'Veraguas', 'Panamá Oeste'
  ],
  Belice: [
    'Belize', 'Cayo', 'Corozal', 'Orange Walk', 'Stann Creek', 'Toledo'
  ],
  México: [
    'Aguascalientes', 'Baja California', 'Baja California Sur', 'Campeche',
    'Chiapas', 'Chihuahua', 'Ciudad de México', 'Coahuila', 'Colima',
    'Durango', 'Estado de México', 'Guanajuato', 'Guerrero', 'Hidalgo',
    'Jalisco', 'Michoacán', 'Morelos', 'Nayarit', 'Nuevo León', 'Oaxaca',
    'Puebla', 'Querétaro', 'Quintana Roo', 'San Luis Potosí', 'Sinaloa',
    'Sonora', 'Tabasco', 'Tamaulipas', 'Tlaxcala', 'Veracruz', 'Yucatán',
    'Zacatecas'
  ]
};

const PAISES = Object.keys(REGIONES_POR_PAIS);

export default function PropertyFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    titulo: '',
    descripcion: '',
    tipo: 'CASA',
    gestion: 'VENTA',
    moneda: 'GTQ',
    precioVenta: '',
    precioRenta: '',
    comisionPorcentaje: '',
    pais: 'Guatemala',
    departamento: '',
    municipio: '',
    zona: '',
    direccion: '',
    latitud: '',
    longitud: '',
    habitaciones: '',
    banos: '',
    parqueos: '',
    niveles: '',
    areaTerrenoM2: '',
    areaConstruccionM2: '',
    anoConstruccion: '',
    propietarioId: '',
  });
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState('');

  const [propietarioBusqueda, setPropietarioBusqueda] = useState('');
  const [propietarioNombre, setPropietarioNombre] = useState('');
  const [propietarioDropdownOpen, setPropietarioDropdownOpen] = useState(false);
  const { data: propietariosData = [] } = usePropietarios(propietarioBusqueda);

  // Motor de precios sugerido
  const [loadingSugg, setLoadingSugg] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);
  const [suggError, setSuggError] = useState('');

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (fieldErrors[field]) setFieldErrors((p) => ({ ...p, [field]: '' }));
  };

  const validateStep = (s: number): Record<string, string> => {
    const errs: Record<string, string> = {};
    if (s === 1) {
      if (!form.titulo.trim()) errs.titulo = 'El título es requerido';
    }
    if (s === 2) {
      if (form.gestion !== 'RENTA' && !form.precioVenta) errs.precioVenta = 'El precio de venta es requerido';
      if (form.gestion !== 'VENTA' && !form.precioRenta) errs.precioRenta = 'El precio de renta es requerido';
    }
    return errs;
  };

  useEffect(() => {
    if (id) {
      setLoading(true);
      apiRequest<any>(`/api/propiedades/${id}`, { token: accessToken! })
        .then((data) => {
          setForm({
            titulo: data.titulo || '',
            descripcion: data.descripcion || '',
            tipo: data.tipo || 'CASA',
            gestion: data.gestion || 'VENTA',
            moneda: data.moneda || 'GTQ',
            precioVenta: data.precio_venta ? String(data.precio_venta) : '',
            precioRenta: data.precio_renta ? String(data.precio_renta) : '',
            comisionPorcentaje: data.comision_porcentaje ? String(data.comision_porcentaje) : '',
            pais: data.pais || 'Guatemala',
            departamento: data.departamento || '',
            municipio: data.municipio || '',
            zona: data.zona || '',
            direccion: data.direccion || '',
            latitud: data.latitud ? String(data.latitud) : '',
            longitud: data.longitud ? String(data.longitud) : '',
            habitaciones: data.habitaciones ? String(data.habitaciones) : '',
            banos: data.banos ? String(data.banos) : '',
            parqueos: data.parqueos ? String(data.parqueos) : '',
            niveles: data.niveles ? String(data.niveles) : '',
            areaTerrenoM2: data.area_terreno_m2 ? String(data.area_terreno_m2) : '',
            areaConstruccionM2: data.area_construccion_m2 ? String(data.area_construccion_m2) : '',
            anoConstruccion: data.ano_construccion ? String(data.ano_construccion) : '',
            propietarioId: data.propietario?.id || '',
          });
          if (data.propietario?.nombre) setPropietarioNombre(data.propietario.nombre);
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id, accessToken]);

  const geocodeAddress = async () => {
    const GOOGLE_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
    if (!GOOGLE_KEY) { setGeoError('VITE_GOOGLE_MAPS_API_KEY no configurado'); return; }
    const parts = [form.direccion, form.zona ? `Zona ${form.zona}` : '', form.municipio, form.departamento, form.pais]
      .filter(Boolean).join(', ');
    if (!parts.trim()) { setGeoError('Completa al menos municipio y departamento'); return; }
    setGeocoding(true);
    setGeoError('');
    try {
      const res = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(parts)}&language=es&key=${GOOGLE_KEY}`,
      );
      const json = await res.json();
      if (json.status !== 'OK' || !json.results?.length) {
        setGeoError('No se encontró la dirección. Intenta ser más específico.');
        return;
      }
      const { lat, lng } = json.results[0].geometry.location;
      updateField('latitud', String(lat));
      updateField('longitud', String(lng));
    } catch {
      setGeoError('Error al contactar el servicio de geocodificación');
    } finally {
      setGeocoding(false);
    }
  };

  const fetchSuggestion = async () => {
    setSuggError('');
    setSuggestion(null);
    setLoadingSugg(true);
    try {
      const params = new URLSearchParams({ tipo: form.tipo, gestion: form.gestion });
      if (form.latitud)     params.set('lat', form.latitud);
      if (form.longitud)    params.set('lng', form.longitud);
      if (form.departamento) params.set('departamento', form.departamento);
      if (id)               params.set('excludeId', id);
      const data = await apiRequest<any>(`/api/propiedades/precio-sugerido?${params}`, {
        token: accessToken!,
      });
      setSuggestion(data);
    } catch (err: any) {
      setSuggError(err.message || 'Error al obtener sugerencia de precio');
    } finally {
      setLoadingSugg(false);
    }
  };

  const lastStepChange = useRef(Date.now());
  
  useEffect(() => {
    lastStepChange.current = Date.now();
  }, [step]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Prevent accidental submit from double-clicking "Siguiente"
    if (Date.now() - lastStepChange.current < 500) {
      return;
    }

    setLoading(true);
    setError('');

    try {
      const body: any = {
        titulo: form.titulo,
        descripcion: form.descripcion || undefined,
        tipo: form.tipo,
        gestion: form.gestion,
        moneda: form.moneda,
        pais: form.pais || undefined,
        departamento: form.departamento || undefined,
        municipio: form.municipio || undefined,
        zona: form.zona || undefined,
        direccion: form.direccion || undefined,
      };

      if (form.precioVenta) body.precioVenta = Number(form.precioVenta);
      if (form.precioRenta) body.precioRenta = Number(form.precioRenta);
      if (form.comisionPorcentaje) body.comisionPorcentaje = Number(form.comisionPorcentaje);
      if (form.habitaciones) body.habitaciones = Number(form.habitaciones);
      if (form.banos) body.banos = Number(form.banos);
      if (form.parqueos) body.parqueos = Number(form.parqueos);
      if (form.niveles) body.niveles = Number(form.niveles);
      if (form.areaTerrenoM2) body.areaTerrenoM2 = Number(form.areaTerrenoM2);
      if (form.areaConstruccionM2) body.areaConstruccionM2 = Number(form.areaConstruccionM2);
      if (form.anoConstruccion) body.anoConstruccion = Number(form.anoConstruccion);
      if (form.latitud) body.latitud = Number(form.latitud);
      if (form.longitud) body.longitud = Number(form.longitud);
      if (form.propietarioId) body.propietarioId = form.propietarioId;

      if (id) {
        await apiRequest(`/api/propiedades/${id}`, {
          method: 'PUT',
          body,
          token: accessToken!,
        });
        toast.success('Propiedad actualizada correctamente');
        navigate(`/propiedades/${id}`);
      } else {
        await apiRequest('/api/propiedades', {
          method: 'POST',
          body,
          token: accessToken!,
        });
        toast.success('Propiedad creada correctamente');
        navigate('/propiedades');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="property-form-page">
      <div className="pf-header">
        <button className="btn btn-ghost" onClick={() => navigate(id ? `/propiedades/${id}` : '/propiedades')}>
          ← Volver
        </button>
        <h1>{id ? 'Editar Propiedad' : 'Nueva Propiedad'}</h1>
      </div>

      {/* Steps indicator */}
      <div className="pf-steps">
        {['Datos Básicos', 'Precios', 'Ubicación', 'Características'].map((label, i) => (
          <div key={i} className={`pf-step ${step === i + 1 ? 'pf-step-active' : step > i + 1 ? 'pf-step-done' : ''}`}>
            <div className="pf-step-num">{step > i + 1 ? '✓' : i + 1}</div>
            <span>{label}</span>
          </div>
        ))}
      </div>

      {error && <div className="alert alert-error animate-fade-in">{error}</div>}

      <form
        onSubmit={handleSubmit}
        onKeyDown={(e) => {
          // Prevent Enter key from submitting the form automatically from any input
          if (e.key === 'Enter') {
            const target = e.target as HTMLElement;
            if (target.tagName !== 'BUTTON' && target.tagName !== 'TEXTAREA') {
              e.preventDefault();
            }
          }
        }}
        className="pf-form animate-fade-in"
      >
        {/* Step 1: Datos Básicos */}
        {step === 1 && (
          <div className="pf-section">
            <div className="input-group">
              <label>Título *</label>
              <input
                className={`input-field${fieldErrors.titulo ? ' input-error' : ''}`}
                placeholder="Ej: Casa Moderna en Zona 14"
                value={form.titulo}
                onChange={(e) => updateField('titulo', e.target.value)}
                aria-describedby={fieldErrors.titulo ? 'err-titulo' : undefined}
              />
              {fieldErrors.titulo && <span id="err-titulo" className="field-error">{fieldErrors.titulo}</span>}
            </div>

            <div className="input-group">
              <label>Descripción</label>
              <textarea className="input-field pf-textarea" placeholder="Describe la propiedad..." rows={4} value={form.descripcion} onChange={(e) => updateField('descripcion', e.target.value)} />
            </div>

            <div className="pf-row">
              <div className="input-group">
                <label>Tipo *</label>
                <div className="pf-chips">
                  {TIPOS.map((t) => (
                    <button type="button" key={t.value} className={`pf-chip ${form.tipo === t.value ? 'pf-chip-active' : ''}`} onClick={() => updateField('tipo', t.value)}>
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="input-group">
              <label>Tipo de Gestión *</label>
              <div className="pf-radio-group">
                {['VENTA', 'RENTA', 'AMBAS'].map((g) => (
                  <label key={g} className={`pf-radio ${form.gestion === g ? 'pf-radio-active' : ''}`}>
                    <input type="radio" name="gestion" value={g} checked={form.gestion === g} onChange={(e) => updateField('gestion', e.target.value)} />
                    {g === 'AMBAS' ? 'Venta y Renta' : g.charAt(0) + g.slice(1).toLowerCase()}
                  </label>
                ))}
              </div>
            </div>

            {/* Propietario */}
            <div className="input-group">
              <label>Propietario</label>
              {form.propietarioId ? (
                <div className="pf-propietario-selected">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span>{propietarioNombre}</span>
                  <button
                    type="button"
                    className="pf-propietario-clear"
                    onClick={() => { updateField('propietarioId', ''); setPropietarioNombre(''); }}
                    title="Quitar propietario"
                  >✕</button>
                </div>
              ) : (
                <div className="pf-propietario-wrap">
                  <input
                    className="input-field"
                    placeholder="Buscar por nombre, teléfono o DPI..."
                    value={propietarioBusqueda}
                    onChange={(e) => { setPropietarioBusqueda(e.target.value); setPropietarioDropdownOpen(true); }}
                    onFocus={() => setPropietarioDropdownOpen(true)}
                    onBlur={() => setTimeout(() => setPropietarioDropdownOpen(false), 150)}
                  />
                  {propietarioDropdownOpen && propietariosData.length > 0 && (
                    <div className="pf-propietario-dropdown">
                      {(propietariosData as any[]).slice(0, 8).map((p: any) => (
                        <div
                          key={p.id}
                          className="pf-propietario-option"
                          onMouseDown={() => {
                            setForm((prev) => ({ ...prev, propietarioId: p.id }));
                            setPropietarioNombre(p.nombre);
                            setPropietarioBusqueda('');
                            setPropietarioDropdownOpen(false);
                          }}
                        >
                          <span className="pf-propietario-option-nombre">{p.nombre}</span>
                          {p.telefono && <span className="pf-propietario-option-tel">{p.telefono}</span>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <span className="pf-field-hint">
                Opcional.{' '}
                <button type="button" className="pf-link-btn" onClick={() => navigate('/propietarios/nuevo')}>
                  + Crear nuevo propietario
                </button>
              </span>
            </div>
          </div>
        )}

        {/* Step 2: Precios */}
        {step === 2 && (
          <div className="pf-section">
            <div className="input-group">
              <label>Moneda</label>
              <select className="input-field" value={form.moneda} onChange={(e) => updateField('moneda', e.target.value)}>
                {MONEDAS_CA.map((m) => (
                  <option key={m.code} value={m.code}>{m.symbol} {m.code} — {m.name}</option>
                ))}
              </select>
            </div>

            {form.gestion !== 'RENTA' && (
              <div className="input-group">
                <label>Precio de Venta ({MONEDAS_CA.find(m => m.code === form.moneda)?.symbol || ''} {form.moneda}) *</label>
                <input
                  className={`input-field${fieldErrors.precioVenta ? ' input-error' : ''}`}
                  type="number"
                  placeholder="2,500,000"
                  value={form.precioVenta}
                  onChange={(e) => updateField('precioVenta', e.target.value)}
                  aria-describedby={fieldErrors.precioVenta ? 'err-precio-venta' : undefined}
                />
                {fieldErrors.precioVenta && <span id="err-precio-venta" className="field-error">{fieldErrors.precioVenta}</span>}
              </div>
            )}

            {form.gestion !== 'VENTA' && (
              <div className="input-group">
                <label>Precio de Renta Mensual ({MONEDAS_CA.find(m => m.code === form.moneda)?.symbol || ''} {form.moneda}) *</label>
                <input
                  className={`input-field${fieldErrors.precioRenta ? ' input-error' : ''}`}
                  type="number"
                  placeholder="15,000"
                  value={form.precioRenta}
                  onChange={(e) => updateField('precioRenta', e.target.value)}
                  aria-describedby={fieldErrors.precioRenta ? 'err-precio-renta' : undefined}
                />
                {fieldErrors.precioRenta && <span id="err-precio-renta" className="field-error">{fieldErrors.precioRenta}</span>}
              </div>
            )}

            <div className="input-group">
              <label>Comisión (%)</label>
              <input className="input-field" type="number" step="0.5" placeholder="5.0" value={form.comisionPorcentaje} onChange={(e) => updateField('comisionPorcentaje', e.target.value)} />
            </div>

            {/* ── Motor de precios sugerido (PostGIS) ── */}
            <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span style={{ fontWeight: 600, fontSize: '0.875rem' }}>💡 Motor de Precios</span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: '0.75rem', padding: '4px 12px', height: 'auto' }}
                  onClick={fetchSuggestion}
                  disabled={loadingSugg}
                >
                  {loadingSugg ? '⏳ Analizando comparables...' : '↻ Obtener precio sugerido'}
                </button>
                {!form.latitud && (
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                    (Geocodifica en Paso 3 para mayor precisión)
                  </span>
                )}
              </div>

              {suggError && (
                <p style={{ margin: '0 0 8px', fontSize: '0.8125rem', color: '#f87171' }}>{suggError}</p>
              )}

              {suggestion && (
                <div style={{
                  background: 'var(--bg-card)',
                  border: `1px solid ${suggestion.confianza === 'ALTA' ? '#22c55e44' : suggestion.confianza === 'MEDIA' ? '#f59e0b44' : '#6b728044'}`,
                  borderRadius: 8,
                  padding: '14px 16px',
                  fontSize: '0.8125rem',
                }}>
                  {/* Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <span style={{ color: 'var(--text-muted)' }}>
                      {suggestion.comparable_count > 0
                        ? <>Basado en <strong>{suggestion.comparable_count}</strong> comparable{suggestion.comparable_count !== 1 ? 's' : ''}</>
                        : 'Sin comparables disponibles'}
                    </span>
                    {suggestion.comparable_count > 0 && (
                      <span style={{
                        padding: '2px 8px', borderRadius: 12, fontSize: '0.7rem', fontWeight: 600,
                        background: suggestion.confianza === 'ALTA' ? '#22c55e22' : suggestion.confianza === 'MEDIA' ? '#f59e0b22' : '#ef444422',
                        color:      suggestion.confianza === 'ALTA' ? '#22c55e'   : suggestion.confianza === 'MEDIA' ? '#f59e0b'   : '#ef4444',
                      }}>
                        Confianza {suggestion.confianza}
                      </span>
                    )}
                    {suggestion.usa_geo && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        📍 Radio {suggestion.radio_km} km
                      </span>
                    )}
                    {!suggestion.usa_geo && suggestion.comparable_count > 0 && (
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>📂 Por departamento</span>
                    )}
                  </div>

                  {/* Precios sugeridos */}
                  {suggestion.precio_sugerido_venta != null && form.gestion !== 'RENTA' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span>
                        Venta sugerida:{' '}
                        <strong>{Number(suggestion.precio_sugerido_venta).toLocaleString()} {form.moneda}</strong>
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: '0.7rem', padding: '2px 10px', height: 'auto' }}
                        onClick={() => updateField('precioVenta', String(suggestion.precio_sugerido_venta))}
                      >
                        Aplicar
                      </button>
                    </div>
                  )}
                  {suggestion.precio_sugerido_renta != null && form.gestion !== 'VENTA' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span>
                        Renta mensual sugerida:{' '}
                        <strong>{Number(suggestion.precio_sugerido_renta).toLocaleString()} {form.moneda}</strong>
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: '0.7rem', padding: '2px 10px', height: 'auto' }}
                        onClick={() => updateField('precioRenta', String(suggestion.precio_sugerido_renta))}
                      >
                        Aplicar
                      </button>
                    </div>
                  )}
                  {suggestion.precio_m2_sugerido != null && (
                    <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                      Precio/m² de construcción referencial:{' '}
                      {Number(suggestion.precio_m2_sugerido).toLocaleString()} {form.moneda}
                    </p>
                  )}

                  {/* Sin datos */}
                  {suggestion.confianza === 'SIN_DATOS' && (
                    <p style={{ margin: 0, color: 'var(--text-muted)' }}>
                      No hay propiedades comparables registradas aún. Agrega más propiedades al CRM para activar esta función.
                    </p>
                  )}

                  {/* Lista de comparables */}
                  {suggestion.comparables?.length > 0 && (
                    <details style={{ marginTop: 10 }}>
                      <summary style={{ cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                        Ver {suggestion.comparables.length} comparable{suggestion.comparables.length !== 1 ? 's' : ''}
                      </summary>
                      <table style={{ width: '100%', marginTop: 8, borderCollapse: 'collapse', fontSize: '0.75rem' }}>
                        <thead>
                          <tr style={{ color: 'var(--text-muted)', textAlign: 'left' }}>
                            <th style={{ padding: '4px 8px 4px 0', fontWeight: 500 }}>Código</th>
                            <th style={{ padding: '4px 8px', fontWeight: 500 }}>Título</th>
                            <th style={{ padding: '4px 8px', fontWeight: 500, textAlign: 'right' }}>Precio venta</th>
                            <th style={{ padding: '4px 8px', fontWeight: 500, textAlign: 'right' }}>Precio renta</th>
                            {suggestion.usa_geo && <th style={{ padding: '4px 0 4px 8px', fontWeight: 500, textAlign: 'right' }}>Distancia</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {suggestion.comparables.map((c: any) => (
                            <tr key={c.id} style={{ borderTop: '1px solid var(--border-subtle)' }}>
                              <td style={{ padding: '4px 8px 4px 0', color: 'var(--text-muted)' }}>{c.codigo}</td>
                              <td style={{ padding: '4px 8px' }}>{c.titulo}</td>
                              <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                                {c.precio_venta ? Number(c.precio_venta).toLocaleString() : '—'}
                              </td>
                              <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                                {c.precio_renta ? Number(c.precio_renta).toLocaleString() : '—'}
                              </td>
                              {suggestion.usa_geo && (
                                <td style={{ padding: '4px 0 4px 8px', textAlign: 'right', color: 'var(--text-muted)' }}>
                                  {c.distancia_m != null ? `${(c.distancia_m / 1000).toFixed(1)} km` : '—'}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </details>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Ubicación */}
        {step === 3 && (
          <div className="pf-section">
            <div className="pf-row">
              <div className="input-group">
                <label>País</label>
                <select 
                  className="input-field" 
                  value={form.pais} 
                  onChange={(e) => {
                    updateField('pais', e.target.value);
                    updateField('departamento', '');
                    updateField('municipio', '');
                  }}
                >
                  <option value="">Seleccionar...</option>
                  {PAISES.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Departamento / Estado</label>
                <select 
                  className="input-field" 
                  value={form.departamento} 
                  onChange={(e) => updateField('departamento', e.target.value)}
                  disabled={!form.pais}
                >
                  <option value="">Seleccionar...</option>
                  {(REGIONES_POR_PAIS[form.pais] || []).map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label>Municipio / Ciudad</label>
                <input className="input-field" placeholder="Ej: Guatemala" value={form.municipio} onChange={(e) => updateField('municipio', e.target.value)} />
              </div>
            </div>

            <div className="pf-row">
              <div className="input-group">
                <label>Zona</label>
                <input className="input-field" placeholder="Ej: 14" value={form.zona} onChange={(e) => updateField('zona', e.target.value)} />
              </div>
              <div className="input-group" style={{ flex: 2 }}>
                <label>Dirección</label>
                <input className="input-field" placeholder="Ej: 4a Avenida 10-50" value={form.direccion} onChange={(e) => updateField('direccion', e.target.value)} />
              </div>
            </div>

            {/* ── Geolocalización ── */}
            <div className="input-group">
              <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Geolocalización</span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  style={{ fontSize: '0.75rem', padding: '4px 10px', height: 'auto' }}
                  disabled={geocoding}
                  onClick={geocodeAddress}
                >
                  {geocoding ? '⏳ Buscando...' : '🎯 Geocodificar desde dirección'}
                </button>
              </label>
              <div className="pf-row" style={{ gap: 8 }}>
                <input
                  className="input-field"
                  placeholder="Latitud (Ej: 14.6349)"
                  type="number"
                  step="any"
                  value={form.latitud}
                  onChange={(e) => updateField('latitud', e.target.value)}
                />
                <input
                  className="input-field"
                  placeholder="Longitud (Ej: -90.5069)"
                  type="number"
                  step="any"
                  value={form.longitud}
                  onChange={(e) => updateField('longitud', e.target.value)}
                />
                {(form.latitud || form.longitud) && (
                  <button
                    type="button"
                    className="btn btn-ghost"
                    style={{ flexShrink: 0, fontSize: '0.75rem', padding: '4px 8px', height: 'auto' }}
                    onClick={() => { updateField('latitud', ''); updateField('longitud', ''); }}
                    title="Limpiar coordenadas"
                  >
                    ✕
                  </button>
                )}
              </div>
              {geoError && (
                <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#f87171' }}>{geoError}</p>
              )}
            </div>

            {/* ── Static map preview ── */}
            {form.latitud && form.longitud && (() => {
              const token = import.meta.env.VITE_MAPBOX_TOKEN;
              if (!token) return null;
              const lng = Number(form.longitud);
              const lat = Number(form.latitud);
              if (isNaN(lat) || isNaN(lng)) return null;
              const src = `https://api.mapbox.com/styles/v1/mapbox/dark-v11/static/pin-s+3b82f6(${lng},${lat})/${lng},${lat},14,0/640x180@2x?access_token=${token}`;
              return (
                <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border-subtle)' }}>
                  <img src={src} alt="Mapa" style={{ width: '100%', display: 'block' }} />
                  <p style={{ margin: 0, padding: '6px 12px', fontSize: '0.6875rem', color: 'var(--text-muted)', background: 'var(--bg-card)' }}>
                    📍 {lat.toFixed(5)}, {lng.toFixed(5)}
                  </p>
                </div>
              );
            })()}
          </div>
        )}

        {/* Step 4: Características */}
        {step === 4 && (
          <div className="pf-section">
            <div className="pf-row pf-row-4">
              <div className="input-group">
                <label>Habitaciones</label>
                <input className="input-field" type="number" placeholder="4" value={form.habitaciones} onChange={(e) => updateField('habitaciones', e.target.value)} />
              </div>
              <div className="input-group">
                <label>Baños</label>
                <input className="input-field" type="number" placeholder="3" value={form.banos} onChange={(e) => updateField('banos', e.target.value)} />
              </div>
              <div className="input-group">
                <label>Parqueos</label>
                <input className="input-field" type="number" placeholder="2" value={form.parqueos} onChange={(e) => updateField('parqueos', e.target.value)} />
              </div>
              <div className="input-group">
                <label>Niveles</label>
                <input className="input-field" type="number" placeholder="2" value={form.niveles} onChange={(e) => updateField('niveles', e.target.value)} />
              </div>
            </div>

            <div className="pf-row">
              <div className="input-group">
                <label>Área Terreno (m²)</label>
                <input className="input-field" type="number" placeholder="350" value={form.areaTerrenoM2} onChange={(e) => updateField('areaTerrenoM2', e.target.value)} />
              </div>
              <div className="input-group">
                <label>Área Construcción (m²)</label>
                <input className="input-field" type="number" placeholder="280" value={form.areaConstruccionM2} onChange={(e) => updateField('areaConstruccionM2', e.target.value)} />
              </div>
              <div className="input-group">
                <label>Año Construcción</label>
                <input className="input-field" type="number" placeholder="2024" value={form.anoConstruccion} onChange={(e) => updateField('anoConstruccion', e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="pf-actions">
          {step > 1 && (
            <button type="button" className="btn btn-ghost" onClick={() => setStep(step - 1)}>
              ← Anterior
            </button>
          )}
          <div style={{ flex: 1 }} />
          {step < 4 ? (
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                const errs = validateStep(step);
                if (Object.keys(errs).length) { setFieldErrors(errs); return; }
                setFieldErrors({});
                if (step === 3) {
                  const submitBtn = document.getElementById('submit-btn') as HTMLButtonElement;
                  if (submitBtn) {
                    submitBtn.disabled = true;
                    setTimeout(() => { if (submitBtn) submitBtn.disabled = false; }, 500);
                  }
                }
                setStep(step + 1);
              }}
            >
              Siguiente →
            </button>
          ) : (
            <button id="submit-btn" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? <><div className="spinner" /> Guardando...</> : id ? '✓ Guardar Cambios' : '✓ Crear Propiedad'}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
