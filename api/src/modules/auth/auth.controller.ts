import { Controller, Post, Body, Req, HttpCode, HttpStatus, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  LoginDto,
  Verify2FADto,
  ForgotPasswordDto,
  ResetPasswordDto,
  OnboardingDto,
  RefreshTokenDto,
} from './dto';
import type { Request } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { SkipAudit } from '../../common/decorators/skip-audit.decorator';

@SkipAudit()
@Controller('api/auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginDto, @Req() req: any) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';
    return this.authService.login(dto, ip, userAgent);
  }

  @Post('verify-2fa')
  @HttpCode(HttpStatus.OK)
  async verify2FA(@Body() dto: Verify2FADto, @Req() req: any) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';
    return this.authService.verify2FA(dto, ip, userAgent);
  }

  @Post('setup-2fa')
  @UseGuards(JwtAuthGuard)
  async setup2FA(@CurrentUser() user: any) {
    return this.authService.setup2FA(user.sub);
  }

  @Post('confirm-2fa')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async confirm2FA(@CurrentUser() user: any, @Body('totpCode') totpCode: string) {
    return this.authService.confirm2FA(user.sub, totpCode);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body('refreshToken') refreshToken: string,
    @CurrentUser() user: any,
    @Req() req: any,
  ) {
    const ip = (req.headers['x-forwarded-for'] as string) || req.ip || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || '';
    return this.authService.logout(refreshToken, user.sub, user.tenantId, ip, userAgent);
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Post('onboarding')
  @HttpCode(HttpStatus.OK)
  async onboarding(@Body() dto: OnboardingDto) {
    return this.authService.onboarding(dto);
  }
}
