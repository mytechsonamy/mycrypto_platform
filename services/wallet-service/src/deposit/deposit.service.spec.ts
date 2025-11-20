import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { DepositService } from './deposit.service';
import { FiatAccount } from '../wallet/entities/fiat-account.entity';
import { DepositRequest } from './entities/deposit-request.entity';
import { AddBankAccountDto } from './dto/add-bank-account.dto';
import { CreateDepositRequestDto } from './dto/create-deposit-request.dto';

describe('DepositService', () => {
  let service: DepositService;
  let fiatAccountRepository: Repository<FiatAccount>;
  let depositRequestRepository: Repository<DepositRequest>;
  let configService: ConfigService;

  const mockUserId = '550e8400-e29b-41d4-a716-446655440000';
  const mockAccountId = '660e8400-e29b-41d4-a716-446655440001';
  const mockDepositId = '770e8400-e29b-41d4-a716-446655440002';

  const mockFiatAccount: Partial<FiatAccount> = {
    id: mockAccountId,
    userId: mockUserId,
    accountHolderName: 'Ahmet Yılmaz',
    iban: 'TR330006100519786457841326',
    bankName: 'Türkiye İş Bankası',
    isVerified: false,
    verifiedAt: null,
    createdAt: new Date('2025-11-20T10:00:00.000Z'),
    updatedAt: new Date('2025-11-20T10:00:00.000Z'),
  };

  const mockDepositRequest: Partial<DepositRequest> = {
    id: mockDepositId,
    userId: mockUserId,
    currency: 'TRY',
    amount: '1000.00',
    status: 'PENDING',
    fiatAccountId: mockAccountId,
    transactionReference: 'DEP-20251120-ABC123',
    adminNotes: null,
    receiptUrl: null,
    createdAt: new Date('2025-11-20T10:00:00.000Z'),
    updatedAt: new Date('2025-11-20T10:00:00.000Z'),
    completedAt: null,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DepositService,
        {
          provide: getRepositoryToken(FiatAccount),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(DepositRequest),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            count: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                VIRTUAL_IBAN: 'TR330006100519786457841326',
                TRY_MIN_DEPOSIT: 100,
                TRY_MAX_DEPOSIT: 50000,
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<DepositService>(DepositService);
    fiatAccountRepository = module.get<Repository<FiatAccount>>(
      getRepositoryToken(FiatAccount),
    );
    depositRequestRepository = module.get<Repository<DepositRequest>>(
      getRepositoryToken(DepositRequest),
    );
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('addBankAccount', () => {
    const addBankAccountDto: AddBankAccountDto = {
      accountHolderName: 'Ahmet Yılmaz',
      iban: 'TR330006100519786457841326',
      bankName: 'Türkiye İş Bankası',
    };

    it('should successfully add a bank account', async () => {
      jest.spyOn(fiatAccountRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(fiatAccountRepository, 'create')
        .mockReturnValue(mockFiatAccount as FiatAccount);
      jest
        .spyOn(fiatAccountRepository, 'save')
        .mockResolvedValue(mockFiatAccount as FiatAccount);

      const result = await service.addBankAccount(mockUserId, addBankAccountDto);

      expect(result).toEqual({
        id: mockAccountId,
        accountHolderName: 'Ahmet Yılmaz',
        iban: 'TR330006100519786457841326',
        bankName: 'Türkiye İş Bankası',
        isVerified: false,
        verifiedAt: null,
        createdAt: mockFiatAccount.createdAt,
      });
      expect(fiatAccountRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          iban: addBankAccountDto.iban,
        },
      });
      expect(fiatAccountRepository.save).toHaveBeenCalled();
    });

    it('should throw ConflictException if IBAN already exists', async () => {
      jest
        .spyOn(fiatAccountRepository, 'findOne')
        .mockResolvedValue(mockFiatAccount as FiatAccount);

      await expect(
        service.addBankAccount(mockUserId, addBankAccountDto),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException on database error', async () => {
      jest.spyOn(fiatAccountRepository, 'findOne').mockResolvedValue(null);
      jest
        .spyOn(fiatAccountRepository, 'create')
        .mockReturnValue(mockFiatAccount as FiatAccount);
      jest
        .spyOn(fiatAccountRepository, 'save')
        .mockRejectedValue(new Error('Database error'));

      await expect(
        service.addBankAccount(mockUserId, addBankAccountDto),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getUserBankAccounts', () => {
    it('should return list of user bank accounts', async () => {
      const accounts = [mockFiatAccount, { ...mockFiatAccount, id: 'another-id' }];
      jest
        .spyOn(fiatAccountRepository, 'find')
        .mockResolvedValue(accounts as FiatAccount[]);

      const result = await service.getUserBankAccounts(mockUserId);

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe(mockAccountId);
      expect(fiatAccountRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array if no accounts found', async () => {
      jest.spyOn(fiatAccountRepository, 'find').mockResolvedValue([]);

      const result = await service.getUserBankAccounts(mockUserId);

      expect(result).toEqual([]);
    });

    it('should throw BadRequestException on database error', async () => {
      jest
        .spyOn(fiatAccountRepository, 'find')
        .mockRejectedValue(new Error('Database error'));

      await expect(service.getUserBankAccounts(mockUserId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('removeBankAccount', () => {
    it('should successfully remove a bank account', async () => {
      jest
        .spyOn(fiatAccountRepository, 'findOne')
        .mockResolvedValue(mockFiatAccount as FiatAccount);
      jest.spyOn(depositRequestRepository, 'count').mockResolvedValue(0);
      jest.spyOn(fiatAccountRepository, 'remove').mockResolvedValue(undefined);

      await expect(
        service.removeBankAccount(mockUserId, mockAccountId),
      ).resolves.not.toThrow();

      expect(fiatAccountRepository.remove).toHaveBeenCalledWith(mockFiatAccount);
    });

    it('should throw NotFoundException if account does not exist', async () => {
      jest.spyOn(fiatAccountRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.removeBankAccount(mockUserId, mockAccountId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if account has pending deposits', async () => {
      jest
        .spyOn(fiatAccountRepository, 'findOne')
        .mockResolvedValue(mockFiatAccount as FiatAccount);
      jest.spyOn(depositRequestRepository, 'count').mockResolvedValue(1);

      await expect(
        service.removeBankAccount(mockUserId, mockAccountId),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('createDepositRequest', () => {
    const createDepositDto: CreateDepositRequestDto = {
      amount: 1000,
      fiatAccountId: mockAccountId,
    };

    it('should successfully create a deposit request', async () => {
      jest
        .spyOn(fiatAccountRepository, 'findOne')
        .mockResolvedValue(mockFiatAccount as FiatAccount);
      jest
        .spyOn(depositRequestRepository, 'create')
        .mockReturnValue(mockDepositRequest as DepositRequest);
      jest
        .spyOn(depositRequestRepository, 'save')
        .mockResolvedValue(mockDepositRequest as DepositRequest);

      const result = await service.createDepositRequest(mockUserId, createDepositDto);

      expect(result).toHaveProperty('depositId', mockDepositId);
      expect(result).toHaveProperty('amount', '1000.00');
      expect(result).toHaveProperty('virtualIban', 'TR330006100519786457841326');
      expect(result).toHaveProperty('status', 'PENDING');
      expect(result).toHaveProperty('reference');
      expect(result.reference).toMatch(/^DEP-\d{8}-[A-Z0-9]{6}$/);
      expect(depositRequestRepository.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException if amount is below minimum', async () => {
      const invalidDto = { ...createDepositDto, amount: 50 };

      await expect(
        service.createDepositRequest(mockUserId, invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if amount exceeds maximum', async () => {
      const invalidDto = { ...createDepositDto, amount: 60000 };

      await expect(
        service.createDepositRequest(mockUserId, invalidDto),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if bank account not found', async () => {
      jest.spyOn(fiatAccountRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.createDepositRequest(mockUserId, createDepositDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getDepositRequest', () => {
    it('should return deposit request details', async () => {
      jest
        .spyOn(depositRequestRepository, 'findOne')
        .mockResolvedValue(mockDepositRequest as DepositRequest);

      const result = await service.getDepositRequest(mockUserId, mockDepositId);

      expect(result).toHaveProperty('depositId', mockDepositId);
      expect(result).toHaveProperty('userId', mockUserId);
      expect(result).toHaveProperty('amount', '1000.00');
      expect(result).toHaveProperty('status', 'PENDING');
      expect(depositRequestRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: mockDepositId,
          userId: mockUserId,
        },
      });
    });

    it('should throw NotFoundException if deposit not found', async () => {
      jest.spyOn(depositRequestRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.getDepositRequest(mockUserId, mockDepositId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('approveDeposit', () => {
    const mockAdminId = 'admin-550e8400-e29b-41d4-a716-446655440000';

    it('should successfully approve a pending deposit', async () => {
      jest
        .spyOn(depositRequestRepository, 'findOne')
        .mockResolvedValue(mockDepositRequest as DepositRequest);
      jest.spyOn(depositRequestRepository, 'save').mockResolvedValue({
        ...mockDepositRequest,
        status: 'APPROVED',
        completedAt: new Date(),
      } as DepositRequest);

      const result = await service.approveDeposit(mockDepositId, mockAdminId);

      expect(result.status).toBe('APPROVED');
      expect(result.completedAt).toBeDefined();
      expect(depositRequestRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if deposit not found', async () => {
      jest.spyOn(depositRequestRepository, 'findOne').mockResolvedValue(null);

      await expect(
        service.approveDeposit(mockDepositId, mockAdminId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if deposit is not pending', async () => {
      jest.spyOn(depositRequestRepository, 'findOne').mockResolvedValue({
        ...mockDepositRequest,
        status: 'APPROVED',
      } as DepositRequest);

      await expect(
        service.approveDeposit(mockDepositId, mockAdminId),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
