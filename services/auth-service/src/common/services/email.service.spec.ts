import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import * as nodemailer from 'nodemailer';

import { EmailService } from './email.service';

// Mock nodemailer
jest.mock('nodemailer');

// Mock fs
jest.mock('fs');

describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;
  let mockTransporter: any;

  beforeEach(async () => {
    // Setup mock transporter
    mockTransporter = {
      sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
      verify: jest.fn().mockResolvedValue(true),
    };

    // Mock nodemailer.createTransport
    (nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter);

    // Mock fs.readFileSync to return template content
    (fs.readFileSync as jest.Mock).mockImplementation((filePath: string) => {
      if (filePath.includes('.html')) {
        return '<html><body>Hello {{userName}}, your code is {{verificationCode}}. Link: {{verificationLink}}</body></html>';
      }
      if (filePath.includes('.txt')) {
        return 'Hello {{userName}}, your code is {{verificationCode}}. Link: {{verificationLink}}';
      }
      throw new Error('Template not found');
    });

    // Mock fs.existsSync
    (fs.existsSync as jest.Mock).mockReturnValue(true);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                'email.host': 'mailhog',
                'email.port': 1025,
                'email.secure': false,
                'email.from': 'noreply@exchange.local',
                'email.templatesPath': './templates/emails',
                'email.mockEmailService': false,
                'email.devEmailCapture': false,
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('sendVerificationEmail', () => {
    it('should send verification email successfully', async () => {
      const email = 'test@example.com';
      const userName = 'John';
      const verificationCode = '123456';
      const verificationLink = 'http://localhost:3000/verify?code=123456';

      const result = await service.sendVerificationEmail(
        email,
        userName,
        verificationCode,
        verificationLink,
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@exchange.local',
        to: email,
        cc: undefined,
        bcc: undefined,
        replyTo: undefined,
        subject: 'Email Verification - MyCrypto Exchange / E-mail Doğrulaması - MyCrypto Exchange',
        html: expect.stringContaining('John'),
        text: expect.stringContaining('John'),
      });
    });

    it('should handle invalid email address', async () => {
      const result = await service.sendVerificationEmail(
        'invalid-email',
        'John',
        '123456',
        'http://localhost:3000/verify',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('Invalid email address');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });

    it('should handle email sending failure', async () => {
      mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'));

      const result = await service.sendVerificationEmail(
        'test@example.com',
        'John',
        '123456',
        'http://localhost:3000/verify',
      );

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMTP error');
    });
  });

  describe('sendPasswordResetEmail', () => {
    it('should send password reset email successfully', async () => {
      const email = 'test@example.com';
      const userName = 'John';
      const resetLink = 'http://localhost:3000/reset?token=abc123';

      const result = await service.sendPasswordResetEmail(
        email,
        userName,
        resetLink,
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBe('test-message-id');

      expect(mockTransporter.sendMail).toHaveBeenCalledWith({
        from: 'noreply@exchange.local',
        to: email,
        cc: undefined,
        bcc: undefined,
        replyTo: undefined,
        subject: 'Password Reset - MyCrypto Exchange / Şifre Sıfırlama - MyCrypto Exchange',
        html: expect.any(String),
        text: expect.any(String),
      });
    });
  });

  describe('healthCheck', () => {
    it('should return healthy when templates exist', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(true);

      const result = await service.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.message).toBe('Email service is healthy');
    });

    it('should return unhealthy when templates are missing', async () => {
      (fs.existsSync as jest.Mock).mockReturnValue(false);

      const result = await service.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.message).toContain('Email templates not found');
    });
  });

  describe('Mock mode', () => {
    it('should not send real emails in mock mode', async () => {
      // Create a service instance with mock mode enabled
      const mockConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'email.mockEmailService') return true;
          const config = {
            'email.from': 'noreply@exchange.local',
            'email.templatesPath': './templates/emails',
            'email.devEmailCapture': false,
          };
          return config[key] || defaultValue;
        }),
      };

      const mockModule: TestingModule = await Test.createTestingModule({
        providers: [
          EmailService,
          {
            provide: ConfigService,
            useValue: mockConfigService,
          },
        ],
      }).compile();

      const mockService = mockModule.get<EmailService>(EmailService);

      const result = await mockService.sendVerificationEmail(
        'test@example.com',
        'John',
        '123456',
        'http://localhost:3000/verify',
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toContain('mock-');
      expect(mockTransporter.sendMail).not.toHaveBeenCalled();
    });
  });

  describe('Template interpolation', () => {
    it('should interpolate template variables correctly', async () => {
      const result = await service.sendVerificationEmail(
        'test@example.com',
        'John Doe',
        'ABCDEF',
        'http://example.com/verify?token=xyz',
      );

      expect(result.success).toBe(true);

      const sentEmail = mockTransporter.sendMail.mock.calls[0][0];
      expect(sentEmail.html).toContain('John Doe');
      expect(sentEmail.html).toContain('ABCDEF');
      expect(sentEmail.html).toContain('http://example.com/verify?token=xyz');
      expect(sentEmail.text).toContain('John Doe');
      expect(sentEmail.text).toContain('ABCDEF');
      expect(sentEmail.text).toContain('http://example.com/verify?token=xyz');
    });
  });
});