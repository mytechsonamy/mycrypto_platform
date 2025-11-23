import { Test, TestingModule } from '@nestjs/testing';
import { IBANValidationService } from './iban-validation.service';

describe('IBANValidationService', () => {
  let service: IBANValidationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IBANValidationService],
    }).compile();

    service = module.get<IBANValidationService>(IBANValidationService);
  });

  describe('Service Initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });
  });

  describe('validateIBAN', () => {
    it('should validate correct German IBAN', () => {
      const result = service.validateIBAN('DE89370400440532013000');

      expect(result.isValid).toBe(true);
      expect(result.iban).toBe('DE89370400440532013000');
      expect(result.country).toBe('DE');
      expect(result.friendlyFormat).toBe('DE89 3704 0044 0532 0130 00');
    });

    it('should validate correct French IBAN', () => {
      const result = service.validateIBAN('FR1420041010050500013M02606');

      expect(result.isValid).toBe(true);
      expect(result.iban).toBe('FR1420041010050500013M02606');
      expect(result.country).toBe('FR');
    });

    it('should validate correct Turkish IBAN', () => {
      const result = service.validateIBAN('TR330006100519786457841326');

      expect(result.isValid).toBe(true);
      expect(result.iban).toBe('TR330006100519786457841326');
      expect(result.country).toBe('TR');
    });

    it('should validate correct UK IBAN', () => {
      const result = service.validateIBAN('GB82WEST12345698765432');

      expect(result.isValid).toBe(true);
      expect(result.iban).toBe('GB82WEST12345698765432');
      expect(result.country).toBe('GB');
    });

    it('should validate IBAN with spaces', () => {
      const result = service.validateIBAN('DE89 3704 0044 0532 0130 00');

      expect(result.isValid).toBe(true);
      expect(result.iban).toBe('DE89370400440532013000');
    });

    it('should validate lowercase IBAN', () => {
      const result = service.validateIBAN('de89370400440532013000');

      expect(result.isValid).toBe(true);
      expect(result.iban).toBe('DE89370400440532013000');
    });

    it('should reject invalid IBAN checksum', () => {
      const result = service.validateIBAN('DE89370400440532013001'); // Wrong checksum

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid IBAN format or checksum');
    });

    it('should reject IBAN with invalid country code', () => {
      const result = service.validateIBAN('XX89370400440532013000');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid IBAN format or checksum');
    });

    it('should reject too short IBAN', () => {
      const result = service.validateIBAN('DE8937040044053');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid IBAN format or checksum');
    });

    it('should reject empty IBAN', () => {
      const result = service.validateIBAN('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('IBAN is required');
    });

    it('should reject null IBAN', () => {
      const result = service.validateIBAN(null as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('IBAN is required');
    });

    it('should reject undefined IBAN', () => {
      const result = service.validateIBAN(undefined as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('IBAN is required');
    });

    it('should reject IBAN with special characters', () => {
      const result = service.validateIBAN('DE89-3704-0044-0532-0130-00');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid IBAN format or checksum');
    });

    it('should validate IBANs from multiple countries', () => {
      const ibans = [
        'AT611904300234573201', // Austria
        'BE68539007547034', // Belgium
        'CH9300762011623852957', // Switzerland
        'ES9121000418450200051332', // Spain
        'IT60X0542811101000000123456', // Italy
        'NL91ABNA0417164300', // Netherlands
        'PL61109010140000071219812874', // Poland
      ];

      ibans.forEach((iban) => {
        const result = service.validateIBAN(iban);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('validateSWIFT', () => {
    it('should validate correct 8-character SWIFT code', () => {
      const result = service.validateSWIFT('DEUTDEFF');

      expect(result.isValid).toBe(true);
      expect(result.swift).toBe('DEUTDEFF');
    });

    it('should validate correct 11-character SWIFT code', () => {
      const result = service.validateSWIFT('DEUTDEFF500');

      expect(result.isValid).toBe(true);
      expect(result.swift).toBe('DEUTDEFF500');
    });

    it('should validate SWIFT with spaces', () => {
      const result = service.validateSWIFT('DEUT DE FF');

      expect(result.isValid).toBe(true);
      expect(result.swift).toBe('DEUTDEFF');
    });

    it('should validate lowercase SWIFT', () => {
      const result = service.validateSWIFT('deutdeff');

      expect(result.isValid).toBe(true);
      expect(result.swift).toBe('DEUTDEFF');
    });

    it('should reject SWIFT with wrong length', () => {
      const result = service.validateSWIFT('DEUT');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid SWIFT/BIC code format');
    });

    it('should reject SWIFT with numbers in bank code', () => {
      const result = service.validateSWIFT('D3UTDEFF');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid SWIFT/BIC code format');
    });

    it('should reject empty SWIFT', () => {
      const result = service.validateSWIFT('');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('SWIFT/BIC code is required');
    });

    it('should reject null SWIFT', () => {
      const result = service.validateSWIFT(null as any);

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('SWIFT/BIC code is required');
    });

    it('should validate multiple valid SWIFT codes', () => {
      const swifts = [
        'CHASUS33', // Chase Bank (US)
        'BOFAUS3N', // Bank of America
        'CITIUS33', // Citibank
        'WFBIUS6S', // Wells Fargo
        'DEUTDEFF', // Deutsche Bank (Germany)
        'BNPAFRPP', // BNP Paribas (France)
        'HSBCGB2L', // HSBC (UK)
      ];

      swifts.forEach((swift) => {
        const result = service.validateSWIFT(swift);
        expect(result.isValid).toBe(true);
      });
    });
  });

  describe('validateUSAccount', () => {
    it('should validate correct US account details', () => {
      const result = service.validateUSAccount('1234567890', '021000021'); // Chase routing

      expect(result.isValid).toBe(true);
    });

    it('should validate US account with various lengths', () => {
      const validAccounts = [
        '123456', // 6 digits
        '12345678901234567', // 17 digits
        '1234567890123', // 13 digits
      ];

      validAccounts.forEach((account) => {
        const result = service.validateUSAccount(account, '021000021');
        expect(result.isValid).toBe(true);
      });
    });

    it('should validate multiple real US routing numbers', () => {
      const validRoutingNumbers = [
        '021000021', // Chase (NY)
        '026009593', // Bank of America (NY)
        '021001088', // Citibank (NY)
        '121000248', // Wells Fargo (CA)
        '111000025', // Chase (TX)
      ];

      validRoutingNumbers.forEach((routing) => {
        const result = service.validateUSAccount('1234567890', routing);
        expect(result.isValid).toBe(true);
      });
    });

    it('should reject account number too short', () => {
      const result = service.validateUSAccount('12345', '021000021');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Account number must be 6-17 digits');
    });

    it('should reject account number too long', () => {
      const result = service.validateUSAccount('123456789012345678', '021000021');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Account number must be 6-17 digits');
    });

    it('should reject account number with letters', () => {
      const result = service.validateUSAccount('12345ABC', '021000021');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Account number must be 6-17 digits');
    });

    it('should reject routing number with wrong length', () => {
      const result = service.validateUSAccount('1234567890', '02100002');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Routing number must be exactly 9 digits');
    });

    it('should reject routing number with invalid checksum', () => {
      const result = service.validateUSAccount('1234567890', '021000022'); // Wrong checksum

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Invalid routing number checksum');
    });

    it('should reject when account number is missing', () => {
      const result = service.validateUSAccount('', '021000021');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Both account number and routing number are required');
    });

    it('should reject when routing number is missing', () => {
      const result = service.validateUSAccount('1234567890', '');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Both account number and routing number are required');
    });

    it('should reject when both are missing', () => {
      const result = service.validateUSAccount('', '');

      expect(result.isValid).toBe(false);
      expect(result.error).toBe('Both account number and routing number are required');
    });
  });

  describe('getAccountType', () => {
    it('should return IBAN for EUR', () => {
      expect(service.getAccountType('EUR')).toBe('IBAN');
    });

    it('should return IBAN for GBP', () => {
      expect(service.getAccountType('GBP')).toBe('IBAN');
    });

    it('should return IBAN for TRY', () => {
      expect(service.getAccountType('TRY')).toBe('IBAN');
    });

    it('should return IBAN for CHF', () => {
      expect(service.getAccountType('CHF')).toBe('IBAN');
    });

    it('should return US_ACCOUNT for USD', () => {
      expect(service.getAccountType('USD')).toBe('US_ACCOUNT');
    });

    it('should return UNKNOWN for unsupported currency', () => {
      expect(service.getAccountType('JPY')).toBe('UNKNOWN');
    });

    it('should be case-insensitive', () => {
      expect(service.getAccountType('eur')).toBe('IBAN');
      expect(service.getAccountType('usd')).toBe('US_ACCOUNT');
    });

    it('should handle all IBAN currencies', () => {
      const ibanCurrencies = ['EUR', 'GBP', 'CHF', 'TRY', 'PLN', 'SEK', 'NOK', 'DKK'];

      ibanCurrencies.forEach((currency) => {
        expect(service.getAccountType(currency)).toBe('IBAN');
      });
    });
  });
});
