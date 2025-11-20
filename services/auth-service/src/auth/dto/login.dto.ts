import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({
    description: 'User email address',
    example: 'user@example.com',
    required: true,
  })
  @IsEmail({}, { message: 'Geçersiz email formatı' })
  @IsNotEmpty({ message: 'Email zorunludur' })
  email: string;

  @ApiProperty({
    description: 'User password',
    example: 'SecurePass123!',
    required: true,
  })
  @IsString()
  @IsNotEmpty({ message: 'Şifre zorunludur' })
  password: string;
}

export class LoginResponseDto {
  @ApiProperty({
    description: 'JWT access token',
    example: 'eyJhbGciOiJSUzI1NiIs...',
  })
  access_token: string;

  @ApiProperty({
    description: 'JWT refresh token',
    example: 'eyJhbGciOiJSUzI1NiIs...',
  })
  refresh_token: string;

  @ApiProperty({
    description: 'Token type',
    example: 'Bearer',
    default: 'Bearer',
  })
  token_type: string;

  @ApiProperty({
    description: 'Access token expiry time in seconds',
    example: 900,
    default: 900,
  })
  expires_in: number;

  @ApiProperty({
    description: 'User information',
    type: 'object',
    properties: {
      id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7g8h-9i0j-k1l2m3n4o5p6' },
      email: { type: 'string', example: 'user@example.com' },
      email_verified: { type: 'boolean', example: true },
    },
  })
  user: {
    id: string;
    email: string;
    email_verified: boolean;
  };
}