import { Module } from '@nestjs/common';
import { CampanasController } from './campanas.controller';
import { CampanasService } from './campanas.service';
import { EmailTriggersService } from './email-triggers.service';
import { EmailTriggersController } from './email-triggers.controller';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [EmailModule, PrismaModule],
  controllers: [CampanasController, EmailTriggersController],
  providers: [CampanasService, EmailTriggersService],
  exports: [EmailTriggersService],
})
export class CampanasModule {}
