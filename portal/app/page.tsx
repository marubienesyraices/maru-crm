import { Suspense } from 'react';
import Link from 'next/link';
import { getPropiedades, Filtros } from '@/lib/api';
import Header from '@/components/Header';
import PropertyCard from '@/components/PropertyCard';
import PropertyFilters from '@/components/PropertyFilters';

const WA      = process.env.NEXT_PUBLIC_WHATSAPP || '';
const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME || 'Maru Bienes y Raíces';

interface PageProps {
  searchParams: {
    tipo?: string; gestion?: string; departamento?: string; busqueda?: string;
    precioMin?: string; precioMax?: string; habitacionesMin?: string; page?: string;
  };
}

export default async function HomePage({ searchParams }: PageProps) {
  const filtros: Filtros = {
    tipo:            searchParams.tipo,
    gestion:         searchParams.gestion,
    departamento:    searchParams.departamento,
    busqueda:        searchParams.busqueda,
    precioMin:       searchParams.precioMin,
    precioMax:       searchParams.precioMax,
    habitacionesMin: searchParams.habitacionesMin,
    page:            searchParams.page,
  };

  let result = { data: [], meta: { total: 0, totalPages: 1, page: 1, limit: 12 } };
  try {
    result = await getPropiedades(filtros);
  } catch { /* API not available yet */ }

  const { data: propiedades, meta } = result;
  const currentPage = meta.page;

  const buildUrl = (page: number) => {
    const params = new URLSearchParams();
    Object.entries(filtros).forEach(([k, v]) => { if (v) params.set(k, v); });
    params.set('page', String(page));
    return `/?${params.toString()}`;
  };

  return (
    <>
      <Header />

      {/* ── Hero ── */}
      <section className="portal-hero">
        <h1>Encuentra tu próximo<br /><em>hogar ideal</em></h1>
        <p>Casas, apartamentos, locales y terrenos en Guatemala. Asesoría personalizada con {COMPANY}.</p>
        <form className="portal-search-bar" action="/" method="get">
          <input name="busqueda" defaultValue={searchParams.busqueda} placeholder="Buscar por zona, municipio, código..." />
          <select name="tipo" defaultValue={searchParams.tipo ?? ''}>
            <option value="">Tipo de propiedad</option>
            <option value="CASA">Casa</option>
            <option value="APARTAMENTO">Apartamento</option>
            <option value="LOCAL_COMERCIAL">Local comercial</option>
            <option value="OFICINA">Oficina</option>
            <option value="TERRENO">Terreno</option>
            <option value="FINCA">Finca</option>
          </select>
          <select name="gestion" defaultValue={searchParams.gestion ?? ''}>
            <option value="">Venta o Renta</option>
            <option value="VENTA">Venta</option>
            <option value="RENTA">Renta</option>
          </select>
          <button type="submit">🔍 Buscar</button>
        </form>
      </section>

      {/* ── Stats strip ── */}
      <div className="portal-stats">
        <div className="portal-stat">
          <div className="portal-stat-num">{meta.total}</div>
          <div className="portal-stat-lbl">Propiedades disponibles</div>
        </div>
        <div className="portal-stat">
          <div className="portal-stat-num">10+</div>
          <div className="portal-stat-lbl">Años de experiencia</div>
        </div>
        <div className="portal-stat">
          <div className="portal-stat-num">500+</div>
          <div className="portal-stat-lbl">Clientes satisfechos</div>
        </div>
      </div>

      {/* ── Body: filters + grid ── */}
      <div className="portal-body">
        <Suspense fallback={null}>
          <PropertyFilters />
        </Suspense>

        <main>
          <div className="portal-grid-header">
            <span className="portal-grid-count">
              {meta.total} propiedad{meta.total !== 1 ? 'es' : ''} encontrada{meta.total !== 1 ? 's' : ''}
              {searchParams.busqueda && ` para "${searchParams.busqueda}"`}
            </span>
          </div>

          {propiedades.length === 0 ? (
            <div className="portal-empty">
              <div style={{ fontSize: '3rem' }}>🏠</div>
              <h3>Sin propiedades disponibles</h3>
              <p>Prueba con diferentes filtros o contáctanos.</p>
            </div>
          ) : (
            <div className="portal-grid">
              {propiedades.map((p) => <PropertyCard key={p.id} p={p} />)}
            </div>
          )}

          {/* Pagination */}
          {meta.totalPages > 1 && (
            <div className="portal-pagination">
              <Link
                href={buildUrl(currentPage - 1)}
                className={`portal-page-btn${currentPage <= 1 ? ' disabled' : ''}`}
                aria-disabled={currentPage <= 1}
              >‹ Anterior</Link>

              {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => i + 1).map((n) => (
                <Link key={n} href={buildUrl(n)} className={`portal-page-btn${n === currentPage ? ' active' : ''}`}>
                  {n}
                </Link>
              ))}

              <Link
                href={buildUrl(currentPage + 1)}
                className={`portal-page-btn${currentPage >= meta.totalPages ? ' disabled' : ''}`}
                aria-disabled={currentPage >= meta.totalPages}
              >Siguiente ›</Link>
            </div>
          )}
        </main>
      </div>

      {/* ── Footer ── */}
      <footer className="portal-footer" id="nosotros">
        <strong>{COMPANY}</strong><br />
        Tu aliado de confianza en bienes raíces en Guatemala.
        {WA && <><br /><a href={`https://wa.me/${WA}`} target="_blank" rel="noreferrer">WhatsApp: +{WA}</a></>}
        <br /><br />© {new Date().getFullYear()} {COMPANY}. Todos los derechos reservados.
      </footer>

      {WA && (
        <a href={`https://wa.me/${WA}`} target="_blank" rel="noreferrer" className="wa-float" title="Contáctanos por WhatsApp">
          💬
        </a>
      )}
    </>
  );
}
