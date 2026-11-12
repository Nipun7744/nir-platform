import { Module } from '@nestjs/common';
import { InnovationsService } from './innovations.service';
import { InnovationsController } from './innovations.controller';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [SettingsModule],
  controllers: [InnovationsController],
  providers: [InnovationsService],
  exports: [InnovationsService],
})
export class InnovationsModule {}
