import { Global, Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { SmsService } from './sms.service';

/** Real outbound email/SMS transports (see each service for its env vars). */
@Global()
@Module({
  providers: [MailService, SmsService],
  exports: [MailService, SmsService],
})
export class MessagingModule {}
