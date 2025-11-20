import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { KycController } from './kyc.controller';
import { KycService } from './kyc.service';
import { KycSubmission } from './entities/kyc-submission.entity';
import { KycDocument } from './entities/kyc-document.entity';
import { StorageService } from './services/storage.service';
import { VirusScanService } from './services/virus-scan.service';
import { MksService } from './services/mks.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([KycSubmission, KycDocument]),
    HttpModule,
    ConfigModule,
  ],
  controllers: [KycController],
  providers: [KycService, StorageService, VirusScanService, MksService],
  exports: [KycService],
})
export class KycModule {}
