import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for 2FA status
 */
export class TwoFactorStatusDto {
  @ApiProperty({
    description: 'Whether 2FA is enabled for the user',
    example: true,
  })
  isEnabled: boolean;

  @ApiProperty({
    description: 'Date when 2FA was enabled',
    example: '2024-01-15T10:30:00Z',
    nullable: true,
  })
  enabledAt: string | null;

  @ApiProperty({
    description: 'Number of unused backup codes remaining',
    example: 8,
  })
  backupCodesRemaining: number;
}