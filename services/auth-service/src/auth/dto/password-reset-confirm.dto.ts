import {
  IsString,
  MinLength,
  Matches,
  IsNotEmpty,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// Custom validator for password match
@ValidatorConstraint({ async: false })
export class PasswordMatchConstraint implements ValidatorConstraintInterface {
  validate(confirmPassword: any, args: ValidationArguments) {
    const [relatedPropertyName] = args.constraints;
    const relatedValue = (args.object as any)[relatedPropertyName];
    return confirmPassword === relatedValue;
  }

  defaultMessage(args: ValidationArguments) {
    return 'Şifreler eşleşmiyor';
  }
}

export function PasswordMatch(property: string, validationOptions?: ValidationOptions) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      target: object.constructor,
      propertyName: propertyName,
      options: validationOptions,
      constraints: [property],
      validator: PasswordMatchConstraint,
    });
  };
}

export class PasswordResetConfirmDto {
  @ApiProperty({
    description: 'Password reset token from email',
    example: '1234567890abcdef...',
  })
  @IsNotEmpty({ message: 'Token gereklidir' })
  @IsString()
  token: string;

  @ApiProperty({
    description: 'New password (min 8 characters, must include uppercase, lowercase, number and special character)',
    example: 'SecureP@ss123!',
  })
  @IsString()
  @MinLength(8, { message: 'Şifre en az 8 karakter olmalıdır' })
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/,
    {
      message:
        'Şifre en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir',
    },
  )
  newPassword: string;

  @ApiProperty({
    description: 'Password confirmation (must match newPassword)',
    example: 'SecureP@ss123!',
  })
  @IsString()
  @PasswordMatch('newPassword')
  confirmPassword: string;
}

export class PasswordResetConfirmResponseDto {
  success: boolean;
  message: string;
}