# Guía para Actualizar Ambientes de QA y Producción

Este documento describe los pasos necesarios para desplegar actualizaciones de código y aplicar migraciones de base de datos en los entornos de Quality Assurance (QA) y Producción.

---

## 1. Actualización del Ambiente de QA

El ambiente de QA normalmente está alojado en una Máquina Virtual local o servidor de pruebas. Sigue estos pasos para actualizarlo:

### Paso 1: Conectarse al servidor de QA

Conéctate por medio de SSH a la máquina de QA:

```bash
ssh qa_admin@<IP_DE_LA_VM_QA>
```

### Paso 2: Navegar al directorio del proyecto y obtener los cambios

Ve al directorio donde está clonado el repositorio y actualiza el código:

```bash
cd ~/gestprop
git pull origin master
```

*(Si no usas git para QA, copia los archivos nuevos usando `scp` o `rsync` desde tu máquina local).*

### Paso 3: Reconstruir y reiniciar los contenedores de Docker

Al usar la bandera `--build`, Docker Compose reconstruirá las imágenes necesarias para incluir los nuevos cambios sin causar tiempos de inactividad significativos:

```bash
docker compose -f docker-compose.qa.yml --env-file .env.qa up -d --build
```

### Paso 4: Aplicar migraciones de Base de Datos

Si tus cambios incluyen modificaciones en la base de datos (nuevos modelos en Prisma, cambios de tablas, etc.), debes ejecutar el contenedor de migraciones:

```Shell
docker compose -f docker-compose.qa.yml --env-file .env.qa run --rm migrate
```

---

## 2. Actualización del Ambiente de Producción

El ambiente de Producción está alojado en un VPS (por ejemplo, Hostinger). Los pasos son similares pero requieren más precaución.

### Paso 1: Conectarse al servidor de Producción

Conéctate por medio de SSH a tu VPS de producción:

```bash
# Conéctate como root o usa tu llave SSH
ssh root@<IP_DEL_VPS_PROD>

# Cambia al usuario de despliegue (si configuraste uno, ej. deploy)
su - deploy
```

### Paso 2: Navegar al directorio del proyecto y obtener los cambios

Ve al directorio de la aplicación y descarga la última versión del código desde el repositorio:

```bash
cd /opt/gestprop
git pull origin master
```

### Paso 3: Reconstruir y reiniciar los contenedores de Docker (Zero-Downtime)

Ejecuta el siguiente comando. Al usar `--build` y `--d`, los contenedores se reconstruirán y reemplazarán de manera transparente:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

### Paso 4: Aplicar migraciones de Base de Datos

Si la actualización incluye cambios en la base de datos (Prisma schema), aplica las migraciones utilizando el contenedor de la API:

```bash
docker compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

### Paso 5: Monitorear el estado tras la actualización

Es importante verificar que los servicios levantaron correctamente después de la actualización:

```bash
# Revisar el estado de los contenedores (todos deben decir "Up" o "Up (healthy)")
docker compose -f docker-compose.prod.yml ps

# Revisar los logs recientes en busca de errores (especialmente de la API)
docker compose -f docker-compose.prod.yml logs --tail=100 -f api
```

---

## Consideraciones Adicionales

- **Backups:** Antes de realizar una actualización grande en producción, asegúrate de que tienes un backup reciente de la base de datos. (El contenedor de backup ejecuta uno automáticamente cada noche, pero puedes forzar uno manual si lo prefieres).
- **Variables de Entorno:** Si los nuevos cambios requieren nuevas variables de entorno, asegúrate de añadirlas a los archivos `.env.qa` y `.env.production` antes de ejecutar el comando `docker compose up -d --build`.
