import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
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
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { TenantMiddleware } from './common/middleware/tenant.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '../.env' }),
    ScheduleModule.forRoot(),
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
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*');
  }
}
