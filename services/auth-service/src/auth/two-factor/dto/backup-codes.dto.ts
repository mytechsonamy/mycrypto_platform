import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Length, Matches, MinLength } from 'class-validator';

/**
 * Request DTO for regenerating backup codes
 */
export class RegenerateBackupCodesDto {
  @ApiProperty({
    description: 'User password for verification',
    example: 'SecurePassword123!',
    minLength: 8,
  })
  @IsNotEmpty({ message: 'Password is required' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description: 'Current 6-digit TOTP code for verification (optional)',
    example: '123456',
    minLength: 6,
    maxLength: 6,
    required: false,
  })
  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  @Matches(/^\d{6}$/, { message: 'Code must contain only digits' })
  code?: string;
}

/**
 * Response DTO for regenerating backup codes
 */
export class RegenerateBackupCodesResponseDto {
  @ApiProperty({
    description: 'New backup codes (single-use)',
    example: [
      'N1O2-P3Q4',
      'R5S6-T7U8',
      'V9W0-X1Y2',
      'Z3A4-B5C6',
      'D7E8-F9G0',
      'H1I2-J3K4',
      'L5M6-N7O8',
      'P9Q0-R1S2',
    ],
    type: [String],
    minItems: 8,
    maxItems: 8,
  })
  backup_codes: string[];

  @ApiProperty({
    description: 'Warning message about old codes being invalidated',
    example: 'Your old backup codes have been invalidated. Please save these new codes in a secure location.',
  })
  message: string;
}

/**
 * Response DTO for checking remaining backup codes
 */
export class BackupCodesStatusDto {
  @ApiProperty({
    description: 'Number of unused backup codes remaining',
    example: 5,
    minimum: 0,
    maximum: 8,
  })
  remaining_codes: number;

  @ApiProperty({
    description: 'Total number of backup codes originally generated',
    example: 8,
  })
  total_codes: number;

  @ApiProperty({
    description: 'Warning if codes are running low',
    example: 'You have only 2 backup codes remaining. Consider regenerating new codes.',
    required: false,
  })
  warning?: string;
}