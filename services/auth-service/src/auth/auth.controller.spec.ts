import { Test, TestingModule } from '@nestjs/testing';
import { RegisterDto } from './dto/register.dto';

// Mock uuid at the top level
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mocked-uuid-value'),
}));

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    register: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should call authService.register with correct parameters', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        terms_accepted: true,
        kvkk_consent_accepted: true,
      };

      const expectedResult = {
        success: true,
        data: {
          user: {
            id: '123',
            email: registerDto.email,
            email_verified: false,
            created_at: new Date(),
          },
          message: 'Kayıt başarılı.',
        },
        meta: {
          timestamp: new Date().toISOString(),
          request_id: 'req_123',
        },
      };

      mockAuthService.register.mockResolvedValue(expectedResult);

      const ip = '192.168.1.1';
      const result = await controller.register(registerDto, ip);

      expect(result).toEqual(expectedResult);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
      expect(mockAuthService.register).toHaveBeenCalledTimes(1);
    });

    it('should handle service errors', async () => {
      const registerDto: RegisterDto = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        terms_accepted: true,
        kvkk_consent_accepted: true,
      };

      const error = new Error('Service error');
      mockAuthService.register.mockRejectedValue(error);

      const ip = '192.168.1.1';

      await expect(controller.register(registerDto, ip)).rejects.toThrow(error);
      expect(mockAuthService.register).toHaveBeenCalledWith(registerDto);
    });
  });
});