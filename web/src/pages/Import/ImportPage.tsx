import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ImportModal, { type ImportEntity } from '../../components/ImportModal';

export default function ImportPage() {
  const navigate = useNavigate();
  const [entity, setEntity] = useState<ImportEntity | null>(null);

  return (
    <div style={{ padding: '24px 32px', maxWidth: 820, margin: '0 auto' }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 700 }}>Importación masiva</h1>
        <p style={{ margin: '6px 0 0', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
          Importa clientes o propiedades desde archivos Excel (.xlsx) o CSV. Máximo 500 registros por importación.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {/* Clientes */}
        <button
          className="import-card"
          onClick={() => setEntity('clientes')}
        >
          <div className="import-card-icon">👥</div>
          <div>
            <div className="import-card-title">Clientes</div>
            <div className="import-card-desc">
              Importa hasta 500 clientes con nombre, email, teléfono, DPI y origen.
            </div>
            <div className="import-card-cols">
              <span>nombre *</span>
              <span>email</span>
              <span>telefono</span>
              <span>dpi</span>
              <span>origen</span>
              <span>notas</span>
            </div>
          </div>
        </button>

        {/* Propiedades */}
        <button
          className="import-card"
          onClick={() => setEntity('propiedades')}
        >
          <div className="import-card-icon">🏠</div>
          <div>
            <div className="import-card-title">Propiedades</div>
            <div className="import-card-desc">
              Importa hasta 200 propiedades con tipo, gestión, precio y ubicación.
            </div>
            <div className="import-card-cols">
              <span>titulo *</span>
              <span>tipo *</span>
              <span>gestion *</span>
              <span>precio_venta</span>
              <span>zona</span>
              <span>habitaciones</span>
            </div>
          </div>
        </button>
      </div>

      {/* Instructions */}
      <div style={{
        marginTop: 32, padding: '20px 24px',
        background: 'var(--bg-card)', border: '1px solid var(--border-subtle)',
        borderRadius: 10,
      }}>
        <h3 style={{ margin: '0 0 12px', fontSize: '0.9375rem', fontWeight: 600 }}>
          Instrucciones
        </h3>
        <ol style={{ margin: 0, paddingLeft: 20, fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          <li>Selecciona el tipo de datos que deseas importar (Clientes o Propiedades).</li>
          <li>Descarga la plantilla CSV y completa los datos en Excel o cualquier editor.</li>
          <li>La primera fila debe ser el encabezado — los campos marcados con <strong>*</strong> son obligatorios.</li>
          <li>Guarda el archivo como <code>.xlsx</code> o <code>.csv</code> y súbelo.</li>
          <li>El sistema mostrará un resumen de registros creados, omitidos y errores.</li>
        </ol>

        <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(251,191,36,0.08)', borderRadius: 8, fontSize: '0.8125rem', color: '#f59e0b' }}>
          <strong>Nota:</strong> Los correos duplicados dentro del mismo tenant serán omitidos automáticamente.
          Para propiedades, el código se genera automáticamente.
        </div>
      </div>

      <div style={{ marginTop: 20, display: 'flex', gap: 8 }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)}>
          ← Volver
        </button>
      </div>

      {entity && (
        <ImportModal
          entity={entity}
          onClose={() => setEntity(null)}
          onSuccess={() => {
            setTimeout(() => {
              navigate(entity === 'clientes' ? '/clientes' : '/propiedades');
            }, 1500);
          }}
        />
      )}
    </div>
  );
}
