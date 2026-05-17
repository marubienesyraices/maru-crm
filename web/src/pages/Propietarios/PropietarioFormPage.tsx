import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useToast } from '../../components/Toast';
import { usePropietario, useCreatePropietario, useUpdatePropietario } from '../../hooks/usePropietarios';
import './Propietarios.css';

const ESTADO_LABELS: Record<string, string> = {
  BORRADOR: 'Borrador', DISPONIBLE: 'Disponible', RESERVADA: 'Reservada',
  EN_NEGOCIACION: 'En negociación', VENDIDA: 'Vendida', RENTADA: 'Rentada',
};

const EMPTY_FORM = { nombre: '', telefono: '', email: '', dpi: '', nit: '', direccion: '', notas: '' };

export default function PropietarioFormPage() {
  const { id } = useParams<{ id?: string }>();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const toast = useToast();

  const { data: propietario, isLoading: loadingData } = usePropietario(id);
  const createMutation = useCreatePropietario();
  const updateMutation = useUpdatePropietario(id ?? '');

  const [form, setForm] = useState(EMPTY_FORM);

  useEffect(() => {
    if (propietario) {
      setForm({
        nombre:    propietario.nombre    ?? '',
        telefono:  propietario.telefono  ?? '',
        email:     propietario.email     ?? '',
        dpi:       propietario.dpi       ?? '',
        nit:       propietario.nit       ?? '',
        direccion: propietario.direccion ?? '',
        notas:     propietario.notas     ?? '',
      });
    }
  }, [propietario]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nombre.trim()) { toast.error('El nombre es requerido'); return; }

    const payload: Record<string, any> = { nombre: form.nombre.trim() };
    if (form.telefono.trim()) payload.telefono = form.telefono.trim();
    if (form.email.trim())    payload.email    = form.email.trim();
    if (form.dpi.trim())      payload.dpi      = form.dpi.trim();
    if (form.nit.trim())      payload.nit      = form.nit.trim();
    if (form.direccion.trim()) payload.direccion = form.direccion.trim();
    if (form.notas.trim())    payload.notas    = form.notas.trim();

    try {
      if (isEdit) {
        await updateMutation.mutateAsync(payload);
        toast.success('Propietario actualizado');
      } else {
        await createMutation.mutateAsync(payload);
        toast.success('Propietario creado');
        navigate('/propietarios');
      }
    } catch (err: any) {
      toast.error(err?.message ?? 'Error al guardar');
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  if (isEdit && loadingData) {
    return <div className="page-loading"><div className="spinner" /><span>Cargando...</span></div>;
  }

  return (
    <div className="propietario-form-page">
      {/* ── Header ── */}
      <div className="propietario-form-header">
        <button className="btn btn-ghost" onClick={() => navigate('/propietarios')} style={{ padding: '6px 10px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <h1>{isEdit ? 'Editar Propietario' : 'Nuevo Propietario'}</h1>
      </div>

      {/* ── Form ── */}
      <form className="propietario-form" onSubmit={handleSubmit}>
        {/* Nombre */}
        <div className="propietario-form-group">
          <label>Nombre completo *</label>
          <input
            value={form.nombre}
            onChange={set('nombre')}
            placeholder="Ej. María García López"
            required
          />
        </div>

        {/* Teléfono / Email */}
        <div className="propietario-form-row">
          <div className="propietario-form-group">
            <label>Teléfono</label>
            <input value={form.telefono} onChange={set('telefono')} placeholder="Ej. 5555-1234" />
          </div>
          <div className="propietario-form-group">
            <label>Correo electrónico</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="Ej. maria@email.com" />
          </div>
        </div>

        {/* DPI / NIT */}
        <div className="propietario-form-row">
          <div className="propietario-form-group">
            <label>DPI</label>
            <input value={form.dpi} onChange={set('dpi')} placeholder="13 dígitos" maxLength={13} />
            <span className="field-hint">Documento Personal de Identificación</span>
          </div>
          <div className="propietario-form-group">
            <label>NIT</label>
            <input value={form.nit} onChange={set('nit')} placeholder="Ej. 1234567-8" />
            <span className="field-hint">Número de identificación tributaria</span>
          </div>
        </div>

        {/* Dirección */}
        <div className="propietario-form-group">
          <label>Dirección</label>
          <input value={form.direccion} onChange={set('direccion')} placeholder="Ej. 6a Avenida 10-50, Zona 10, Guatemala" />
        </div>

        {/* Notas */}
        <div className="propietario-form-group">
          <label>Notas</label>
          <textarea value={form.notas} onChange={set('notas')} placeholder="Observaciones adicionales..." />
        </div>

        <div className="propietario-form-divider" />

        <div className="propietario-form-actions">
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/propietarios')}>
            Cancelar
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? <><span className="spinner" style={{ width: 14, height: 14, borderWidth: 2, marginRight: 6 }} />Guardando...</> : isEdit ? 'Guardar cambios' : 'Crear propietario'}
          </button>
        </div>
      </form>

      {/* ── Propiedades vinculadas (solo en edición) ── */}
      {isEdit && propietario?.propiedades?.length > 0 && (
        <div className="propietario-propiedades-section" style={{ marginTop: 24 }}>
          <h3>Propiedades vinculadas ({propietario.propiedades.length})</h3>
          {propietario.propiedades.map((prop: any) => (
            <div
              key={prop.id}
              className="propietario-prop-item"
              onClick={() => navigate(`/propiedades/${prop.id}`)}
            >
              <div>
                <span style={{ fontWeight: 500 }}>{prop.titulo}</span>
                <span className="propietario-prop-codigo" style={{ marginLeft: 8 }}>{prop.codigo}</span>
              </div>
              <span className="propietario-prop-estado">{ESTADO_LABELS[prop.estado] ?? prop.estado}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
