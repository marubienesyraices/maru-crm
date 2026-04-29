import { Module } from '@nestjs/common';
import { PropietariosService } from './propietarios.service';
import { PropietariosController } from './propietarios.controller';

@Module({
  controllers: [PropietariosController],
  providers: [PropietariosService],
  exports: [PropietariosService],
})
export class PropietariosModule {}
