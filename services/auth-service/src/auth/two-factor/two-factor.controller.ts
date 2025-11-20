import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpStatus,
  HttpCode,
  Get,
  Req,
  Logger,
  Request as NestRequest,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TwoFactorService } from './two-factor.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthService } from '../auth.service';
import {
  Setup2FAResponseDto,
  VerifySetupDto,
  VerifySetupResponseDto,
  VerifyChallengeDto,
  VerifyChallengeResponseDto,
  TwoFactorStatusDto,
  Disable2FADto,
  RegenerateBackupCodesDto,
  RegenerateBackupCodesResponseDto,
} from './dto';

/**
 * Controller handling Two-Factor Authentication endpoints
 */
@ApiTags('Two-Factor Authentication')
@Controller('auth/2fa')
export class TwoFactorController {
  private readonly logger = new Logger(TwoFactorController.name);

  constructor(
    private readonly twoFactorService: TwoFactorService,
    private readonly authService: AuthService,
  ) {}

  /**
   * BE-030: Initialize 2FA setup
   * Generates TOTP secret, QR code, and setup token
   */
  @Post('setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Initialize 2FA setup',
    description: 'Generate TOTP secret and QR code for authenticator app setup',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '2FA setup data generated successfully',
    type: Setup2FAResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: '2FA is already enabled',
  })
  @HttpCode(HttpStatus.OK)
  async setup(@NestRequest() req): Promise<{
    success: boolean;
    data: {
      qr_code: string;
      manual_entry_key: string;
      setup_token: string;
    };
    meta: any;
  }> {
    const userId = req.user.sub || req.user.id;
    this.logger.log(`2FA setup initiated for user ${userId}`);

    const setupData = await this.twoFactorService.setup(userId);

    return {
      success: true,
      data: {
        qr_code: setupData.qrCode,
        manual_entry_key: setupData.manualEntryKey,
        setup_token: setupData.setupToken,
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`,
      },
    };
  }

  /**
   * BE-031: Verify setup and enable 2FA
   * Validates TOTP code and enables 2FA with backup codes
   */
  @Post('verify-setup')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify setup and enable 2FA',
    description: 'Verify TOTP code from authenticator app and enable 2FA',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '2FA enabled successfully',
    type: VerifySetupResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid verification code or setup token',
  })
  @HttpCode(HttpStatus.OK)
  async verifySetup(
    @Body() dto: VerifySetupDto,
    @NestRequest() req,
  ): Promise<{
    success: boolean;
    data: {
      message: string;
      backupCodes: string[];
    };
    meta: any;
  }> {
    const userId = req.user.sub || req.user.id;
    this.logger.log(`2FA verification attempt for user ${userId}`);

    const { backupCodes } = await this.twoFactorService.verifySetup(
      userId,
      dto.setupToken,
      dto.code,
    );

    return {
      success: true,
      data: {
        message: 'Two-factor authentication has been enabled successfully',
        backupCodes,
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`,
      },
    };
  }

  /**
   * BE-033: Verify 2FA during login
   * Validates TOTP or backup code with challenge token
   */
  @Post('verify')
  @ApiOperation({
    summary: 'Verify 2FA during login',
    description: 'Verify TOTP or backup code to complete login',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '2FA verification successful',
    type: VerifyChallengeResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid verification code or challenge token',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Too many failed attempts',
  })
  @HttpCode(HttpStatus.OK)
  async verifyChallenge(
    @Body() dto: VerifyChallengeDto,
  ): Promise<{
    success: boolean;
    data: {
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
    };
    meta: any;
  }> {
    this.logger.log('2FA verification attempt during login');

    const { userId } = await this.twoFactorService.verifyChallenge(
      dto.challengeToken,
      dto.code,
    );

    // Generate full JWT tokens after successful 2FA verification
    const tokens = await this.authService.generateTokens(userId);

    return {
      success: true,
      data: {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        token_type: 'Bearer',
        expires_in: 900, // 15 minutes
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`,
      },
    };
  }

  /**
   * BE-034: Regenerate backup codes
   * Creates new backup codes and invalidates old ones
   */
  @Post('backup-codes/regenerate')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Regenerate backup codes',
    description: 'Generate new backup codes (requires password verification)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'New backup codes generated',
    type: RegenerateBackupCodesResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '2FA is not enabled',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid password',
  })
  @HttpCode(HttpStatus.OK)
  async regenerateBackupCodes(
    @Body() dto: RegenerateBackupCodesDto,
    @NestRequest() req,
  ): Promise<{
    success: boolean;
    data: {
      backup_codes: string[];
    };
    meta: any;
  }> {
    const userId = req.user.sub || req.user.id;
    this.logger.log(`Backup codes regeneration for user ${userId}`);

    const { backupCodes } = await this.twoFactorService.regenerateBackupCodes(
      userId,
      dto.password,
    );

    return {
      success: true,
      data: {
        backup_codes: backupCodes,
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`,
      },
    };
  }

  /**
   * BE-035: Get 2FA status
   * Returns current 2FA configuration status
   */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Get 2FA status',
    description: 'Check if 2FA is enabled and backup codes remaining',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '2FA status',
    type: TwoFactorStatusDto,
  })
  async getStatus(@NestRequest() req): Promise<{
    success: boolean;
    data: TwoFactorStatusDto;
    meta: any;
  }> {
    const userId = req.user.sub || req.user.id;
    this.logger.log(`Checking 2FA status for user ${userId}`);

    const status = await this.twoFactorService.getStatus(userId);

    return {
      success: true,
      data: status,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`,
      },
    };
  }

  /**
   * BE-035: Disable 2FA
   * Disables 2FA (requires password and TOTP/backup code)
   */
  @Post('disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Disable 2FA',
    description: 'Disable two-factor authentication (requires verification)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: '2FA disabled successfully',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: '2FA is not enabled',
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Invalid password or verification code',
  })
  @HttpCode(HttpStatus.OK)
  async disable(
    @Body() dto: Disable2FADto,
    @NestRequest() req,
  ): Promise<{
    success: boolean;
    data: { message: string };
    meta: any;
  }> {
    const userId = req.user.sub || req.user.id;
    this.logger.log(`2FA disable request for user ${userId}`);

    await this.twoFactorService.disable(userId, dto.password, dto.code);

    return {
      success: true,
      data: {
        message: 'Two-factor authentication has been disabled',
      },
      meta: {
        timestamp: new Date().toISOString(),
        request_id: `req_${Date.now()}`,
      },
    };
  }
}