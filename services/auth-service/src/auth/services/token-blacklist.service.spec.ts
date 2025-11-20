import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { TokenBlacklistService } from './token-blacklist.service';
import { RedisService } from '../../common/services/redis.service';
import Redis from 'ioredis';

describe('TokenBlacklistService', () => {
  let service: TokenBlacklistService;
  let redisService: RedisService;
  let jwtService: JwtService;
  let configService: ConfigService;
  let mockRedisClient: any;

  beforeEach(async () => {
    // Create mock Redis client
    mockRedisClient = {
      setex: jest.fn().mockResolvedValue('OK'),
      exists: jest.fn().mockResolvedValue(0),
      get: jest.fn().mockResolvedValue(null),
      del: jest.fn().mockResolvedValue(1),
      keys: jest.fn().mockResolvedValue([]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TokenBlacklistService,
        {
          provide: RedisService,
          useValue: {
            getClient: jest.fn().mockReturnValue(mockRedisClient),
          },
        },
        {
          provide: JwtService,
          useValue: {
            decode: jest.fn(),
            sign: jest.fn(),
            verify: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key) => {
              const config = {
                'jwt.algorithm': 'RS256',
                'jwt.accessTokenExpiry': '15m',
                'jwt.refreshTokenExpiry': '30d',
              };
              return config[key];
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TokenBlacklistService>(TokenBlacklistService);
    redisService = module.get<RedisService>(RedisService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('blacklist', () => {
    it('should blacklist a token with JTI', async () => {
      const jti = 'test-jti-123';
      const expiresIn = 900; // 15 minutes
      const reason = 'logout';

      await service.blacklist(jti, expiresIn, reason);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'token:blacklist:test-jti-123',
        expiresIn,
        expect.stringContaining(reason),
      );
    });

    it('should throw error if Redis fails', async () => {
      const jti = 'test-jti-123';
      const expiresIn = 900;
      mockRedisClient.setex.mockRejectedValue(new Error('Redis error'));

      await expect(service.blacklist(jti, expiresIn)).rejects.toThrow('Redis error');
    });
  });

  describe('isBlacklisted', () => {
    it('should return false for non-blacklisted token', async () => {
      const jti = 'test-jti-123';
      mockRedisClient.exists.mockResolvedValue(0);

      const result = await service.isBlacklisted(jti);

      expect(result).toBe(false);
      expect(mockRedisClient.exists).toHaveBeenCalledWith('token:blacklist:test-jti-123');
    });

    it('should return true for blacklisted token', async () => {
      const jti = 'test-jti-123';
      mockRedisClient.exists.mockResolvedValue(1);

      const result = await service.isBlacklisted(jti);

      expect(result).toBe(true);
      expect(mockRedisClient.exists).toHaveBeenCalledWith('token:blacklist:test-jti-123');
    });

    it('should return false if JTI is not provided', async () => {
      const result = await service.isBlacklisted('');
      expect(result).toBe(false);
      expect(mockRedisClient.exists).not.toHaveBeenCalled();
    });

    it('should return false if Redis fails (fail open)', async () => {
      const jti = 'test-jti-123';
      mockRedisClient.exists.mockRejectedValue(new Error('Redis error'));

      const result = await service.isBlacklisted(jti);

      expect(result).toBe(false); // Fail open for availability
    });
  });

  describe('blacklistAllUserTokens', () => {
    it('should blacklist all tokens for a user', async () => {
      const userId = 'user-123';

      await service.blacklistAllUserTokens(userId);

      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'token:blacklist:user:user-123',
        30 * 24 * 60 * 60, // 30 days
        expect.any(String),
      );
    });

    it('should throw error if Redis fails', async () => {
      const userId = 'user-123';
      mockRedisClient.setex.mockRejectedValue(new Error('Redis error'));

      await expect(service.blacklistAllUserTokens(userId)).rejects.toThrow('Redis error');
    });
  });

  describe('isUserTokenBlacklisted', () => {
    it('should return false if no user blacklist exists', async () => {
      const userId = 'user-123';
      const tokenIssuedAt = new Date();
      mockRedisClient.get.mockResolvedValue(null);

      const result = await service.isUserTokenBlacklisted(userId, tokenIssuedAt);

      expect(result).toBe(false);
      expect(mockRedisClient.get).toHaveBeenCalledWith('token:blacklist:user:user-123');
    });

    it('should return true if token was issued before blacklist date', async () => {
      const userId = 'user-123';
      const blacklistDate = new Date();
      const tokenIssuedAt = new Date(blacklistDate.getTime() - 1000); // 1 second before

      mockRedisClient.get.mockResolvedValue(blacklistDate.toISOString());

      const result = await service.isUserTokenBlacklisted(userId, tokenIssuedAt);

      expect(result).toBe(true);
    });

    it('should return false if token was issued after blacklist date', async () => {
      const userId = 'user-123';
      const blacklistDate = new Date();
      const tokenIssuedAt = new Date(blacklistDate.getTime() + 1000); // 1 second after

      mockRedisClient.get.mockResolvedValue(blacklistDate.toISOString());

      const result = await service.isUserTokenBlacklisted(userId, tokenIssuedAt);

      expect(result).toBe(false);
    });

    it('should return false if Redis fails (fail open)', async () => {
      const userId = 'user-123';
      const tokenIssuedAt = new Date();
      mockRedisClient.get.mockRejectedValue(new Error('Redis error'));

      const result = await service.isUserTokenBlacklisted(userId, tokenIssuedAt);

      expect(result).toBe(false); // Fail open for availability
    });
  });

  describe('blacklistToken', () => {
    it('should blacklist a JWT token by extracting JTI', async () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      const decodedToken = {
        jti: 'test-jti-123',
        exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes from now
        sub: 'user-123',
      };

      (jwtService.decode as jest.Mock).mockReturnValue(decodedToken);

      await service.blacklistToken(token, 'logout');

      expect(jwtService.decode).toHaveBeenCalledWith(token);
      expect(mockRedisClient.setex).toHaveBeenCalledWith(
        'token:blacklist:test-jti-123',
        expect.any(Number),
        expect.stringContaining('logout'),
      );
    });

    it('should not blacklist if token has no JTI', async () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      const decodedToken = {
        exp: Math.floor(Date.now() / 1000) + 900,
        sub: 'user-123',
        // No jti field
      };

      (jwtService.decode as jest.Mock).mockReturnValue(decodedToken);

      await service.blacklistToken(token, 'logout');

      expect(jwtService.decode).toHaveBeenCalledWith(token);
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });

    it('should not blacklist if token is already expired', async () => {
      const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
      const decodedToken = {
        jti: 'test-jti-123',
        exp: Math.floor(Date.now() / 1000) - 100, // Already expired
        sub: 'user-123',
      };

      (jwtService.decode as jest.Mock).mockReturnValue(decodedToken);

      await service.blacklistToken(token, 'logout');

      expect(jwtService.decode).toHaveBeenCalledWith(token);
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });

    it('should throw error if decoding fails', async () => {
      const token = 'invalid-token';
      (jwtService.decode as jest.Mock).mockReturnValue(null);

      await service.blacklistToken(token, 'logout');

      expect(jwtService.decode).toHaveBeenCalledWith(token);
      expect(mockRedisClient.setex).not.toHaveBeenCalled();
    });
  });

  describe('clearUserBlacklist', () => {
    it('should clear user blacklist', async () => {
      const userId = 'user-123';

      await service.clearUserBlacklist(userId);

      expect(mockRedisClient.del).toHaveBeenCalledWith('token:blacklist:user:user-123');
    });

    it('should throw error if Redis fails', async () => {
      const userId = 'user-123';
      mockRedisClient.del.mockRejectedValue(new Error('Redis error'));

      await expect(service.clearUserBlacklist(userId)).rejects.toThrow('Redis error');
    });
  });

  describe('getBlacklistStats', () => {
    it('should return blacklist statistics', async () => {
      mockRedisClient.keys
        .mockResolvedValueOnce(['token:blacklist:jti1', 'token:blacklist:jti2'])
        .mockResolvedValueOnce(['token:blacklist:user:user1']);

      const stats = await service.getBlacklistStats();

      expect(stats).toEqual({
        totalBlacklistedTokens: 2,
        totalBlacklistedUsers: 1,
      });
      expect(mockRedisClient.keys).toHaveBeenCalledWith('token:blacklist:[!user:]*');
      expect(mockRedisClient.keys).toHaveBeenCalledWith('token:blacklist:user:*');
    });

    it('should return zero stats if Redis fails', async () => {
      mockRedisClient.keys.mockRejectedValue(new Error('Redis error'));

      const stats = await service.getBlacklistStats();

      expect(stats).toEqual({
        totalBlacklistedTokens: 0,
        totalBlacklistedUsers: 0,
      });
    });
  });
});