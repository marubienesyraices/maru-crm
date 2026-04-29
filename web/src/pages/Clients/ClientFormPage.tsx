import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
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

export default function ClientFormPage() {
  const navigate = useNavigate();
  const { accessToken } = useAuthStore();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ nombre: '', email: '', telefono: '', dpi: '', origen: 'OTRO', notas: '' });

  const set = (f: string, v: string) => setForm((p) => ({ ...p, [f]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) { setError('El nombre es requerido'); return; }
    setSaving(true); setError('');
    try {
      await apiRequest('/api/clientes', { method: 'POST', body: form, token: accessToken! });
      navigate('/clientes');
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  return (
    <div className="client-form">
      <button className="btn btn-ghost" onClick={() => navigate('/clientes')} style={{ marginBottom: 8 }}>← Volver</button>
      <h1>Nuevo Cliente</h1>
      <form onSubmit={handleSubmit}>
        <div className="client-form-grid">
          <div className="form-group"><label className="form-label">Nombre *</label>
            <input className="form-input" value={form.nombre} onChange={(e) => set('nombre', e.target.value)} placeholder="Nombre completo" /></div>
          <div className="client-form-row">
            <div className="form-group"><label className="form-label">Email</label>
              <input className="form-input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="correo@ejemplo.com" /></div>
            <div className="form-group"><label className="form-label">Teléfono</label>
              <input className="form-input" value={form.telefono} onChange={(e) => set('telefono', e.target.value)} placeholder="+502 5555-1234" /></div>
          </div>
          <div className="form-group"><label className="form-label">DPI</label>
            <input className="form-input" value={form.dpi} onChange={(e) => set('dpi', e.target.value)} placeholder="Número de DPI" /></div>
          <div className="form-group"><label className="form-label">Origen</label>
            <div className="client-origen-options">
              {ORIGENES.map((o) => (<button key={o.value} type="button" className={`client-origen-btn ${form.origen === o.value ? 'active' : ''}`} onClick={() => set('origen', o.value)}>{o.label}</button>))}
            </div></div>
          <div className="form-group"><label className="form-label">Notas</label>
            <textarea className="form-input" rows={3} value={form.notas} onChange={(e) => set('notas', e.target.value)} placeholder="Información adicional..." /></div>
          {error && <div className="form-error">{error}</div>}
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ marginTop: 8 }}>{saving ? 'Guardando...' : 'Guardar Cliente'}</button>
        </div>
      </form>
    </div>
  );
}
