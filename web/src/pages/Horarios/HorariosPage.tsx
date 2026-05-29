import { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import { useToast } from '../../components/Toast';
import './Horarios.css';

const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

interface Horario {
  id?: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
}

function defaultHorarios(): Horario[] {
  return DIAS.map((_, i) => ({
    dia_semana: i,
    hora_inicio: '09:00',
    hora_fin: '18:00',
    activo: i >= 1 && i <= 5, // lunes–viernes activos por defecto
  }));
}

export default function HorariosPage() {
  const { accessToken } = useAuthStore();
  const toast = useToast();
  const [horarios, setHorarios] = useState<Horario[]>(defaultHorarios());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    apiRequest<Horario[]>('/api/horarios/me', { token: accessToken! })
      .then((data) => {
        if (data.length > 0) {
          const map = new Map(data.map((h) => [h.dia_semana, h]));
          setHorarios(defaultHorarios().map((d) => map.get(d.dia_semana) ?? d));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [accessToken]);

  const setField = (dia: number, field: keyof Horario, value: any) => {
    setHorarios((prev) =>
      prev.map((h) => (h.dia_semana === dia ? { ...h, [field]: value } : h)),
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        horarios: horarios.map((h) => ({
          diaSemana: h.dia_semana,
          horaInicio: h.hora_inicio,
          horaFin: h.hora_fin,
          activo: h.activo,
        })),
      };
      const saved = await apiRequest<Horario[]>('/api/horarios/me', {
        method: 'PUT',
        body: payload,
        token: accessToken!,
      });
      const map = new Map(saved.map((h) => [h.dia_semana, h]));
      setHorarios(defaultHorarios().map((d) => map.get(d.dia_semana) ?? d));
      toast.success('Horario guardado correctamente');
    } catch {
      toast.error('Error al guardar el horario');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="horarios-page">
      <div className="horarios-header">
        <div>
          <h1>Mi Horario Laboral</h1>
          <p>Define tus días y horas de trabajo. Las visitas fuera de horario mostrarán una advertencia.</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Guardando...' : 'Guardar horario'}
        </button>
      </div>

      {loading ? (
        <div className="horarios-skeleton">
          {DIAS.map((_, i) => <div key={i} className="horarios-skeleton-row" />)}
        </div>
      ) : (
        <div className="horarios-grid">
          {horarios.map((h) => (
            <div key={h.dia_semana} className={`horario-row${h.activo ? '' : ' inactive'}`}>
              <label className="horario-toggle">
                <input
                  type="checkbox"
                  checked={h.activo}
                  onChange={(e) => setField(h.dia_semana, 'activo', e.target.checked)}
                />
                <span className="horario-dia">{DIAS[h.dia_semana]}</span>
              </label>

              <div className="horario-times">
                <div className="horario-time-group">
                  <label>Entrada</label>
                  <input
                    type="time"
                    value={h.hora_inicio}
                    disabled={!h.activo}
                    onChange={(e) => setField(h.dia_semana, 'hora_inicio', e.target.value)}
                  />
                </div>
                <span className="horario-sep">–</span>
                <div className="horario-time-group">
                  <label>Salida</label>
                  <input
                    type="time"
                    value={h.hora_fin}
                    disabled={!h.activo}
                    onChange={(e) => setField(h.dia_semana, 'hora_fin', e.target.value)}
                  />
                </div>
              </div>

              {!h.activo && (
                <span className="horario-off-label">Día libre</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
