// Sentry debe inicializarse antes que cualquier otro import
import './instrument';
import { NestFactory, Reflector, HttpAdapterHost } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { AppModule } from './app.module';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const httpInstance = app.getHttpAdapter().getInstance() as {
    disable: (name: string) => void;
  };
  httpInstance.disable('x-powered-by');

  // Sentry: captura excepciones no manejadas como eventos
  const { httpAdapter } = app.get(HttpAdapterHost);
  app.useGlobalFilters(new SentryGlobalFilter(httpAdapter));

  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175',
    'http://localhost:3001',
    ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
  ];
  app.enableCors({
    origin: allowedOrigins,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const prisma = app.get(PrismaService);
  const reflector = app.get(Reflector);
  app.useGlobalInterceptors(new AuditInterceptor(prisma, reflector));

  // ─── Swagger / OpenAPI ─────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('GestProp CRM — API')
    .setDescription(
      'API multi-tenant para gestión de propiedades, clientes, pipeline de ventas y automatización de marketing.\n\n' +
        '**Autenticación:** JWT Bearer. Obtén el token con `POST /api/auth/login` y pégalo en el botón "Authorize" (sin el prefijo "Bearer").',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'JWT',
    )
    .addTag('Autenticación', 'Login, 2FA, tokens y recuperación de contraseña')
    .addTag('Propiedades', 'CRUD de propiedades y transiciones de estado')
    .addTag('Imágenes', 'Subida y eliminación de imágenes de propiedades')
    .addTag('Documentos', 'Documentos legales asociados a propiedades')
    .addTag(
      'Brochure PDF',
      'Generación asíncrona de brochures y carta de comisión',
    )
    .addTag('Propietarios', 'Gestión de propietarios')
    .addTag('Clientes', 'CRM de clientes y preferencias de búsqueda')
    .addTag('Pipeline', 'Embudo de ventas y seguimiento de intereses')
    .addTag(
      'Interacciones',
      'Registro de llamadas, visitas y mensajes por interes',
    )
    .addTag('Visitas', 'Agendamiento y reporte de visitas')
    .addTag('Búsqueda', 'Búsqueda global federada (Ctrl+K)')
    .addTag('Notificaciones', 'Centro de notificaciones in-app')
    .addTag(
      'Campañas de Email',
      'Plantillas dinámicas y envío masivo segmentado',
    )
    .addTag(
      'Business Intelligence',
      'KPIs, reportes de agentes y exportación XLSX',
    )
    .addTag(
      'Importación',
      'Carga masiva de propiedades y clientes desde Excel/CSV',
    )
    .addTag('Auditoría', 'Logs de auditoría inmutables')
    .addTag('Usuarios', 'Gestión de usuarios del tenant')
    .addTag('Empresas', 'Gestión de tenants (Solo Super Admin)')
    .addTag('Portal Público', 'Endpoints públicos sin autenticación')
    .addTag('Email Tracking', 'Pixel de apertura y tracking de clics')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'GestProp CRM — API Docs',
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 API running on http://localhost:${port}`);
  console.log(`📚 Swagger UI:  http://localhost:${port}/api/docs`);
}
void bootstrap();
