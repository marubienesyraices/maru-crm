import { Module } from '@nestjs/common';
import { VideollamadasService } from './videollamadas.service';
import { VideollamadasController } from './videollamadas.controller';

@Module({
  controllers: [VideollamadasController],
  providers: [VideollamadasService],
})
export class VideollamadasModule {}
