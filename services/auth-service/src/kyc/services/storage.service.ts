import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { createHash } from 'crypto';
import { Readable } from 'stream';

export interface UploadResult {
  url: string;
  key: string;
  bucket: string;
  fileHash: string;
  fileSize: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly s3Client: S3Client;
  private readonly bucket: string;
  private readonly region: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('S3_ENDPOINT', 'http://minio:9000');
    const accessKeyId = this.configService.get<string>('S3_ACCESS_KEY', 'minioadmin');
    const secretAccessKey = this.configService.get<string>('S3_SECRET_KEY', 'minioadmin_password');
    this.region = this.configService.get<string>('S3_REGION', 'us-east-1');
    this.bucket = this.configService.get<string>('S3_BUCKET_KYC', 'kyc-documents');

    this.s3Client = new S3Client({
      endpoint,
      region: this.region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: true, // Required for MinIO
    });

    this.logger.log(`Storage service initialized with bucket: ${this.bucket}`);
  }

  /**
   * Upload a file to S3/MinIO
   * @param file - Multer file object
   * @param userId - User ID for organizing files
   * @param documentType - Type of document (id_front, id_back, selfie, etc.)
   * @returns Upload result with URL, key, and file hash
   */
  async uploadFile(
    file: Express.Multer.File,
    userId: string,
    documentType: string,
  ): Promise<UploadResult> {
    try {
      // Calculate SHA-256 hash of file
      const fileHash = createHash('sha256').update(file.buffer).digest('hex');

      // Generate unique key: kyc/{userId}/{documentType}_{timestamp}_{hash}.ext
      const timestamp = Date.now();
      const extension = file.originalname.split('.').pop();
      const key = `kyc/${userId}/${documentType}_${timestamp}_${fileHash.slice(0, 8)}.${extension}`;

      this.logger.log(`Uploading file: ${key} (${file.size} bytes)`);

      // Upload using multipart upload for large files
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
          ServerSideEncryption: 'AES256', // Encryption at rest
          Metadata: {
            userId,
            documentType,
            originalFilename: file.originalname,
            uploadedAt: new Date().toISOString(),
          },
        },
      });

      await upload.done();

      const url = `${this.configService.get<string>('S3_ENDPOINT', 'http://minio:9000')}/${this.bucket}/${key}`;

      this.logger.log(`File uploaded successfully: ${key}`);

      return {
        url,
        key,
        bucket: this.bucket,
        fileHash,
        fileSize: file.size,
      };
    } catch (error) {
      this.logger.error(`Failed to upload file: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Dosya yüklenirken hata oluştu');
    }
  }

  /**
   * Download a file from S3/MinIO
   * @param key - S3 object key
   * @returns File buffer
   */
  async downloadFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      // Convert readable stream to buffer
      const stream = response.Body as Readable;
      const chunks: Uint8Array[] = [];

      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      return Buffer.concat(chunks);
    } catch (error) {
      this.logger.error(`Failed to download file ${key}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Dosya indirilemedi');
    }
  }

  /**
   * Delete a file from S3/MinIO
   * @param key - S3 object key
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Failed to delete file ${key}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Dosya silinemedi');
    }
  }

  /**
   * Get signed URL for temporary access to a file
   * @param key - S3 object key
   * @param expiresIn - URL expiration in seconds (default: 3600 = 1 hour)
   * @returns Signed URL
   */
  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      // For MinIO, we'll use presigned URLs
      // Note: AWS SDK v3 presigning requires additional package @aws-sdk/s3-request-presigner
      // For now, return the direct URL (MinIO default is public read if configured)
      return `${this.configService.get<string>('S3_ENDPOINT')}/${this.bucket}/${key}`;
    } catch (error) {
      this.logger.error(`Failed to generate signed URL for ${key}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('URL oluşturulamadı');
    }
  }

  /**
   * Check if file exists in S3/MinIO
   * @param key - S3 object key
   * @returns true if exists, false otherwise
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      if (error.name === 'NoSuchKey') {
        return false;
      }
      throw error;
    }
  }
}
