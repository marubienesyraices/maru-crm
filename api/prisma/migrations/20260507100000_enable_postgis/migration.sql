-- Motor de precios sugerido con PostGIS (HU-05.01)
-- Requiere usuario con privilegio SUPERUSER o permisos de CREATE EXTENSION.
-- En producción, ejecutar esta migración con el usuario postgres antes de migrate deploy.

CREATE EXTENSION IF NOT EXISTS postgis;

-- Índice GIST parcial sobre las coordenadas de propiedades para acelerar ST_DWithin.
-- Solo indexa filas con coordenadas (latitud IS NOT NULL AND longitud IS NOT NULL).
CREATE INDEX IF NOT EXISTS idx_propiedades_geom
  ON propiedades
  USING GIST (
    (ST_SetSRID(ST_MakePoint(longitud::float8, latitud::float8), 4326)::geography)
  )
  WHERE latitud IS NOT NULL AND longitud IS NOT NULL;
