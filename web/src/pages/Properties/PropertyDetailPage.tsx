import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import ImageUpload from '../../components/ImageUpload';
import DocumentUpload from '../../components/DocumentUpload';
import './Properties.css';

const ESTADO_COLORS: Record<string, string> = {
  BORRADOR: '#64748b', DISPONIBLE: '#22c55e', RESERVADA: '#f59e0b',
  EN_NEGOCIACION: '#3b82f6', VENDIDA: '#8b5cf6', RENTADA: '#06b6d4', SUSPENDIDA: '#ef4444',
};

const TRANSICIONES: Record<string, string[]> = {
  BORRADOR: ['DISPONIBLE', 'SUSPENDIDA'],
  DISPONIBLE: ['RESERVADA', 'EN_NEGOCIACION', 'SUSPENDIDA'],
  RESERVADA: ['EN_NEGOCIACION', 'DISPONIBLE', 'SUSPENDIDA'],
  EN_NEGOCIACION: ['VENDIDA', 'RENTADA', 'DISPONIBLE', 'SUSPENDIDA'],
  VENDIDA: [],
  RENTADA: ['DISPONIBLE'],
  SUSPENDIDA: ['BORRADOR', 'DISPONIBLE'],
};

function formatPrice(v: string | null, currency: string) {
  if (!v) return '—';
  try {
    return new Intl.NumberFormat('es-GT', { style: 'currency', currency: currency || 'GTQ', maximumFractionDigits: 0 }).format(parseFloat(v));
  } catch (e) {
    return `${currency || 'GTQ'} ${parseFloat(v).toLocaleString('es-GT')}`;
  }
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [propiedad, setPropiedad] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [brochureState, setBrochureState] = useState<'idle' | 'generating' | 'error'>('idle');

  // WhatsApp modal
  const [waOpen, setWaOpen] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const [waMensaje, setWaMensaje] = useState('');
  const [waLoading, setWaLoading] = useState(false);
  const [waResult, setWaResult] = useState<any>(null);
  const [waError, setWaError] = useState('');
  const [waHistorial, setWaHistorial] = useState<any[]>([]);

  const fetchProperty = useCallback(async () => {
    try {
      const data = await apiRequest<any>(`/api/propiedades/${id}`, { token: accessToken! });
      setPropiedad(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [id, accessToken]);

  useEffect(() => { fetchProperty(); }, [fetchProperty]);

  const handleEstado = async (nuevoEstado: string) => {
    try {
      await apiRequest(`/api/propiedades/${id}/estado`, {
        method: 'PATCH', body: { nuevoEstado }, token: accessToken!,
      });
      fetchProperty();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const openWaModal = async () => {
    setWaOpen(true);
    setWaResult(null);
    setWaError('');
    try {
      const data = await apiRequest<any>(`/api/propiedades/${id}/whatsapp/envios`, { token: accessToken! });
      setWaHistorial(data.envios ?? []);
    } catch { setWaHistorial([]); }
  };

  const handleWaEnviar = async () => {
    if (!waPhone.trim()) { setWaError('Ingresa el número de teléfono'); return; }
    setWaLoading(true);
    setWaError('');
    setWaResult(null);
    try {
      const data = await apiRequest<any>(`/api/propiedades/${id}/whatsapp/enviar`, {
        method: 'POST',
        body: { telefono: waPhone, ...(waMensaje ? { mensaje: waMensaje } : {}) },
        token: accessToken!,
      });
      setWaResult(data);
      if (data.wa_link) window.open(data.wa_link, '_blank');
      // Refresh historial
      const hist = await apiRequest<any>(`/api/propiedades/${id}/whatsapp/envios`, { token: accessToken! });
      setWaHistorial(hist.envios ?? []);
    } catch (err: any) {
      setWaError(err.message);
    } finally {
      setWaLoading(false);
    }
  };

  const handleBrochure = async () => {
    if (brochureState === 'generating') return;
    setBrochureState('generating');
    try {
      const API = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      const { jobId } = await apiRequest<{ jobId: string }>(`/api/propiedades/${id}/brochure`, {
        method: 'POST', token: accessToken!,
      });

      // Poll status up to 30 attempts × 1.5 s = 45 s max
      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 1500));
        const job = await apiRequest<{ status: string; url?: string }>(
          `/api/propiedades/${id}/brochure/jobs/${jobId}`, { token: accessToken! },
        );
        if (job.status === 'LISTO') {
          // Fetch download info (records tracking) then navigate to PDF URL
          const dl = await apiRequest<{ url: string }>(
            `/api/propiedades/${id}/brochure/jobs/${jobId}/download`, { token: accessToken! },
          );
          // For local files use the /uploads path; for R2 it's the full public URL
          const pdfUrl = dl.url.startsWith('http') ? dl.url : `${API}${dl.url}`;
          window.open(pdfUrl, '_blank');
          setBrochureState('idle');
          return;
        }
        if (job.status === 'ERROR') throw new Error('La generación del brochure falló');
      }
      throw new Error('Tiempo de espera agotado');
    } catch (err: any) {
      alert(err.message);
      setBrochureState('error');
      setTimeout(() => setBrochureState('idle'), 3000);
    }
  };

  if (loading) return <div className="props-loading"><div className="spinner" /><span>Cargando...</span></div>;
  if (!propiedad) return <div className="props-empty"><h3>Propiedad no encontrada</h3></div>;

  const transiciones = TRANSICIONES[propiedad.estado] || [];

  return (
    <div className="properties-page" style={{ maxWidth: 960 }}>
      {/* Header */}
      <div className="props-header">
        <div>
          <button className="btn btn-ghost" onClick={() => navigate('/propiedades')} style={{ marginBottom: 8 }}>
            ← Volver
          </button>
          <h1>{propiedad.titulo}</h1>
          <p>{propiedad.codigo} · {propiedad.tipo} · {propiedad.gestion}</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="btn btn-ghost" onClick={() => navigate(`/propiedades/${propiedad.id}/editar`)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
            </svg>
            Editar
          </button>
          <span className="prop-badge-estado" style={{ background: ESTADO_COLORS[propiedad.estado], position: 'static', fontSize: '0.8125rem', padding: '6px 14px' }}>
            {propiedad.estado.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* State Transitions */}
      {transiciones.length > 0 && (
        <div className="prop-detail-section">
          <h3>Cambiar Estado</h3>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {transiciones.map((estado) => (
              <button
                key={estado}
                className="btn btn-ghost"
                style={{ borderColor: ESTADO_COLORS[estado], color: ESTADO_COLORS[estado] }}
                onClick={() => handleEstado(estado)}
              >
                → {estado.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Info Grid */}
      <div className="prop-detail-grid">
        {/* Prices */}
        <div className="prop-detail-section">
          <h3>Precios</h3>
          {propiedad.gestion !== 'RENTA' && (
            <div className="prop-detail-row">
              <span>Venta</span>
              <strong>{formatPrice(propiedad.precio_venta, propiedad.moneda)}</strong>
            </div>
          )}
          {propiedad.gestion !== 'VENTA' && (
            <div className="prop-detail-row">
              <span>Renta/mes</span>
              <strong>{formatPrice(propiedad.precio_renta, propiedad.moneda)}</strong>
            </div>
          )}
          {propiedad.comision_porcentaje && (
            <div className="prop-detail-row">
              <span>Comisión</span>
              <strong>{propiedad.comision_porcentaje}%</strong>
            </div>
          )}
        </div>

        {/* Location */}
        <div className="prop-detail-section">
          <h3>Ubicación</h3>
          {propiedad.pais && <div className="prop-detail-row"><span>País</span><strong>{propiedad.pais}</strong></div>}
          {propiedad.departamento && <div className="prop-detail-row"><span>Departamento / Estado</span><strong>{propiedad.departamento}</strong></div>}
          {propiedad.municipio && <div className="prop-detail-row"><span>Municipio</span><strong>{propiedad.municipio}</strong></div>}
          {propiedad.zona && <div className="prop-detail-row"><span>Zona</span><strong>{propiedad.zona}</strong></div>}
          {propiedad.direccion && <div className="prop-detail-row"><span>Dirección</span><strong>{propiedad.direccion}</strong></div>}
        </div>

        {/* Features */}
        <div className="prop-detail-section">
          <h3>Características</h3>
          <div className="prop-detail-features">
            {propiedad.habitaciones != null && <div className="prop-feat-item"><span className="prop-feat-icon">🛏️</span><span>{propiedad.habitaciones} hab.</span></div>}
            {propiedad.banos != null && <div className="prop-feat-item"><span className="prop-feat-icon">🚿</span><span>{propiedad.banos} baños</span></div>}
            {propiedad.parqueos != null && <div className="prop-feat-item"><span className="prop-feat-icon">🚗</span><span>{propiedad.parqueos} parq.</span></div>}
            {propiedad.niveles != null && <div className="prop-feat-item"><span className="prop-feat-icon">📐</span><span>{propiedad.niveles} niveles</span></div>}
            {propiedad.area_terreno_m2 && <div className="prop-feat-item"><span className="prop-feat-icon">📏</span><span>{propiedad.area_terreno_m2} m² terreno</span></div>}
            {propiedad.area_construccion_m2 && <div className="prop-feat-item"><span className="prop-feat-icon">🏗️</span><span>{propiedad.area_construccion_m2} m² const.</span></div>}
          </div>
        </div>

        {/* Agent */}
        {propiedad.agente && (
          <div className="prop-detail-section">
            <h3>Agente Asignado</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div className="prop-card-agent-avatar">{propiedad.agente.nombre[0]}</div>
              <div>
                <div style={{ fontWeight: 600 }}>{propiedad.agente.nombre}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{propiedad.agente.email}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Images Upload */}
      <div className="prop-detail-section" style={{ marginTop: 8 }}>
        <h3>Galería de Imágenes ({propiedad.imagenes?.length || 0})</h3>
        <ImageUpload
          propiedadId={propiedad.id}
          imagenes={propiedad.imagenes || []}
          onUpdate={fetchProperty}
        />
      </div>

      {/* ── Modal WhatsApp ─────────────────────────────────── */}
      {waOpen && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 1000, padding: 16,
          }}
          onClick={(e) => { if (e.target === e.currentTarget) setWaOpen(false); }}
        >
          <div style={{
            background: 'var(--bg-card)', borderRadius: 12, padding: 28,
            width: '100%', maxWidth: 480,
            border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 16,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>📲 Compartir por WhatsApp</h3>
              <button className="btn btn-ghost" style={{ padding: '4px 8px', height: 'auto' }} onClick={() => setWaOpen(false)}>✕</button>
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label>Número de teléfono <span style={{ color: '#ef4444' }}>*</span></label>
              <input
                className="input-field"
                placeholder="Ej: 50212345678 o +502 1234 5678"
                value={waPhone}
                onChange={(e) => setWaPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleWaEnviar()}
                autoFocus
              />
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Incluye el código de país (Guatemala: 502). Se admiten espacios y guiones.
              </p>
            </div>

            <div className="input-group" style={{ margin: 0 }}>
              <label>Mensaje personalizado <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span></label>
              <textarea
                className="input-field"
                style={{ resize: 'vertical', minHeight: 90, fontSize: '0.875rem' }}
                placeholder="Si no escribes nada se usará un texto automático con el título y precio de la propiedad."
                value={waMensaje}
                onChange={(e) => setWaMensaje(e.target.value)}
                maxLength={1024}
              />
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)', textAlign: 'right' }}>
                {waMensaje.length}/1024
              </p>
            </div>

            {waError && (
              <div style={{ background: '#ef444422', border: '1px solid #ef444444', borderRadius: 6, padding: '10px 14px', fontSize: '0.875rem', color: '#ef4444' }}>
                {waError}
              </div>
            )}

            {waResult && (
              <div style={{ background: '#22c55e22', border: '1px solid #22c55e44', borderRadius: 6, padding: '10px 14px', fontSize: '0.875rem' }}>
                {waResult.status === 'ENVIADO' && (
                  <span>✅ Brochure enviado por WhatsApp a <strong>+{waResult.telefono}</strong></span>
                )}
                {waResult.status === 'LINK_GENERADO' && (
                  <span>
                    📲 Se abrió WhatsApp en una pestaña nueva.{' '}
                    <a href={waResult.wa_link} target="_blank" rel="noreferrer" style={{ color: '#22c55e' }}>
                      Abrir de nuevo
                    </a>
                    <br />
                    <small style={{ color: 'var(--text-muted)' }}>
                      (Configura WHATSAPP_API_TOKEN para enviar el PDF adjunto automáticamente)
                    </small>
                  </span>
                )}
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleWaEnviar}
              disabled={waLoading}
              style={{ width: '100%' }}
            >
              {waLoading ? <><div className="spinner" /> Enviando...</> : '📲 Enviar'}
            </button>

            {/* Historial */}
            {waHistorial.length > 0 && (
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <p style={{ margin: '0 0 10px', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                  Envíos anteriores
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {waHistorial.slice(0, 8).map((e: any) => (
                    <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.8125rem' }}>
                      <span style={{
                        padding: '1px 8px', borderRadius: 10, fontSize: '0.7rem', flexShrink: 0,
                        background: e.status === 'ENVIADO' ? '#22c55e22' : e.status === 'LINK' ? '#3b82f622' : '#ef444422',
                        color:      e.status === 'ENVIADO' ? '#22c55e'   : e.status === 'LINK' ? '#3b82f6'   : '#ef4444',
                      }}>
                        {e.status === 'LINK' ? 'LINK' : e.status}
                      </span>
                      <span style={{ fontFamily: 'monospace' }}>+{e.telefono_destino}</span>
                      <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', flexShrink: 0 }}>
                        {new Date(e.enviado_at).toLocaleDateString('es-GT', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Expediente Legal */}
      <div className="prop-detail-section" style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>Expediente Legal ({propiedad.documentos?.length || 0})</h3>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={handleBrochure}
              disabled={brochureState === 'generating'}
              className="btn btn-ghost"
              style={{ fontSize: '0.8125rem' }}
            >
              {brochureState === 'generating' ? '⏳ Generando…' : brochureState === 'error' ? '❌ Error' : '🏷️ Brochure PDF'}
            </button>
            <button
              onClick={openWaModal}
              className="btn btn-ghost"
              style={{ fontSize: '0.8125rem' }}
            >
              📲 WhatsApp
            </button>
            <button
              onClick={async () => {
                try {
                  const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/propiedades/${propiedad.id}/carta-comision`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                  });
                  if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.message || 'Error al generar carta');
                  }
                  const blob = await res.blob();
                  const url = URL.createObjectURL(blob);
                  window.open(url, '_blank');
                } catch (err: any) {
                  alert(err.message);
                }
              }}
              className="btn btn-ghost"
              style={{ fontSize: '0.8125rem' }}
            >
              📄 Carta de Comisión
            </button>
          </div>
        </div>
        <DocumentUpload
          propiedadId={propiedad.id}
          documentos={propiedad.documentos || []}
          onUpdate={fetchProperty}
        />
      </div>
    </div>
  );
}
