import { ApiProperty } from '@nestjs/swagger';

/**
 * Response DTO for 2FA setup initialization
 */
export class Setup2FAResponseDto {
  @ApiProperty({
    description: 'QR code as data URL for scanning with authenticator apps',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAA...',
  })
  qr_code: string;

  @ApiProperty({
    description: 'Manual entry key for authenticator apps',
    example: 'JBSWY3DPEHPK3PXP',
  })
  manual_entry_key: string;

  @ApiProperty({
    description: 'Array of single-use backup codes',
    example: ['A1B2-C3D4', 'E5F6-G7H8', 'I9J0-K1L2', 'M3N4-O5P6'],
    type: [String],
  })
  backup_codes: string[];

  @ApiProperty({
    description: 'Temporary token to validate setup completion',
    example: 'tmp_2fa_setup_abc123',
  })
  setup_token: string;
}