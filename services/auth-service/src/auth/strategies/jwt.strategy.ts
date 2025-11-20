import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { TokenBlacklistService } from '../services/token-blacklist.service';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../entities/user.entity';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    private readonly tokenBlacklistService: TokenBlacklistService,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {
    const algorithm = configService.get<string>('jwt.algorithm', 'RS256');
    const secretOrKey =
      algorithm === 'RS256'
        ? configService.get<string>('jwt.publicKey')
        : configService.get<string>('jwt.privateKey');

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey,
      algorithms: [algorithm] as any,
      passReqToCallback: true,
    });
  }

  async validate(req: any, payload: JwtPayload): Promise<any> {
    // Check if token type is access token
    if (payload.type !== 'access') {
      throw new UnauthorizedException('Invalid token type');
    }

    // Check if token is blacklisted
    if (payload.jti) {
      const isBlacklisted = await this.tokenBlacklistService.isBlacklisted(payload.jti);
      if (isBlacklisted) {
        throw new UnauthorizedException('Token has been revoked');
      }
    }

    // Check if user's tokens are blacklisted (after password reset, etc.)
    const tokenIssuedAt = new Date(payload.iat * 1000);
    const isUserTokenBlacklisted = await this.tokenBlacklistService.isUserTokenBlacklisted(
      payload.sub,
      tokenIssuedAt,
    );
    if (isUserTokenBlacklisted) {
      throw new UnauthorizedException('Token has been revoked');
    }

    // Verify user still exists and is active
    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    if (user.status === UserStatus.SUSPENDED || user.status === UserStatus.LOCKED) {
      throw new UnauthorizedException('Account is suspended or locked');
    }

    // Attach the full token to request for logout purposes
    const authHeader = req.headers.authorization;
    if (authHeader) {
      req.accessToken = authHeader.replace('Bearer ', '');
    }

    return {
      userId: payload.sub,
      email: payload.email,
      jti: payload.jti,
    };
  }
}