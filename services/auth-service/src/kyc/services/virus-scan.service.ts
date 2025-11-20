import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as NodeClam from 'clamscan';

export interface ScanResult {
  isClean: boolean;
  virus?: string;
  file: string;
  scanDuration: number;
}

@Injectable()
export class VirusScanService {
  private readonly logger = new Logger(VirusScanService.name);
  private clamScan: NodeClam | null = null;
  private isInitialized = false;

  constructor(private configService: ConfigService) {
    this.initializeScanner();
  }

  /**
   * Initialize ClamAV scanner
   */
  private async initializeScanner(): Promise<void> {
    try {
      const clamavHost = this.configService.get<string>('CLAMAV_HOST', 'clamav');
      const clamavPort = this.configService.get<number>('CLAMAV_PORT', 3310);

      this.logger.log(`Initializing ClamAV scanner at ${clamavHost}:${clamavPort}`);

      this.clamScan = await new NodeClam().init({
        removeInfected: false, // Don't auto-delete infected files
        quarantineInfected: false,
        scanLog: null,
        debugMode: false,
        clamdscan: {
          host: clamavHost,
          port: clamavPort,
          timeout: 60000, // 60 seconds
          localFallback: false, // Don't fallback to local scan if daemon is unavailable
        },
        preference: 'clamdscan', // Use daemon mode (faster)
      });

      this.isInitialized = true;
      this.logger.log('ClamAV scanner initialized successfully');
    } catch (error) {
      this.logger.error(`Failed to initialize ClamAV scanner: ${error.message}`, error.stack);
      this.isInitialized = false;

      // In development, we might want to allow uploads even if ClamAV is unavailable
      const skipVirusScan = this.configService.get<boolean>('SKIP_VIRUS_SCAN', false);
      if (!skipVirusScan) {
        this.logger.warn('ClamAV is not available and SKIP_VIRUS_SCAN is false. Virus scanning will fail.');
      } else {
        this.logger.warn('ClamAV is not available but SKIP_VIRUS_SCAN is true. Proceeding without virus scanning.');
      }
    }
  }

  /**
   * Scan a file buffer for viruses
   * @param file - Multer file object with buffer
   * @returns Scan result indicating if file is clean
   */
  async scanFile(file: Express.Multer.File): Promise<ScanResult> {
    const startTime = Date.now();
    const skipVirusScan = this.configService.get<boolean>('SKIP_VIRUS_SCAN', false);

    // If virus scanning is disabled (development mode), return clean result
    if (skipVirusScan) {
      this.logger.warn(`Virus scan skipped for file: ${file.originalname} (SKIP_VIRUS_SCAN=true)`);
      return {
        isClean: true,
        file: file.originalname,
        scanDuration: 0,
      };
    }

    // If scanner is not initialized, fail the scan
    if (!this.isInitialized || !this.clamScan) {
      this.logger.error('ClamAV scanner is not initialized');
      throw new BadRequestException('Virus tarama servisi kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
    }

    try {
      this.logger.log(`Scanning file: ${file.originalname} (${file.size} bytes)`);

      // Scan the buffer
      const { isInfected, viruses } = await this.clamScan.scanStream(file.buffer);

      const scanDuration = Date.now() - startTime;

      if (isInfected) {
        const virusName = viruses.length > 0 ? viruses[0] : 'Unknown virus';
        this.logger.warn(`Virus detected in file ${file.originalname}: ${virusName}`);

        return {
          isClean: false,
          virus: virusName,
          file: file.originalname,
          scanDuration,
        };
      }

      this.logger.log(`File ${file.originalname} is clean (scanned in ${scanDuration}ms)`);

      return {
        isClean: true,
        file: file.originalname,
        scanDuration,
      };
    } catch (error) {
      this.logger.error(`Error scanning file ${file.originalname}: ${error.message}`, error.stack);
      throw new BadRequestException('Dosya taraması sırasında hata oluştu');
    }
  }

  /**
   * Scan multiple files
   * @param files - Array of Multer file objects
   * @returns Array of scan results
   */
  async scanFiles(files: Express.Multer.File[]): Promise<ScanResult[]> {
    const results: ScanResult[] = [];

    for (const file of files) {
      const result = await this.scanFile(file);
      results.push(result);

      // If any file is infected, throw an error immediately
      if (!result.isClean) {
        throw new BadRequestException(
          `Virüs tespit edildi: ${result.virus || 'Bilinmeyen virüs'} (${file.originalname})`,
        );
      }
    }

    return results;
  }

  /**
   * Check if ClamAV service is available
   * @returns true if available, false otherwise
   */
  async isAvailable(): Promise<boolean> {
    if (!this.isInitialized || !this.clamScan) {
      return false;
    }

    try {
      // Try to get version to verify connection
      const version = await this.clamScan.getVersion();
      this.logger.log(`ClamAV version: ${version}`);
      return true;
    } catch (error) {
      this.logger.error(`ClamAV is not available: ${error.message}`);
      return false;
    }
  }

  /**
   * Get ClamAV version
   * @returns ClamAV version string
   */
  async getVersion(): Promise<string> {
    if (!this.isInitialized || !this.clamScan) {
      return 'Not initialized';
    }

    try {
      return await this.clamScan.getVersion();
    } catch (error) {
      this.logger.error(`Failed to get ClamAV version: ${error.message}`);
      return 'Unknown';
    }
  }
}
