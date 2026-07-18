import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PortalController } from './portal.controller';
import { PortalService } from './portal.service';
import { ClienteJwtGuard } from './cliente-jwt.guard';
import { PrismaModule } from '../../prisma/prisma.module';
import { EmailModule } from '../email/email.module';
import { ConfigPortalModule } from '../config-portal/config-portal.module';

@Module({
  imports: [
    PrismaModule,
    EmailModule,
    ConfigModule,
    ConfigPortalModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        secret: cs.get('JWT_ACCESS_SECRET'),
        signOptions: { expiresIn: '30d' },
      }),
    }),
  ],
  controllers: [PortalController],
  providers: [PortalService, ClienteJwtGuard],
})
export class PortalModule {}
