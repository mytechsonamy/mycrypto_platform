import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFiles,
  Req,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { KycService } from './kyc.service';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { KycStatusDto, KycSubmissionResponseDto, KycLimitsDto } from './dto/kyc-status.dto';
import { Request } from 'express';

@ApiTags('KYC')
@Controller('auth/kyc')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
export class KycController {
  constructor(private readonly kycService: KycService) {}

  @Post('submit')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit KYC application (Level 1)',
    description: `
Submit KYC Level 1 application with required documents.

**Required Files:**
- idFront: ID card front photo (max 5MB, JPG/PNG)
- idBack: ID card back photo (max 5MB, JPG/PNG)
- selfie: Selfie with ID card (max 5MB, JPG/PNG)
- addressProof: Address proof document (optional, max 5MB, JPG/PNG)

**Workflow:**
1. File validation (size, format)
2. Virus scanning (ClamAV)
3. Upload to S3/MinIO (encrypted)
4. MKS verification (Turkish ID verification)
5. Status: PENDING → IN_REVIEW → APPROVED/REJECTED

**Estimated Review Time:** 24-48 hours
    `,
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 201,
    description: 'KYC submission successful',
    type: KycSubmissionResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or virus detected' })
  @ApiResponse({ status: 409, description: 'KYC already submitted or approved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseInterceptors(
    FileFieldsInterceptor([
      { name: 'idFront', maxCount: 1 },
      { name: 'idBack', maxCount: 1 },
      { name: 'selfie', maxCount: 1 },
      { name: 'addressProof', maxCount: 1 },
    ]),
  )
  async submitKyc(
    @Req() req: Request & { user: { userId: string } },
    @Body() dto: SubmitKycDto,
    @UploadedFiles()
    files: {
      idFront: Express.Multer.File[];
      idBack: Express.Multer.File[];
      selfie: Express.Multer.File[];
      addressProof?: Express.Multer.File[];
    },
  ): Promise<KycSubmissionResponseDto> {
    const userId = req.user.userId;
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('user-agent') || 'unknown';

    return this.kycService.submitKyc(userId, dto, files, ipAddress, userAgent);
  }

  @Get('status')
  @ApiOperation({
    summary: 'Get KYC status',
    description: `
Get the current KYC submission status for the authenticated user.

**Possible Statuses:**
- PENDING: Awaiting review
- IN_REVIEW: Under manual/automated review
- APPROVED: KYC approved, full limits unlocked
- REJECTED: KYC rejected, reason provided

**Response includes:**
- Submission ID
- Status
- Submission/review timestamps
- Rejection reason (if rejected)
- Estimated review time
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'KYC status retrieved',
    type: KycStatusDto,
  })
  @ApiResponse({ status: 404, description: 'KYC submission not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getStatus(
    @Req() req: Request & { user: { userId: string } },
  ): Promise<KycStatusDto> {
    return this.kycService.getKycStatus(req.user.userId);
  }

  @Get('limits')
  @ApiOperation({
    summary: 'Get KYC limits',
    description: `
Get deposit/withdrawal/trading limits based on user's KYC level.

**LEVEL_1 Limits:**
- Daily TRY Deposit: 50,000 TRY
- Daily TRY Withdrawal: 50,000 TRY
- Trading: Unlimited

**LEVEL_2 Limits:**
- Daily TRY Deposit: 500,000 TRY
- Daily TRY Withdrawal: 500,000 TRY
- Trading: Unlimited

**Note:** Users without approved KYC have default LEVEL_1 limits but cannot withdraw.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'KYC limits retrieved',
    type: KycLimitsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getLimits(
    @Req() req: Request & { user: { userId: string } },
  ): Promise<KycLimitsDto> {
    return this.kycService.getKycLimits(req.user.userId);
  }
}
