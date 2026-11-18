import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { OutreachController } from './outreach.controller';
import { ParticipantsService } from './participants.service';
import { BulkMessagesService } from './bulk-messages.service';

/** Challenge participant export + admin bulk email/SMS (MessagingModule is global). */
@Module({
  imports: [AuthModule],
  controllers: [OutreachController],
  providers: [ParticipantsService, BulkMessagesService],
})
export class OutreachModule {}
