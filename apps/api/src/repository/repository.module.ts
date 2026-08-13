import { Module } from '@nestjs/common';
import { RepositoryService } from './repository.service';
import { RepositoryController } from './repository.controller';
import { SavedSearchesController } from './saved-searches.controller';

@Module({
  controllers: [RepositoryController, SavedSearchesController],
  providers: [RepositoryService],
})
export class RepositoryModule {}
