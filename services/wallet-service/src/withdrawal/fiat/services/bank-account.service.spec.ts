import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { BankAccountService } from './bank-account.service';
import { BankAccount } from '../entities/bank-account.entity';
import { IBANValidationService } from './iban-validation.service';
import { AddBankAccountDto, BankAccountCurrency } from '../dto/add-bank-account.dto';

describe('BankAccountService', () => {
  let service: BankAccountService;
  let repository: Repository<BankAccount>;
  let ibanValidationService: IBANValidationService;

  const testUserId = 'user-123';
  const testAccountId = 'account-456';

  const mockBankAccount: Partial<BankAccount> = {
    id: testAccountId,
    userId: testUserId,
    currency: 'EUR' as any,
    bankName: 'Deutsche Bank',
    iban: 'DE89370400440532013000',
    swiftCode: 'DEUTDEFF',
    accountHolderName: 'John Doe',
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    count: jest.fn(),
    remove: jest.fn(),
    update: jest.fn(),
  };

  const mockIBANValidationService = {
    validateIBAN: jest.fn(),
    validateSWIFT: jest.fn(),
    validateUSAccount: jest.fn(),
    getAccountType: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BankAccountService,
        {
          provide: getRepositoryToken(BankAccount),
          useValue: mockRepository,
        },
        {
          provide: IBANValidationService,
          useValue: mockIBANValidationService,
        },
      ],
    }).compile();

    service = module.get<BankAccountService>(BankAccountService);
    repository = module.get<Repository<BankAccount>>(
      getRepositoryToken(BankAccount),
    );
    ibanValidationService = module.get<IBANValidationService>(
      IBANValidationService,
    );

    jest.clearAllMocks();
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('addBankAccount - EUR/IBAN', () => {
    const addIbanDto: AddBankAccountDto = {
      currency: BankAccountCurrency.EUR,
      bankName: 'Deutsche Bank',
      accountHolderName: 'John Doe',
      iban: 'DE89370400440532013000',
      swiftCode: 'DEUTDEFF',
    };

    it('should add IBAN account successfully', async () => {
      mockIBANValidationService.getAccountType.mockReturnValue('IBAN');
      mockIBANValidationService.validateIBAN.mockReturnValue({
        isValid: true,
        iban: 'DE89370400440532013000',
      });
      mockIBANValidationService.validateSWIFT.mockReturnValue({
        isValid: true,
        swift: 'DEUTDEFF',
      });
      mockRepository.findOne.mockResolvedValue(null); // No duplicate
      mockRepository.count.mockResolvedValue(0); // No existing accounts
      mockRepository.create.mockReturnValue(mockBankAccount);
      mockRepository.save.mockResolvedValue(mockBankAccount);

      const result = await service.addBankAccount(testUserId, addIbanDto);

      expect(result).toBeDefined();
      expect(result.currency).toBe('EUR');
      expect(result.maskedIban).toContain('DE**');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should reject invalid IBAN', async () => {
      mockIBANValidationService.getAccountType.mockReturnValue('IBAN');
      mockIBANValidationService.validateIBAN.mockReturnValue({
        isValid: false,
        error: 'Invalid IBAN format or checksum',
      });

      await expect(
        service.addBankAccount(testUserId, addIbanDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addBankAccount(testUserId, addIbanDto),
      ).rejects.toThrow('Invalid IBAN format or checksum');
    });

    it('should reject invalid SWIFT code', async () => {
      mockIBANValidationService.getAccountType.mockReturnValue('IBAN');
      mockIBANValidationService.validateIBAN.mockReturnValue({
        isValid: true,
        iban: 'DE89370400440532013000',
      });
      mockIBANValidationService.validateSWIFT.mockReturnValue({
        isValid: false,
        error: 'Invalid SWIFT/BIC code format',
      });

      await expect(
        service.addBankAccount(testUserId, addIbanDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addBankAccount(testUserId, addIbanDto),
      ).rejects.toThrow('Invalid SWIFT/BIC code format');
    });

    it('should reject duplicate IBAN', async () => {
      mockIBANValidationService.getAccountType.mockReturnValue('IBAN');
      mockIBANValidationService.validateIBAN.mockReturnValue({
        isValid: true,
        iban: 'DE89370400440532013000',
      });
      mockIBANValidationService.validateSWIFT.mockReturnValue({
        isValid: true,
        swift: 'DEUTDEFF',
      });
      mockRepository.findOne.mockResolvedValue(mockBankAccount); // Duplicate found

      await expect(
        service.addBankAccount(testUserId, addIbanDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addBankAccount(testUserId, addIbanDto),
      ).rejects.toThrow('This IBAN is already registered');
    });

    it('should reject when account limit reached', async () => {
      mockIBANValidationService.getAccountType.mockReturnValue('IBAN');
      mockIBANValidationService.validateIBAN.mockReturnValue({
        isValid: true,
        iban: 'DE89370400440532013000',
      });
      mockIBANValidationService.validateSWIFT.mockReturnValue({
        isValid: true,
        swift: 'DEUTDEFF',
      });
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.count.mockResolvedValue(3); // Limit reached

      await expect(
        service.addBankAccount(testUserId, addIbanDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addBankAccount(testUserId, addIbanDto),
      ).rejects.toThrow('Maximum 3 bank accounts allowed');
    });

    it('should require IBAN for EUR currency', async () => {
      mockIBANValidationService.getAccountType.mockReturnValue('IBAN');
      const dtoWithoutIban = { ...addIbanDto, iban: undefined };

      await expect(
        service.addBankAccount(testUserId, dtoWithoutIban),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addBankAccount(testUserId, dtoWithoutIban),
      ).rejects.toThrow('IBAN is required for EUR accounts');
    });
  });

  describe('addBankAccount - USD', () => {
    const addUsdDto: AddBankAccountDto = {
      currency: BankAccountCurrency.USD,
      bankName: 'Chase Bank',
      accountHolderName: 'John Doe',
      accountNumber: '1234567890',
      routingNumber: '021000021',
    };

    const mockUsdAccount: Partial<BankAccount> = {
      id: testAccountId,
      userId: testUserId,
      currency: 'USD' as any,
      bankName: 'Chase Bank',
      accountNumber: '1234567890',
      routingNumber: '021000021',
      accountHolderName: 'John Doe',
      isVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    it('should add USD account successfully', async () => {
      mockIBANValidationService.getAccountType.mockReturnValue('US_ACCOUNT');
      mockIBANValidationService.validateUSAccount.mockReturnValue({
        isValid: true,
      });
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.count.mockResolvedValue(0);
      mockRepository.create.mockReturnValue(mockUsdAccount);
      mockRepository.save.mockResolvedValue(mockUsdAccount);

      const result = await service.addBankAccount(testUserId, addUsdDto);

      expect(result).toBeDefined();
      expect(result.currency).toBe('USD');
      expect(result.maskedAccountNumber).toBe('****7890');
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should reject invalid US account', async () => {
      mockIBANValidationService.getAccountType.mockReturnValue('US_ACCOUNT');
      mockIBANValidationService.validateUSAccount.mockReturnValue({
        isValid: false,
        error: 'Invalid routing number checksum',
      });

      await expect(
        service.addBankAccount(testUserId, addUsdDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addBankAccount(testUserId, addUsdDto),
      ).rejects.toThrow('Invalid routing number checksum');
    });

    it('should reject duplicate account number', async () => {
      mockIBANValidationService.getAccountType.mockReturnValue('US_ACCOUNT');
      mockIBANValidationService.validateUSAccount.mockReturnValue({
        isValid: true,
      });
      mockRepository.findOne.mockResolvedValue(mockUsdAccount);

      await expect(
        service.addBankAccount(testUserId, addUsdDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addBankAccount(testUserId, addUsdDto),
      ).rejects.toThrow('This account number is already registered');
    });

    it('should require both account number and routing number for USD', async () => {
      mockIBANValidationService.getAccountType.mockReturnValue('US_ACCOUNT');
      const dtoWithoutRouting = {
        ...addUsdDto,
        routingNumber: undefined,
      };

      await expect(
        service.addBankAccount(testUserId, dtoWithoutRouting),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.addBankAccount(testUserId, dtoWithoutRouting),
      ).rejects.toThrow(
        'Account number and routing number are required for USD accounts',
      );
    });
  });

  describe('getBankAccounts', () => {
    it('should return all bank accounts for user', async () => {
      const mockAccounts = [mockBankAccount, { ...mockBankAccount, id: 'account-789' }];
      mockRepository.find.mockResolvedValue(mockAccounts);

      const result = await service.getBankAccounts(testUserId);

      expect(result).toHaveLength(2);
      expect(result[0].maskedIban).toBeDefined();
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: testUserId },
        order: { createdAt: 'DESC' },
      });
    });

    it('should filter by currency', async () => {
      mockRepository.find.mockResolvedValue([mockBankAccount]);

      const result = await service.getBankAccounts(testUserId, 'EUR');

      expect(result).toHaveLength(1);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: testUserId, currency: 'EUR' },
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array if no accounts', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.getBankAccounts(testUserId);

      expect(result).toEqual([]);
    });
  });

  describe('getBankAccountById', () => {
    it('should return bank account by ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockBankAccount);

      const result = await service.getBankAccountById(testUserId, testAccountId);

      expect(result).toBeDefined();
      expect(result.id).toBe(testAccountId);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: testAccountId, userId: testUserId },
      });
    });

    it('should throw NotFoundException if account not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getBankAccountById(testUserId, testAccountId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.getBankAccountById(testUserId, testAccountId),
      ).rejects.toThrow('Bank account not found');
    });

    it('should throw NotFoundException if account belongs to different user', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getBankAccountById('other-user', testAccountId),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('deleteBankAccount', () => {
    it('should delete bank account', async () => {
      mockRepository.findOne.mockResolvedValue(mockBankAccount);
      mockRepository.remove.mockResolvedValue(mockBankAccount);

      await service.deleteBankAccount(testUserId, testAccountId);

      expect(mockRepository.remove).toHaveBeenCalledWith(mockBankAccount);
    });

    it('should throw NotFoundException if account not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteBankAccount(testUserId, testAccountId),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.deleteBankAccount(testUserId, testAccountId),
      ).rejects.toThrow('Bank account not found');
    });
  });

  describe('verifyBankAccount', () => {
    it('should verify bank account', async () => {
      const unverifiedAccount = { ...mockBankAccount, isVerified: false };
      mockRepository.findOne.mockResolvedValue(unverifiedAccount);
      mockRepository.update.mockResolvedValue({ affected: 1 });
      mockRepository.save.mockResolvedValue({
        ...unverifiedAccount,
        isVerified: true,
        verifiedAt: new Date(),
      });

      const result = await service.verifyBankAccount(testAccountId, 'admin-123');

      expect(result.isVerified).toBe(true);
      expect(result.verifiedAt).toBeDefined();
      expect(mockRepository.update).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if account not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.verifyBankAccount(testAccountId, 'admin-123'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already verified', async () => {
      const verifiedAccount = { ...mockBankAccount, isVerified: true };
      mockRepository.findOne.mockResolvedValue(verifiedAccount);

      await expect(
        service.verifyBankAccount(testAccountId, 'admin-123'),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.verifyBankAccount(testAccountId, 'admin-123'),
      ).rejects.toThrow('Bank account is already verified');
    });

    it('should unverify other accounts for same currency', async () => {
      const unverifiedAccount = { ...mockBankAccount, isVerified: false };
      mockRepository.findOne.mockResolvedValue(unverifiedAccount);
      mockRepository.update.mockResolvedValue({ affected: 2 });
      mockRepository.save.mockResolvedValue({
        ...unverifiedAccount,
        isVerified: true,
        verifiedAt: new Date(),
      });

      await service.verifyBankAccount(testAccountId, 'admin-123');

      expect(mockRepository.update).toHaveBeenCalledWith(
        { userId: testUserId, currency: 'EUR' },
        { isVerified: false, verifiedAt: null },
      );
    });
  });

  describe('getVerifiedBankAccount', () => {
    it('should return verified account', async () => {
      const verifiedAccount = { ...mockBankAccount, isVerified: true };
      mockRepository.findOne.mockResolvedValue(verifiedAccount);

      const result = await service.getVerifiedBankAccount(testUserId, 'EUR');

      expect(result).toBeDefined();
      expect(result.isVerified).toBe(true);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { userId: testUserId, currency: 'EUR', isVerified: true },
      });
    });

    it('should return null if no verified account', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getVerifiedBankAccount(testUserId, 'EUR');

      expect(result).toBeNull();
    });
  });

  describe('getBankAccountEntity', () => {
    it('should return bank account entity for verified account', async () => {
      const verifiedAccount = { ...mockBankAccount, isVerified: true };
      mockRepository.findOne.mockResolvedValue(verifiedAccount);

      const result = await service.getBankAccountEntity(
        testUserId,
        testAccountId,
      );

      expect(result).toBeDefined();
      expect(result.isVerified).toBe(true);
    });

    it('should throw NotFoundException if account not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getBankAccountEntity(testUserId, testAccountId),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if account not verified', async () => {
      const unverifiedAccount = { ...mockBankAccount, isVerified: false };
      mockRepository.findOne.mockResolvedValue(unverifiedAccount);

      await expect(
        service.getBankAccountEntity(testUserId, testAccountId),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.getBankAccountEntity(testUserId, testAccountId),
      ).rejects.toThrow('Bank account must be verified before use');
    });
  });

  describe('Edge Cases', () => {
    it('should handle unsupported currency', async () => {
      mockIBANValidationService.getAccountType.mockReturnValue('UNKNOWN');
      const dto: AddBankAccountDto = {
        currency: 'JPY' as any,
        bankName: 'Test Bank',
        accountHolderName: 'John Doe',
      };

      await expect(service.addBankAccount(testUserId, dto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.addBankAccount(testUserId, dto)).rejects.toThrow(
        'Currency JPY is not supported',
      );
    });

    it('should convert IBAN to uppercase', async () => {
      mockIBANValidationService.getAccountType.mockReturnValue('IBAN');
      mockIBANValidationService.validateIBAN.mockReturnValue({
        isValid: true,
        iban: 'DE89370400440532013000',
      });
      mockRepository.findOne.mockResolvedValue(null);
      mockRepository.count.mockResolvedValue(0);

      const createSpy = jest.spyOn(mockRepository, 'create');
      mockRepository.save.mockResolvedValue(mockBankAccount);

      const dto = {
        currency: BankAccountCurrency.EUR,
        bankName: 'Deutsche Bank',
        accountHolderName: 'John Doe',
        iban: 'de89370400440532013000', // lowercase
      };

      await service.addBankAccount(testUserId, dto);

      expect(createSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          iban: 'DE89370400440532013000', // uppercase
        }),
      );
    });
  });
});
