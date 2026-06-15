#!/bin/bash
# Genera certificado self-signed wildcard para QA local
# Ejecutar en la VM Ubuntu: bash infra/scripts/gen-qa-certs.sh
#
# El certificado cubre: api.gestpropqa.net, crm.gestpropqa.net, portal.gestpropqa.net
# Válido por 825 días (límite aceptado por los browsers modernos)

set -e

CERTS_DIR="infra/certs-qa"

mkdir -p "$CERTS_DIR"

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
CN = gestpropqa.net

[v3_req]
subjectAltName = @alt_names
keyUsage       = digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth

[alt_names]
DNS.1 = api.gestpropqa.net
DNS.2 = crm.gestpropqa.net
DNS.3 = portal.gestpropqa.net
EOF

openssl req -x509 -nodes -days 825 \
  -newkey rsa:2048 \
  -keyout "$CERTS_DIR/privkey.pem" \
  -out    "$CERTS_DIR/fullchain.pem" \
  -config /tmp/qa-san.cnf

echo ""
echo "Certificados generados en $CERTS_DIR/"
echo ""
echo "Siguiente paso — importar el CA en Windows:"
echo "  1. scp user@<IP_VM>:/ruta/gestprop/infra/certs-qa/fullchain.pem C:\proyectos\gestpropqa.crt"
echo "  2. Doble clic en gestpropqa.crt → Instalar certificado → Equipo local"
echo "     → Entidades de certificación raíz de confianza"
echo ""
echo "Agregar al hosts de Windows (C:\Windows\System32\drivers\etc\hosts):"
echo "  <IP_VM>  api.gestpropqa.net  crm.gestpropqa.net  portal.gestpropqa.net"
