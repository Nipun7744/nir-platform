import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { FundingModule } from '../funding/funding.module';
import { MentorshipModule } from '../mentorship/mentorship.module';
import { MinistriesModule } from '../ministries/ministries.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({}),
    UsersModule,
    FundingModule,
    MentorshipModule,
    MinistriesModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
