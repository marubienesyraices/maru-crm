import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { getPropiedad, getPropiedades, fmtPrecio, TIPO_LABELS, GESTION_LABELS } from '@/lib/api';
import { getPortalConfig } from '@/lib/portal-config';
import Header from '@/components/Header';
import ImageGallery from '@/components/ImageGallery';
import PropertyCard from '@/components/PropertyCard';
import RegistroInteresForm from '@/components/RegistroInteresForm';
import NearbyPlaces from '@/components/NearbyPlaces';

const WA      = process.env.NEXT_PUBLIC_WHATSAPP || '';
const EMAIL   = process.env.NEXT_PUBLIC_COMPANY_EMAIL || '';
const COMPANY = process.env.NEXT_PUBLIC_COMPANY_NAME || 'GestProp';
const API     = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const cfg  = await getPortalConfig();
  const prop = await getPropiedad(id, cfg.tenant_id);
  if (!prop) return { title: 'Propiedad no encontrada' };

  const precio = fmtPrecio(prop.precio_venta ?? prop.precio_renta, prop.moneda);
  const img    = prop.imagenes?.[0];
  const imgSrc = img ? (img.url.startsWith('http') ? img.url : `${API}${img.url}`) : undefined;

  return {
    title:       `${prop.titulo} | ${prop.codigo}`,
    description: prop.descripcion?.slice(0, 155) ?? `${TIPO_LABELS[prop.tipo] ?? prop.tipo} en ${prop.municipio ?? prop.departamento} — ${precio}`,
    openGraph:   {
      title:  prop.titulo,
      description: prop.descripcion?.slice(0, 155) ?? '',
      images: imgSrc ? [{ url: imgSrc, width: 1200, height: 630 }] : [],
    },
  };
}

export default async function PropiedadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const cfg  = await getPortalConfig();
  const prop = await getPropiedad(id, cfg.tenant_id);
  if (!prop) notFound();

  // Fetch related properties (same tipo, exclude current, mismo tenant)
  const related = await getPropiedades({ tipo: prop.tipo, page: '1', tenantId: cfg.tenant_id })
    .then(r => r.data.filter(p => p.id !== prop.id).slice(0, 3))
    .catch(() => []);

  const precio      = prop.gestion === 'RENTA' ? prop.precio_renta : (prop.precio_venta ?? prop.precio_renta);
  const precioLabel = fmtPrecio(precio, prop.moneda);
  const waMsg       = encodeURIComponent(`Hola, me interesa la propiedad ${prop.codigo} — ${prop.titulo}. ¿Podrían darme más información?`);
  const waHref      = WA ? `https://wa.me/${WA}?text=${waMsg}` : '#';
  const emailHref   = EMAIL ? `mailto:${EMAIL}?subject=Consulta sobre ${prop.codigo}&body=${waMsg}` : '#';

  const location = [prop.zona, prop.municipio, prop.departamento].filter(Boolean).join(', ');

  return (
    <>
      <Header />

      {/* Breadcrumb */}
      <div className="breadcrumb">
        <Link href="/">Propiedades</Link>
        <span>›</span>
        <span>{TIPO_LABELS[prop.tipo] ?? prop.tipo}</span>
        <span>›</span>
        <span>{prop.codigo}</span>
      </div>

      {/* Gallery */}
      <div style={{ maxWidth: 1100, margin: '16px auto', padding: '0 24px' }}>
        <ImageGallery imagenes={prop.imagenes} titulo={prop.titulo} />
      </div>

      {/* Body */}
      <div className="detail-body">
        <div>
          {/* Title block */}
          <div className="detail-section">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
              <div>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-faint)', marginBottom: 6 }}>
                  {TIPO_LABELS[prop.tipo] ?? prop.tipo} · {GESTION_LABELS[prop.gestion] ?? prop.gestion} · {prop.codigo}
                </p>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 700, lineHeight: 1.2, marginBottom: 8 }}>{prop.titulo}</h1>
                {location && (
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9375rem' }}>📍 {location}</p>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '1.875rem', fontWeight: 800, color: 'var(--accent)' }}>{precioLabel}</div>
                {prop.gestion === 'RENTA' && <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>por mes</div>}
                {prop.precio_venta && prop.precio_renta && (
                  <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
                    Venta: {fmtPrecio(prop.precio_venta, prop.moneda)}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Specs */}
          <div className="detail-section">
            <h2>Características</h2>
            <div className="detail-specs-grid">
              {prop.habitaciones != null && (
                <div className="detail-spec-chip">
                  <div className="val">🛏 {prop.habitaciones}</div>
                  <div className="lbl">Habitaciones</div>
                </div>
              )}
              {prop.banos != null && (
                <div className="detail-spec-chip">
                  <div className="val">🚿 {prop.banos}</div>
                  <div className="lbl">Baños</div>
                </div>
              )}
              {(prop as any).parqueos != null && (
                <div className="detail-spec-chip">
                  <div className="val">🚗 {(prop as any).parqueos}</div>
                  <div className="lbl">Parqueos</div>
                </div>
              )}
              {prop.area_construccion_m2 != null && (
                <div className="detail-spec-chip">
                  <div className="val">{prop.area_construccion_m2}</div>
                  <div className="lbl">m² construcción</div>
                </div>
              )}
              {prop.area_terreno_m2 != null && (
                <div className="detail-spec-chip">
                  <div className="val">{prop.area_terreno_m2}</div>
                  <div className="lbl">m² terreno</div>
                </div>
              )}
              {(prop as any).niveles != null && (
                <div className="detail-spec-chip">
                  <div className="val">{(prop as any).niveles}</div>
                  <div className="lbl">Niveles</div>
                </div>
              )}
            </div>
          </div>

          {/* Description */}
          {prop.descripcion && (
            <div className="detail-section">
              <h2>Descripción</h2>
              <p>{prop.descripcion}</p>
            </div>
          )}

          {/* Amenidades */}
          {prop.amenidades?.length > 0 && (
            <div className="detail-section">
              <h2>Amenidades</h2>
              <div className="detail-amenidades">
                {prop.amenidades.map((a) => <span key={a} className="amenidad-chip">{a}</span>)}
              </div>
            </div>
          )}

          {/* F-11: Puntos de interés cercanos (Overpass API, sin API key) */}
          {(prop as any).latitud && (prop as any).longitud && (
            <NearbyPlaces lat={Number((prop as any).latitud)} lng={Number((prop as any).longitud)} />
          )}

          {/* JSON-LD structured data */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'RealEstateListing',
              name: prop.titulo,
              description: prop.descripcion,
              url: typeof window !== 'undefined' ? window.location.href : '',
              offers: precio ? { '@type': 'Offer', price: precio, priceCurrency: prop.moneda } : undefined,
              address: {
                '@type': 'PostalAddress',
                addressLocality: prop.municipio ?? prop.departamento ?? 'Guatemala',
                addressCountry: 'GT',
              },
            })}}
          />
        </div>

        {/* Contact card */}
        <aside>
          <div className="contact-card">
            <h3>¿Te interesa esta propiedad?</h3>
            <div>
              <div className="contact-price-main">{precioLabel}</div>
              <div className="contact-price-sub">
                {TIPO_LABELS[prop.tipo] ?? prop.tipo} · {GESTION_LABELS[prop.gestion] ?? prop.gestion}
              </div>
            </div>
            <hr className="contact-divider" />
            {WA && (
              <a href={waHref} target="_blank" rel="noreferrer" className="contact-btn contact-btn-wa">
                💬 Consultar por WhatsApp
              </a>
            )}
            {EMAIL && (
              <a href={emailHref} className="contact-btn contact-btn-email">
                ✉️ Enviar correo
              </a>
            )}
            <hr className="contact-divider" />
            <div className="contact-info-row">
              <span>🏢</span> <span>{COMPANY}</span>
            </div>
            {(prop as any).agente && (
              <div className="contact-info-row">
                <span>👤</span> <span>Agente: {(prop as any).agente.nombre}</span>
              </div>
            )}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-faint)', textAlign: 'center', marginTop: 4 }}>
              Código: <strong>{prop.codigo}</strong>
            </div>
            <hr className="contact-divider" />
            <RegistroInteresForm propiedadId={prop.id} />
            <Link href="/" className="contact-btn contact-btn-ghost" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              ← Ver más propiedades
            </Link>
          </div>
        </aside>
      </div>

      {/* Related properties */}
      {related.length > 0 && (
        <section className="related-section">
          <h2 className="related-title">
            Propiedades similares — {TIPO_LABELS[prop.tipo] ?? prop.tipo}
          </h2>
          <div className="related-grid">
            {related.map(p => <PropertyCard key={p.id} p={p} />)}
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="portal-footer">
        <strong>{COMPANY}</strong><br />
        © {new Date().getFullYear()} {COMPANY}. Todos los derechos reservados.
      </footer>

      {WA && (
        <a href={waHref} target="_blank" rel="noreferrer" className="wa-float" title="Consultar por WhatsApp">
          💬
        </a>
      )}
    </>
  );
}
