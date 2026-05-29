import Link from 'next/link';
import Image from 'next/image';
import { PropiedadPublica, fmtPrecio, TIPO_LABELS, GESTION_LABELS } from '@/lib/api';
import FavoriteButton from './FavoriteButton';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function PropertyCard({ p }: { p: PropiedadPublica }) {
  const img  = p.imagenes?.[0];
  const isVenta = p.gestion === 'VENTA' || p.gestion === 'AMBAS';
  const precio  = p.gestion === 'RENTA' ? p.precio_renta : (p.precio_venta ?? p.precio_renta);

  return (
    <Link href={`/propiedades/${p.id}`} className="prop-card">
      <div className="prop-card-img" style={{ position: 'relative' }}>
        {img ? (
          <Image
            src={img.url.startsWith('http') ? img.url : `${API}${img.url}`}
            alt={img.alt || p.titulo}
            fill
            sizes="(max-width: 768px) 100vw, 320px"
            style={{ objectFit: 'cover' }}
          />
        ) : (
          <div className="prop-card-no-img">🏠</div>
        )}
        <span className={`prop-card-badge ${isVenta ? 'prop-card-badge-venta' : 'prop-card-badge-renta'}`}>
          {GESTION_LABELS[p.gestion] ?? p.gestion}
        </span>
        <FavoriteButton propiedadId={p.id} />
      </div>

      <div className="prop-card-body">
        <div className="prop-card-tipo">{TIPO_LABELS[p.tipo] ?? p.tipo}</div>
        <div className="prop-card-title">{p.titulo}</div>
        {(p.departamento || p.zona) && (
          <div className="prop-card-location">
            <span>📍</span>
            {[p.zona, p.municipio, p.departamento].filter(Boolean).join(', ')}
          </div>
        )}
        <div className="prop-card-price">
          {fmtPrecio(precio, p.moneda)}
          {p.gestion === 'RENTA' && <span> /mes</span>}
        </div>
        <div className="prop-card-specs">
          {p.habitaciones != null && (
            <span className="prop-spec">🛏 {p.habitaciones}</span>
          )}
          {p.banos != null && (
            <span className="prop-spec">🚿 {p.banos}</span>
          )}
          {p.area_construccion_m2 != null && (
            <span className="prop-spec">📐 {p.area_construccion_m2} m²</span>
          )}
        </div>
      </div>
    </Link>
  );
}
