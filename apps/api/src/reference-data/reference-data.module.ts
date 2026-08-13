import { Module } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { LookupsService } from './lookups.service';
import { LookupsController } from './lookups.controller';

@Module({
  controllers: [CategoriesController, LookupsController],
  providers: [CategoriesService, LookupsService],
  exports: [CategoriesService, LookupsService],
})
export class ReferenceDataModule {}
