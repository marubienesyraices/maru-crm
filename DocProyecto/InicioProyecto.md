# Inicio del Proyecto

Comandos necesarios para levantar el proyecto después de descargarlo de GitHub.

## 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd gestprop-crm
```

## 2. Instalar dependencias

```bash
npm install
```

## 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Luego generar y reemplazar el valor de `MASTER_ENCRYPTION_KEY` en el `.env` recién creado:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copiar el resultado y pegarlo en `.env`:
```env
MASTER_ENCRYPTION_KEY="<resultado-del-comando-anterior>"
```

> Sin este paso la API no arranca. El placeholder del `.env.example` no es válido.

## 4. Levantar contenedores Docker

```bash
docker compose up -d
```

## 5. Migrar y sembrar la base de datos

```bash
# Desde api/
cd api
npm run db:migrate
npx prisma generate
npm run db:seed
```

> **Nota:** `prisma migrate dev` debería generar el cliente automáticamente, pero si hubo
> errores previos (ej. fallo de autenticación) puede saltarse ese paso. Ejecutar
> `npx prisma generate` garantiza que el cliente esté disponible antes del seed.

## 6. Aplicar políticas de seguridad Row-Level Security (RLS)

Estos scripts SQL habilitan el aislamiento de datos por tenant. Deben ejecutarse en orden
**desde la raíz del proyecto**, una vez que los contenedores Docker estén corriendo.

Si `psql` está instalado localmente:
```bash
psql postgresql://gestprop_admin:gestprop_secret_2026@localhost:5432/gestprop_crm -f api/prisma/sql/rls_policies/migration.sql
psql postgresql://gestprop_admin:gestprop_secret_2026@localhost:5432/gestprop_crm -f api/prisma/sql/rls_policies/migration_v2.sql
```

Si no tienes `psql`, ejecutar desde PowerShell usando el contenedor Docker:
```powershell
Get-Content api/prisma/sql/rls_policies/migration.sql | docker exec -i gestprop-crm-db psql -U gestprop_admin -d gestprop_crm
Get-Content api/prisma/sql/rls_policies/migration_v2.sql | docker exec -i gestprop-crm-db psql -U gestprop_admin -d gestprop_crm
```

> **Nota:** En PowerShell el operador `<` no está soportado para redirección. Usar `Get-Content ... |` en su lugar.

## 7. Solución de problemas — Error de autenticación en la BD

Si al ejecutar `npm run db:migrate` aparece el error `P1000: Authentication failed`, significa que
el volumen Docker ya existía de una instalación anterior y PostgreSQL no reinicializó el usuario.

> ⚠️ El flag `-v` **elimina todos los datos** del volumen. Usarlo solo en instalación nueva o si no hay datos que conservar.

```bash
# Desde la raíz del proyecto
docker compose down -v
docker compose up -d
```

Esperar unos segundos y volver a ejecutar el paso 5.

---

## 8. Explorar la base de datos con Prisma Studio (opcional)

Abre una interfaz visual en el navegador para consultar y editar los datos de la BD.

```bash
# Desde api/
npm run db:studio
```

> Se abre automáticamente en `http://localhost:5555`

## 9. Importar datos de prueba (opcional)

Carga los datos desde los archivos CSV (`clientes.csv` / `propiedades.csv`) al tenant demo.
Solo es necesario si se quieren tener datos de prueba reales.

> **Verificar** que en `api/prisma/scripts/migrate-maru-data.ts` las rutas apunten a los nombres correctos:
> ```ts
> const CLIENTES_CSV = path.join(ROOT, 'clientes.csv');
> const PROPIEDADES_CSV = path.join(ROOT, 'propiedades.csv');
> ```

```bash
# Desde api/ (si no estás ya en esa carpeta)
npm run db:migrate-data
```
