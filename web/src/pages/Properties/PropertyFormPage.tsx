import { useState, useEffect, useRef } from 'react';
import type { FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
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
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
  });
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState('');

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
          });
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [id, accessToken]);

  const geocodeAddress = async () => {
    const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN || '';
    if (!MAPBOX_TOKEN) { setGeoError('VITE_MAPBOX_TOKEN no configurado'); return; }
    const parts = [form.direccion, form.zona ? `Zona ${form.zona}` : '', form.municipio, form.departamento, form.pais]
      .filter(Boolean).join(', ');
    if (!parts.trim()) { setGeoError('Completa al menos municipio y departamento'); return; }
    setGeocoding(true);
    setGeoError('');
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(parts)}.json?access_token=${MAPBOX_TOKEN}&language=es&limit=1`,
      );
      const json = await res.json();
      const feat = json.features?.[0];
      if (!feat) { setGeoError('No se encontró la dirección. Intenta ser más específico.'); return; }
      const [lng, lat] = feat.center;
      updateField('longitud', String(lng));
      updateField('latitud', String(lat));
    } catch {
      setGeoError('Error al contactar el servicio de geocodificación');
    } finally {
      setGeocoding(false);
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

      if (id) {
        await apiRequest(`/api/propiedades/${id}`, {
          method: 'PUT',
          body,
          token: accessToken!,
        });
        navigate(`/propiedades/${id}`);
      } else {
        await apiRequest('/api/propiedades', {
          method: 'POST',
          body,
          token: accessToken!,
        });
        navigate('/propiedades');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canAdvance = () => {
    if (step === 1) return form.titulo.trim() !== '' && form.tipo !== '';
    if (step === 2) {
      if (form.gestion !== 'RENTA' && !form.precioVenta) return false;
      if (form.gestion !== 'VENTA' && !form.precioRenta) return false;
      return true;
    }
    return true;
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
              <input className="input-field" placeholder="Ej: Casa Moderna en Zona 14" value={form.titulo} onChange={(e) => updateField('titulo', e.target.value)} required />
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
                <input className="input-field" type="number" placeholder="2,500,000" value={form.precioVenta} onChange={(e) => updateField('precioVenta', e.target.value)} />
              </div>
            )}

            {form.gestion !== 'VENTA' && (
              <div className="input-group">
                <label>Precio de Renta Mensual ({MONEDAS_CA.find(m => m.code === form.moneda)?.symbol || ''} {form.moneda}) *</label>
                <input className="input-field" type="number" placeholder="15,000" value={form.precioRenta} onChange={(e) => updateField('precioRenta', e.target.value)} />
              </div>
            )}

            <div className="input-group">
              <label>Comisión (%)</label>
              <input className="input-field" type="number" step="0.5" placeholder="5.0" value={form.comisionPorcentaje} onChange={(e) => updateField('comisionPorcentaje', e.target.value)} />
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
                <div style={{ borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
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
              disabled={!canAdvance()} 
              onClick={() => {
                // Prevent double-click from instantly submitting on step 4
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
