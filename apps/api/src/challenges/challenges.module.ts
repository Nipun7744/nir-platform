import { Module } from '@nestjs/common';
import { ChallengesService } from './challenges.service';
import { ChallengesController, SubmissionsController } from './challenges.controller';

@Module({
  controllers: [ChallengesController, SubmissionsController],
  providers: [ChallengesService],
})
export class ChallengesModule {}
