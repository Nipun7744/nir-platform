import { OtpChannel } from '@prisma/client';
import { IsEmail, IsEnum, IsIn, IsOptional, IsPhoneNumber, IsString, MaxLength, ValidateIf } from 'class-validator';

export class SendOtpDto {
  @IsEnum(OtpChannel)
  channel!: OtpChannel;

  /** Required when channel === EMAIL. */
  @ValidateIf((o: SendOtpDto) => o.channel === OtpChannel.EMAIL)
  @IsEmail()
  email?: string;

  /** Required when channel === SMS — a Bangladeshi mobile number. */
  @ValidateIf((o: SendOtpDto) => o.channel === OtpChannel.SMS)
  @IsPhoneNumber('BD', { message: 'Enter a valid Bangladeshi mobile number' })
  phone?: string;

  /** Language of the email/SMS text. */
  @IsOptional()
  @IsIn(['en', 'bn'])
  locale?: 'en' | 'bn';

  @IsOptional()
  @IsString()
  @MaxLength(4096)
  captchaToken?: string;
}
