import { Module } from '@nestjs/common';
import { SuppressionsService } from './suppressions.service';
import { SuppressionsController } from './suppressions.controller';

@Module({
  controllers: [SuppressionsController],
  providers: [SuppressionsService],
  exports: [SuppressionsService],
})
export class SuppressionsModule {}
