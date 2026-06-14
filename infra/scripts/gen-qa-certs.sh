#!/bin/bash
# Genera certificado self-signed wildcard para QA local
# Ejecutar en la VM Ubuntu: bash infra/scripts/gen-qa-certs.sh
#
# El certificado cubre: api-qa.gestprop.net, crm-qa.gestprop.net, qa.gestprop.net
# Válido por 825 días (límite aceptado por los browsers modernos)

set -e

CERTS_DIR="infra/certs-qa"
DOMAIN="gestprop.net"

mkdir -p "$CERTS_DIR"

# Archivo de extensiones SAN (Subject Alternative Names)
cat > /tmp/qa-san.cnf <<EOF
[req]
default_bits       = 2048
prompt             = no
default_md         = sha256
distinguished_name = dn
x509_extensions    = v3_req

[dn]
C  = GT
ST = Guatemala
L  = Guatemala
O  = GestProp QA
CN = qa.gestprop.net

[v3_req]
subjectAltName = @alt_names
keyUsage       = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = api-qa.gestprop.net
DNS.2 = crm-qa.gestprop.net
DNS.3 = qa.gestprop.net
EOF

openssl req -x509 -nodes -days 825 \
  -newkey rsa:2048 \
  -keyout "$CERTS_DIR/privkey.pem" \
  -out    "$CERTS_DIR/fullchain.pem" \
  -config /tmp/qa-san.cnf

echo ""
echo "Certificados generados en $CERTS_DIR/"
echo ""
echo "Siguiente paso — importar el CA en Windows para evitar el aviso del browser:"
echo "  1. Copia $CERTS_DIR/fullchain.pem a tu máquina Windows"
echo "  2. Renómbralo a gestprop-qa.crt"
echo "  3. Doble clic → Instalar certificado → Equipo local → Entidades de certificación raíz de confianza"
echo ""
echo "O en Chrome/Edge: chrome://flags/#allow-insecure-localhost (solo para localhost)"
