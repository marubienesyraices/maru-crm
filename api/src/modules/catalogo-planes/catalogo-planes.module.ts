import { Module } from '@nestjs/common';
import { CatalogoPlanesService } from './catalogo-planes.service';
import { CatalogoPlanesController } from './catalogo-planes.controller';

@Module({
  controllers: [CatalogoPlanesController],
  providers: [CatalogoPlanesService],
  exports: [CatalogoPlanesService],
})
export class CatalogoPlanesModule {}
