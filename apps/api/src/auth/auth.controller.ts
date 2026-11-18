import { Body, Controller, Get, HttpCode, HttpStatus, Ip, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { SendOtpDto } from './dto/send-otp.dto';
import { ResetPasswordDto, VerifyResetCodeDto } from './dto/password-reset.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from './strategies/jwt.strategy';
import { UsersService } from '../users/users.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  /** CAPTCHA provider + site key and OTP settings for the sign-in/register pages. */
  @Public()
  @Get('security-config')
  securityConfig() {
    return this.authService.securityConfig();
  }

  /** Registration step 1 — email/SMS a one-time code. CAPTCHA-protected; also per-target limits in OtpService. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('otp/send')
  sendOtp(@Body() dto: SendOtpDto, @Ip() ip: string) {
    return this.authService.sendRegistrationOtp(dto, ip);
  }

  /** Registration step 2 — create the account; requires the code from step 1. */
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  /** Forgot password step 1 — email/SMS a reset code to a registered account. CAPTCHA-protected; per-target limits in OtpService. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('password/forgot')
  forgotPassword(@Body() dto: SendOtpDto, @Ip() ip: string) {
    return this.authService.sendPasswordResetOtp(dto, ip);
  }

  /** Forgot password step 2 — check the code; returns a 10-minute, single-use reset token. */
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('password/verify-code')
  verifyResetCode(@Body() dto: VerifyResetCodeDto) {
    return this.authService.verifyPasswordResetOtp(dto);
  }

  /** Forgot password step 3 — set the new password; revokes every refresh token of the account. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('password/reset')
  resetPassword(@Body() dto: ResetPasswordDto, @Ip() ip: string) {
    return this.authService.resetPassword(dto, ip);
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Body() dto: LoginDto, @Ip() ip: string) {
    return this.authService.login(dto, ip);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('refresh')
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Public()
  @HttpCode(HttpStatus.OK)
  @Post('logout')
  logout(@Body() dto: RefreshDto) {
    return this.authService.logout(dto.refreshToken);
  }

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.findProfileById(user.id);
  }
}
