import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { HealthController } from './health.controller';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { UsersModule } from './modules/users/users.module';
import { AuditModule } from './modules/audit/audit.module';
import { PropiedadesModule } from './modules/propiedades/propiedades.module';
import { PropietariosModule } from './modules/propietarios/propietarios.module';
import { UploadModule } from './modules/upload/upload.module';
import { ClientesModule } from './modules/clientes/clientes.module';
import { PipelineModule } from './modules/pipeline/pipeline.module';
import { DocumentosModule } from './modules/documentos/documentos.module';
import { NotificacionesModule } from './modules/notificaciones/notificaciones.module';
import { StorageModule } from './modules/storage/storage.module';
import { InteraccionesModule } from './modules/interacciones/interacciones.module';
import { VisitasModule } from './modules/visitas/visitas.module';
import { SearchModule } from './modules/search/search.module';
import { ImportModule } from './modules/import/import.module';
import { PortalModule } from './modules/portal/portal.module';
import { BrochureModule } from './modules/brochure/brochure.module';
import { BiModule } from './modules/bi/bi.module';
import { CampanasModule } from './modules/campanas/campanas.module';
import { WhatsappModule } from './modules/whatsapp/whatsapp.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('REDIS_HOST') ?? 'localhost',
          port: config.get<number>('REDIS_PORT') ?? 6379,
        },
      }),
    }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    UsersModule,
    AuditModule,
    PropiedadesModule,
    PropietariosModule,
    UploadModule,
    ClientesModule,
    PipelineModule,
    DocumentosModule,
    NotificacionesModule,
    StorageModule,
    InteraccionesModule,
    VisitasModule,
    SearchModule,
    ImportModule,
    PortalModule,
    BrochureModule,
    BiModule,
    CampanasModule,
    WhatsappModule,
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
  controllers: [HealthController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
