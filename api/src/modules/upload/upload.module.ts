import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';
import { ImageService } from './image.service';

@Module({
  controllers: [UploadController],
  providers: [ImageService],
})
export class UploadModule {}
