import { useState, useEffect } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { apiRequest } from '../../../lib/api';
import './OrgChart.css';

interface OrgNode {
  id: string;
  nombre: string;
  email: string;
  rol: string;
  id_supervisor: string | null;
  subordinados: OrgNode[];
}

const ROL_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Administrador',
  SENIOR: 'Agente Senior',
  JUNIOR: 'Agente Junior',
};

const ROL_COLOR: Record<string, string> = {
  SUPER_ADMIN: '#7c3aed',
  ADMIN:       '#1d4ed8',
  SENIOR:      '#0369a1',
  JUNIOR:      '#047857',
};

function OrgNode({ node, depth = 0 }: { node: OrgNode; depth?: number }) {
  const [collapsed, setCollapsed] = useState(false);
  const hasChildren = node.subordinados.length > 0;
  const color = ROL_COLOR[node.rol] ?? '#6b7280';

  return (
    <div className="org-node-wrap">
      <div className="org-card" style={{ borderTopColor: color }}>
        <div className="org-card-avatar" style={{ background: `${color}22`, color }}>
          {node.nombre[0]?.toUpperCase()}
        </div>
        <div className="org-card-info">
          <span className="org-card-name">{node.nombre}</span>
          <span className="org-card-rol" style={{ color }}>{ROL_LABEL[node.rol] ?? node.rol}</span>
          <span className="org-card-email">{node.email}</span>
        </div>
        {hasChildren && (
          <button
            className="org-toggle"
            onClick={() => setCollapsed((v) => !v)}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? `+${node.subordinados.length}` : '−'}
          </button>
        )}
      </div>

      {hasChildren && !collapsed && (
        <div className="org-children">
          <div className="org-connector-v" />
          <div className="org-row">
            {node.subordinados.map((child, idx) => (
              <div key={child.id} className="org-branch">
                {node.subordinados.length > 1 && (
                  <div
                    className="org-connector-h"
                    style={{
                      left: idx === 0 ? '50%' : 0,
                      right: idx === node.subordinados.length - 1 ? '50%' : 0,
                    }}
                  />
                )}
                <div className="org-connector-v org-connector-down" />
                <OrgNode node={child} depth={depth + 1} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function OrgChartPage() {
  const { accessToken } = useAuthStore();
  const [tree, setTree]     = useState<OrgNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');

  useEffect(() => {
    apiRequest<OrgNode[]>('/api/users/hierarchy', { token: accessToken! })
      .then(setTree)
      .catch(() => setError('No se pudo cargar el organigrama'))
      .finally(() => setLoading(false));
  }, [accessToken]);

  const countAll = (nodes: OrgNode[]): number =>
    nodes.reduce((acc, n) => acc + 1 + countAll(n.subordinados), 0);

  return (
    <div className="orgchart-page">
      <div className="orgchart-header">
        <div>
          <h1>Organigrama</h1>
          {!loading && !error && (
            <p>{countAll(tree)} agentes activos · Haz clic en el botón − para colapsar ramas</p>
          )}
        </div>
      </div>

      {loading && (
        <div className="orgchart-loading">
          <div className="spinner" />
          <span>Cargando organigrama…</span>
        </div>
      )}

      {error && <div className="orgchart-error">{error}</div>}

      {!loading && !error && tree.length === 0 && (
        <div className="orgchart-empty">No hay usuarios activos en esta empresa.</div>
      )}

      {!loading && !error && tree.length > 0 && (
        <div className="orgchart-canvas">
          <div className="orgchart-roots">
            {tree.map((root) => (
              <OrgNode key={root.id} node={root} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
