-- CreateTable: config_integraciones
CREATE TABLE "config_integraciones" (
    "id"                       TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenant_id"                TEXT NOT NULL,
    "resend_api_key"            TEXT,
    "email_from"               TEXT,
    "whatsapp_token"           TEXT,
    "whatsapp_phone_number_id" TEXT,
    "meta_page_token"          TEXT,
    "meta_page_id"             TEXT,
    "meta_ig_user_id"          TEXT,
    "zoom_account_id"          TEXT,
    "zoom_client_id"           TEXT,
    "zoom_client_secret"       TEXT,
    "docusign_integration_key" TEXT,
    "docusign_account_id"      TEXT,
    "docusign_user_id"         TEXT,
    "docusign_rsa_private_key" TEXT,
    "docusign_base_url"        TEXT,
    "encuentra24_api_key"      TEXT,
    "ml_access_token"          TEXT,
    "updated_at"               TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "config_integraciones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "config_integraciones_tenant_id_key" ON "config_integraciones"("tenant_id");

ALTER TABLE "config_integraciones"
    ADD CONSTRAINT "config_integraciones_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: config_portal
CREATE TABLE "config_portal" (
    "id"                           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "tenant_id"                    TEXT NOT NULL,
    "nombre_empresa"               TEXT,
    "slogan"                       TEXT,
    "email_contacto"               TEXT,
    "telefono"                     TEXT,
    "whatsapp"                     TEXT,
    "direccion"                    TEXT,
    "horario_atencion"             TEXT,
    "dominio_personalizado"        TEXT,
    "subdominio"                   TEXT,
    "portal_activo"                BOOLEAN NOT NULL DEFAULT true,
    "favicon_url"                  TEXT,
    "imagen_hero"                  TEXT,
    "titulo_hero"                  TEXT,
    "descripcion_hero"             TEXT,
    "footer_texto"                 TEXT,
    "seo_titulo"                   TEXT,
    "seo_descripcion"              TEXT,
    "seo_keywords"                 TEXT,
    "chatbot_activo"               BOOLEAN NOT NULL DEFAULT true,
    "chatbot_mensaje_bienvenida"   TEXT,
    "google_analytics_id"          TEXT,
    "facebook_pixel_id"            TEXT,
    "mapbox_token_publico"         TEXT,
    "mapa_lat_default"             DOUBLE PRECISION,
    "mapa_lng_default"             DOUBLE PRECISION,
    "mapa_zoom_default"            INTEGER DEFAULT 12,
    "updated_at"                   TIMESTAMP(3) NOT NULL DEFAULT now(),

    CONSTRAINT "config_portal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "config_portal_tenant_id_key"             ON "config_portal"("tenant_id");
CREATE UNIQUE INDEX "config_portal_dominio_personalizado_key" ON "config_portal"("dominio_personalizado");
CREATE UNIQUE INDEX "config_portal_subdominio_key"            ON "config_portal"("subdominio");

ALTER TABLE "config_portal"
    ADD CONSTRAINT "config_portal_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
