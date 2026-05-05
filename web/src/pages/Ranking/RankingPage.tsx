import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { apiRequest } from '../../lib/api';
import './Ranking.css';

interface BadgeConfig { id: string; emoji: string; label: string; desc: string }
interface RankEntry {
  posicion: number; id: string; nombre: string; esYo: boolean; rol: string | null;
  puntos: number; ganados: number; tasaConversion: number; comisionTotal: number | null;
  visitasRealizadas: number; numInteracciones: number; badges: string[];
}
interface RankingData { ranking: RankEntry[]; badgesConfig: BadgeConfig[]; cacheAt: string }

const MEDAL = ['🥇', '🥈', '🥉'];

function BadgePills({ badges, config }: { badges: string[]; config: BadgeConfig[] }) {
  const map = Object.fromEntries(config.map(b => [b.id, b]));
  return (
    <>
      {badges.map(id => {
        const b = map[id];
        if (!b) return null;
        return (
          <span key={id} className="badge-pill" title={b.desc}>
            {b.emoji} {b.label}
          </span>
        );
      })}
    </>
  );
}

function PodiumSlot({ entry, pos, config }: { entry: RankEntry; pos: 1 | 2 | 3; config: BadgeConfig[] }) {
  return (
    <div className={`podium-slot podium-slot-${pos}`}>
      <div className="podium-card">
        {entry.esYo && <span className="podium-yo">Tú</span>}
        <span className="podium-medal">{MEDAL[pos - 1]}</span>
        <div className="podium-avatar">{entry.nombre[0]?.toUpperCase()}</div>
        <div className="podium-name" title={entry.nombre}>{entry.nombre}</div>
        <div className="podium-pts">{entry.puntos.toLocaleString()} <span>pts</span></div>
        <div className="podium-badges">
          <BadgePills badges={entry.badges} config={config} />
        </div>
      </div>
      <div className="podium-base">{pos}°</div>
    </div>
  );
}

export default function RankingPage() {
  const { accessToken, user } = useAuthStore();
  const isAdmin = user?.rol === 'ADMIN' || user?.rol === 'SUPER_ADMIN';

  const today = new Date();
  const defaultDesde = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const defaultHasta = today.toISOString().slice(0, 10);

  const [desde, setDesde] = useState(defaultDesde);
  const [hasta, setHasta] = useState(defaultHasta);
  const [data, setData] = useState<RankingData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (desde) params.set('desde', desde);
      if (hasta) params.set('hasta', hasta);
      const res = await apiRequest<RankingData>(`/api/bi/ranking?${params}`, { token: accessToken! });
      setData(res);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [desde, hasta, accessToken]);

  useEffect(() => { fetchRanking(); }, [fetchRanking]);

  if (loading) {
    return (
      <div className="ranking-page">
        <div className="ranking-loading"><div className="spinner" /><span>Calculando ranking…</span></div>
      </div>
    );
  }

  if (!data || data.ranking.length === 0) {
    return (
      <div className="ranking-page">
        <div className="ranking-loading">Sin agentes activos en el período.</div>
      </div>
    );
  }

  const { ranking, badgesConfig } = data;

  // Podium order: 2nd left, 1st center, 3rd right
  const top3 = ranking.slice(0, 3);
  const rest = ranking.slice(3);

  const podiumOrder: (RankEntry | undefined)[] = [top3[1], top3[0], top3[2]];

  const fmtMoney = (v: number | null) =>
    v == null ? null : new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="ranking-page">
      <div className="ranking-header">
        <h1>🏆 Ranking de Agentes</h1>
        <div className="ranking-period">
          <label>Desde</label>
          <input type="date" value={desde} onChange={e => setDesde(e.target.value)} max={hasta} />
          <label>Hasta</label>
          <input type="date" value={hasta} onChange={e => setHasta(e.target.value)} min={desde} max={defaultHasta} />
        </div>
      </div>

      {!isAdmin && (
        <div className="ranking-anon-notice">
          🔒 Los nombres de otros agentes están ocultos. Solo tú y los administradores ven el ranking completo.
        </div>
      )}

      {/* Podium */}
      {top3.length > 0 && (
        <div className="podium-wrap">
          {podiumOrder.map((entry, i) => {
            const pos = [2, 1, 3][i] as 1 | 2 | 3;
            if (!entry) return <div key={i} className={`podium-slot podium-slot-${pos}`} style={{ opacity: 0 }} />;
            return <PodiumSlot key={entry.id} entry={entry} pos={pos} config={badgesConfig} />;
          })}
        </div>
      )}

      {/* Full leaderboard */}
      <div className="ranking-list">
        {ranking.map((entry) => (
          <div key={entry.id} className={`ranking-row ${entry.esYo ? 'es-yo' : ''}`}>
            <div className="ranking-pos">
              {entry.posicion <= 3 ? MEDAL[entry.posicion - 1] : `${entry.posicion}.`}
            </div>
            <div className="ranking-avatar">{entry.nombre[0]?.toUpperCase()}</div>
            <div className="ranking-info">
              <div className="ranking-name">
                {entry.nombre}
                {entry.esYo && <span className="ranking-yo-tag">Tú</span>}
              </div>
              <div className="ranking-stats">
                {entry.ganados} cierres · {entry.tasaConversion}% conv. · {entry.visitasRealizadas} visitas · {entry.numInteracciones} interacciones
                {entry.comisionTotal != null && ` · ${fmtMoney(entry.comisionTotal)}`}
              </div>
              {entry.badges.length > 0 && (
                <div className="ranking-badges" style={{ marginTop: 6 }}>
                  <BadgePills badges={entry.badges} config={badgesConfig} />
                </div>
              )}
            </div>
            <div className="ranking-pts">
              {entry.puntos.toLocaleString()} <span>pts</span>
            </div>
          </div>
        ))}
      </div>

      {/* Badge legend */}
      <div className="badges-legend">
        <h4>Insignias</h4>
        <div className="badges-grid">
          {badgesConfig.map((b) => (
            <div key={b.id} className="badge-legend-item">
              <span className="badge-legend-emoji">{b.emoji}</span>
              <div className="badge-legend-text">
                <strong>{b.label}</strong>
                <span>{b.desc}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 16 }}>
        Sistema de puntos: cierre ganado = 100 pts · visita = 15 pts · interacción = 5 pts · bonus conversión si ≥ 50%.
        Datos en caché · actualizado {new Date(data.cacheAt).toLocaleTimeString('es-GT')}
      </p>
    </div>
  );
}
