import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KycSubmission, KycStatus, KycLevel } from './entities/kyc-submission.entity';
import { KycDocument, DocumentType, DocumentStatus } from './entities/kyc-document.entity';
import { SubmitKycDto } from './dto/submit-kyc.dto';
import { KycStatusDto, KycSubmissionResponseDto, KycLimitsDto } from './dto/kyc-status.dto';
import { StorageService } from './services/storage.service';
import { VirusScanService } from './services/virus-scan.service';
import { MksService } from './services/mks.service';
import { TcKimlikValidator } from './utils/tc-kimlik-validator';

@Injectable()
export class KycService {
  private readonly logger = new Logger(KycService.name);

  constructor(
    @InjectRepository(KycSubmission)
    private kycSubmissionRepository: Repository<KycSubmission>,
    @InjectRepository(KycDocument)
    private kycDocumentRepository: Repository<KycDocument>,
    private storageService: StorageService,
    private virusScanService: VirusScanService,
    private mksService: MksService,
  ) {}

  /**
   * Submit KYC application
   * @param userId - User ID from JWT token
   * @param dto - KYC submission data
   * @param files - Uploaded files (idFront, idBack, selfie, addressProof?)
   * @param ipAddress - Client IP address
   * @param userAgent - Client user agent
   * @returns Submission response with estimated review time
   */
  async submitKyc(
    userId: string,
    dto: SubmitKycDto,
    files: {
      idFront: Express.Multer.File[];
      idBack: Express.Multer.File[];
      selfie: Express.Multer.File[];
      addressProof?: Express.Multer.File[];
    },
    ipAddress: string,
    userAgent: string,
  ): Promise<KycSubmissionResponseDto> {
    this.logger.log(`KYC submission started for user: ${userId}`);

    // Check if user already has a pending or approved submission
    const existingSubmission = await this.kycSubmissionRepository.findOne({
      where: { userId, status: KycStatus.PENDING },
    });

    if (existingSubmission) {
      throw new ConflictException('Beklemede bir KYC başvurunuz bulunmaktadır');
    }

    const approvedSubmission = await this.kycSubmissionRepository.findOne({
      where: { userId, status: KycStatus.APPROVED },
    });

    if (approvedSubmission) {
      throw new ConflictException('KYC başvurunuz zaten onaylanmış');
    }

    // Validate TC Kimlik
    const errorMessage = TcKimlikValidator.getErrorMessage(dto.tcKimlikNo);
    if (errorMessage) {
      throw new BadRequestException(errorMessage);
    }

    // Validate files
    this.validateFiles(files);

    // Scan files for viruses
    await this.scanFiles(files);

    // Upload files to S3/MinIO
    const uploadedFiles = await this.uploadFiles(userId, files);

    // Create KYC submission
    const submission = this.kycSubmissionRepository.create({
      userId,
      level: dto.level || KycLevel.LEVEL_1,
      status: KycStatus.PENDING,
      tcKimlikNo: dto.tcKimlikNo,
      firstName: dto.firstName,
      lastName: dto.lastName,
      dateOfBirth: new Date(dto.dateOfBirth),
      phone: dto.phone,
      idFrontUrl: uploadedFiles.idFront.url,
      idBackUrl: uploadedFiles.idBack.url,
      selfieUrl: uploadedFiles.selfie.url,
      addressProofUrl: uploadedFiles.addressProof?.url,
      submittedAt: new Date(),
      ipAddress,
      userAgent,
    });

    await this.kycSubmissionRepository.save(submission);

    this.logger.log(`KYC submission created: ${submission.id}`);

    // Trigger MKS verification asynchronously
    this.verifyWithMks(submission.id, dto).catch((error) => {
      this.logger.error(`MKS verification failed for submission ${submission.id}: ${error.message}`);
    });

    return {
      id: submission.id,
      status: submission.status,
      estimatedReviewTime: '24-48 saat',
      mksVerified: false,
      submittedAt: submission.submittedAt,
    };
  }

  /**
   * Get KYC status for a user
   * @param userId - User ID
   * @returns KYC status
   */
  async getKycStatus(userId: string): Promise<KycStatusDto> {
    const submission = await this.kycSubmissionRepository.findOne({
      where: { userId },
      order: { createdAt: 'DESC' },
    });

    if (!submission) {
      throw new NotFoundException('KYC başvurusu bulunamadı');
    }

    return {
      id: submission.id,
      userId: submission.userId,
      level: submission.level,
      status: submission.status,
      submittedAt: submission.submittedAt,
      reviewedAt: submission.reviewedAt,
      rejectionReason: submission.rejectionReason,
      estimatedReviewTime: this.getEstimatedReviewTime(submission),
    };
  }

  /**
   * Get KYC limits for a user based on their KYC level
   * @param userId - User ID
   * @returns KYC limits
   */
  async getKycLimits(userId: string): Promise<KycLimitsDto> {
    const submission = await this.kycSubmissionRepository.findOne({
      where: { userId, status: KycStatus.APPROVED },
      order: { createdAt: 'DESC' },
    });

    const level = submission?.level || KycLevel.LEVEL_1;
    const isApproved = submission?.status === KycStatus.APPROVED;

    // LEVEL_1 limits
    let dailyDepositLimit = 50000; // TRY
    let dailyWithdrawalLimit = 50000; // TRY
    let tradingLimit = -1; // Unlimited

    // LEVEL_2 limits (higher)
    if (level === KycLevel.LEVEL_2) {
      dailyDepositLimit = 500000;
      dailyWithdrawalLimit = 500000;
    }

    return {
      level,
      dailyDepositLimit,
      dailyWithdrawalLimit,
      tradingLimit,
      isApproved,
    };
  }

  /**
   * Validate uploaded files
   */
  private validateFiles(files: any): void {
    if (!files.idFront || files.idFront.length === 0) {
      throw new BadRequestException('Kimlik ön yüzü fotoğrafı zorunludur');
    }

    if (!files.idBack || files.idBack.length === 0) {
      throw new BadRequestException('Kimlik arka yüzü fotoğrafı zorunludur');
    }

    if (!files.selfie || files.selfie.length === 0) {
      throw new BadRequestException('Kimlikli selfie fotoğrafı zorunludur');
    }

    // Validate file sizes (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allFiles = [
      ...files.idFront,
      ...files.idBack,
      ...files.selfie,
      ...(files.addressProof || []),
    ];

    for (const file of allFiles) {
      if (file.size > maxSize) {
        throw new BadRequestException(`Dosya boyutu 5MB'dan büyük olamaz: ${file.originalname}`);
      }

      // Validate MIME types (JPEG, PNG only)
      if (!['image/jpeg', 'image/png', 'image/jpg'].includes(file.mimetype)) {
        throw new BadRequestException(`Sadece JPG/PNG formatı desteklenmektedir: ${file.originalname}`);
      }
    }
  }

  /**
   * Scan files for viruses
   */
  private async scanFiles(files: any): Promise<void> {
    const allFiles = [
      ...files.idFront,
      ...files.idBack,
      ...files.selfie,
      ...(files.addressProof || []),
    ];

    for (const file of allFiles) {
      const result = await this.virusScanService.scanFile(file);
      if (!result.isClean) {
        throw new BadRequestException(`Virüs tespit edildi: ${result.virus || 'Bilinmeyen'}`);
      }
    }
  }

  /**
   * Upload files to S3/MinIO
   */
  private async uploadFiles(userId: string, files: any): Promise<any> {
    const uploads = {
      idFront: await this.storageService.uploadFile(files.idFront[0], userId, 'id_front'),
      idBack: await this.storageService.uploadFile(files.idBack[0], userId, 'id_back'),
      selfie: await this.storageService.uploadFile(files.selfie[0], userId, 'selfie'),
      addressProof: files.addressProof?.[0]
        ? await this.storageService.uploadFile(files.addressProof[0], userId, 'address_proof')
        : null,
    };

    return uploads;
  }

  /**
   * Verify with MKS API (async)
   */
  private async verifyWithMks(submissionId: string, dto: SubmitKycDto): Promise<void> {
    try {
      this.logger.log(`Starting MKS verification for submission: ${submissionId}`);

      const mksResult = await this.mksService.verify({
        tcKimlikNo: dto.tcKimlikNo,
        firstName: dto.firstName,
        lastName: dto.lastName,
        dateOfBirth: dto.dateOfBirth,
      });

      await this.kycSubmissionRepository.update(submissionId, {
        mksVerificationId: mksResult.verificationId,
        mksResponse: mksResult.details,
        mksVerified: mksResult.verified,
        status: mksResult.verified ? KycStatus.IN_REVIEW : KycStatus.PENDING,
      });

      this.logger.log(`MKS verification completed for ${submissionId}: verified=${mksResult.verified}`);
    } catch (error) {
      this.logger.error(`MKS verification error for ${submissionId}: ${error.message}`);
    }
  }

  /**
   * Get estimated review time based on submission status
   */
  private getEstimatedReviewTime(submission: KycSubmission): number {
    if (submission.status === KycStatus.APPROVED || submission.status === KycStatus.REJECTED) {
      return 0;
    }

    if (submission.mksVerified) {
      return 12; // 12 hours if MKS verified
    }

    return 48; // 48 hours default
  }
}
