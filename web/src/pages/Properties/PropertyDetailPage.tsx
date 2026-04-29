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

      {/* Expediente Legal */}
      <div className="prop-detail-section" style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h3>Expediente Legal ({propiedad.documentos?.length || 0})</h3>
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
            style={{ fontSize: '0.8125rem', borderColor: 'var(--border-color)' }}
          >
            📄 Generar Carta de Comisión
          </button>
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
