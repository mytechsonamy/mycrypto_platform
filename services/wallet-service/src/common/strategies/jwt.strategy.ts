import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

/**
 * JWT Payload interface
 */
export interface JwtPayload {
  sub: string; // User ID
  email: string;
  role?: string;
  iat?: number;
  exp?: number;
}

/**
 * JWT Strategy
 * Validates JWT tokens and extracts user information
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_SECRET') || 'your-secret-key',
      algorithms: [configService.get('JWT_ALGORITHM') || 'HS256'],
    });
  }

  /**
   * Validate JWT payload and return user object
   * This is called automatically by Passport after JWT verification
   */
  async validate(payload: JwtPayload) {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Return user object that will be attached to request
    return {
      userId: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
