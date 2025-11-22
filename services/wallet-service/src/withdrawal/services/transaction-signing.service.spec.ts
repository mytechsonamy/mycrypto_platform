import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { TransactionSigningService } from './transaction-signing.service';
import * as bitcoin from 'bitcoinjs-lib';
import { ECPairFactory } from 'ecpair';
import * as ecc from 'tiny-secp256k1';
import { ethers } from 'ethers';

describe('TransactionSigningService', () => {
  let service: TransactionSigningService;
  let configService: ConfigService;
  const ECPair = ECPairFactory(ecc);

  // Test wallets (NEVER use these in production!)
  const testBtcPrivateKey = 'cTxUSExZBhcn3nws1A2kadD7e7HZTp8UmoMFeowRaNfjBLSMAHmM'; // Testnet WIF
  const testEthPrivateKey = '0x0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  const testUsdtPrivateKey = '0xabcdef0123456789abcdef0123456789abcdef0123456789abcdef0123456789';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TransactionSigningService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                BTC_HOT_WALLET_PRIVATE_KEY: testBtcPrivateKey,
                ETH_HOT_WALLET_PRIVATE_KEY: testEthPrivateKey,
                USDT_HOT_WALLET_PRIVATE_KEY: testUsdtPrivateKey,
                BITCOIN_NETWORK: 'testnet',
                ETHEREUM_NETWORK: 'sepolia',
              };
              return config[key] !== undefined ? config[key] : defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<TransactionSigningService>(TransactionSigningService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Wallet Initialization', () => {
    it('should initialize wallets from environment variables', () => {
      expect(service).toBeDefined();
      const addresses = service.getWalletAddresses();

      expect(addresses.btc).toBeDefined();
      expect(addresses.eth).toBeDefined();
      expect(addresses.usdt).toBeDefined();
    });

    it('should handle missing Bitcoin wallet configuration', () => {
      const module = Test.createTestingModule({
        providers: [
          TransactionSigningService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn((key: string) => {
                if (key === 'BTC_HOT_WALLET_PRIVATE_KEY') {
                  return 'your_encrypted_btc_private_key_here';
                }
                return null;
              }),
            },
          },
        ],
      });

      // Should not throw, just log warning
      expect(async () => {
        await module.compile();
      }).not.toThrow();
    });

    it('should get correct wallet addresses', () => {
      const addresses = service.getWalletAddresses();

      // BTC testnet address should start with 'm', 'n', or 'tb1'
      expect(addresses.btc).toMatch(/^(m|n|tb1)/);

      // ETH address should start with 0x and be 42 chars
      expect(addresses.eth).toMatch(/^0x[a-fA-F0-9]{40}$/);

      // USDT address (same format as ETH for ERC20)
      expect(addresses.usdt).toMatch(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe('signBitcoinTransaction', () => {
    it('should sign a valid Bitcoin transaction', async () => {
      const toAddress = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';
      const amount = '0.001'; // 0.001 BTC
      const feeRate = 10; // 10 sat/byte

      // Mock UTXO
      const keyPair = ECPair.fromWIF(testBtcPrivateKey, bitcoin.networks.testnet);
      const { address } = bitcoin.payments.p2wpkh({
        pubkey: keyPair.publicKey,
        network: bitcoin.networks.testnet,
      });

      const payment = bitcoin.payments.p2wpkh({
        pubkey: keyPair.publicKey,
        network: bitcoin.networks.testnet,
      });

      const utxos = [
        {
          txid: '0000000000000000000000000000000000000000000000000000000000000000',
          vout: 0,
          satoshis: 200000, // 0.002 BTC
          scriptPubKey: (payment.output as Buffer).toString('hex'),
        },
      ];

      const result = await service.signBitcoinTransaction(
        toAddress,
        amount,
        utxos,
        feeRate,
      );

      expect(result).toBeDefined();
      expect(result.txHex).toBeDefined();
      expect(result.txId).toBeDefined();
      expect(result.size).toBeGreaterThan(0);
      expect(parseFloat(result.fee)).toBeGreaterThan(0);
    });

    it('should throw error when insufficient funds', async () => {
      const toAddress = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';
      const amount = '0.01'; // 0.01 BTC - more than UTXO
      const feeRate = 10;

      const keyPair = ECPair.fromWIF(testBtcPrivateKey, bitcoin.networks.testnet);

      const utxos = [
        {
          txid: '0000000000000000000000000000000000000000000000000000000000000000',
          vout: 0,
          satoshis: 100000, // Only 0.001 BTC
          scriptPubKey: (bitcoin.payments.p2wpkh({
            pubkey: keyPair.publicKey,
            network: bitcoin.networks.testnet,
          }).output as Buffer).toString('hex'),
        },
      ];

      await expect(
        service.signBitcoinTransaction(toAddress, amount, utxos, feeRate),
      ).rejects.toThrow('Insufficient funds');
    });

    it('should handle multiple UTXOs', async () => {
      const toAddress = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';
      const amount = '0.0015'; // 0.0015 BTC
      const feeRate = 10;

      const keyPair = ECPair.fromWIF(testBtcPrivateKey, bitcoin.networks.testnet);
      const scriptPubKey = (bitcoin.payments.p2wpkh({
        pubkey: keyPair.publicKey,
        network: bitcoin.networks.testnet,
      }).output as Buffer).toString('hex');

      const utxos = [
        {
          txid: '1111111111111111111111111111111111111111111111111111111111111111',
          vout: 0,
          satoshis: 100000,
          scriptPubKey,
        },
        {
          txid: '2222222222222222222222222222222222222222222222222222222222222222',
          vout: 0,
          satoshis: 100000,
          scriptPubKey,
        },
      ];

      const result = await service.signBitcoinTransaction(
        toAddress,
        amount,
        utxos,
        feeRate,
      );

      expect(result).toBeDefined();
      expect(result.txId).toBeDefined();
    });

    it('should not create change output for dust amounts', async () => {
      const toAddress = 'tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx';
      const amount = '0.00099'; // Leave only 100 satoshis as change (below 546 dust threshold)
      const feeRate = 1;

      const keyPair = ECPair.fromWIF(testBtcPrivateKey, bitcoin.networks.testnet);

      const utxos = [
        {
          txid: '0000000000000000000000000000000000000000000000000000000000000000',
          vout: 0,
          satoshis: 100000,
          scriptPubKey: (bitcoin.payments.p2wpkh({
            pubkey: keyPair.publicKey,
            network: bitcoin.networks.testnet,
          }).output as Buffer).toString('hex'),
        },
      ];

      const result = await service.signBitcoinTransaction(
        toAddress,
        amount,
        utxos,
        feeRate,
      );

      expect(result).toBeDefined();
      // Transaction size should be smaller (1 output instead of 2)
      expect(result.size).toBeLessThan(200);
    });
  });

  describe('signEthereumTransaction', () => {
    it('should sign a valid Ethereum transaction', async () => {
      const toAddress = '0x28d88C9000B85aA457E688B93a83c09fDA1D5443';
      const amount = '0.1'; // 0.1 ETH
      const nonce = 0;
      const gasLimit = '21000';
      const gasPrice = '50'; // 50 Gwei

      const result = await service.signEthereumTransaction(
        toAddress,
        amount,
        nonce,
        gasLimit,
        gasPrice,
      );

      expect(result).toBeDefined();
      expect(result.signedTx).toBeDefined();
      expect(result.signedTx).toMatch(/^0x/);
      expect(result.txHash).toBeDefined();
      expect(result.nonce).toBe(nonce);
      expect(result.gasLimit).toBe(gasLimit);
      expect(result.gasPrice).toBe(gasPrice);
    });

    it('should handle different nonce values', async () => {
      const toAddress = '0x28d88C9000B85aA457E688B93a83c09fDA1D5443';
      const amount = '0.1';
      const gasLimit = '21000';
      const gasPrice = '50';

      const result1 = await service.signEthereumTransaction(
        toAddress,
        amount,
        0,
        gasLimit,
        gasPrice,
      );

      const result2 = await service.signEthereumTransaction(
        toAddress,
        amount,
        1,
        gasLimit,
        gasPrice,
      );

      expect(result1.nonce).toBe(0);
      expect(result2.nonce).toBe(1);
      expect(result1.txHash).not.toBe(result2.txHash);
    });

    it('should handle different amounts', async () => {
      const toAddress = '0x28d88C9000B85aA457E688B93a83c09fDA1D5443';
      const nonce = 0;
      const gasLimit = '21000';
      const gasPrice = '50';

      const result1 = await service.signEthereumTransaction(
        toAddress,
        '0.1',
        nonce,
        gasLimit,
        gasPrice,
      );

      const result2 = await service.signEthereumTransaction(
        toAddress,
        '0.5',
        nonce,
        gasLimit,
        gasPrice,
      );

      expect(result1.signedTx).toBeDefined();
      expect(result2.signedTx).toBeDefined();
      expect(result1.txHash).not.toBe(result2.txHash);
    });
  });

  describe('signUSDTTransaction', () => {
    it('should sign a valid USDT ERC20 transaction', async () => {
      const toAddress = '0x28d88C9000B85aA457E688B93a83c09fDA1D5443';
      const amount = '100'; // 100 USDT
      const network = 'ERC20';
      const nonce = 0;
      const gasLimit = '65000';
      const gasPrice = '50';

      const result = await service.signUSDTTransaction(
        toAddress,
        amount,
        network,
        nonce,
        gasLimit,
        gasPrice,
      );

      expect(result).toBeDefined();
      expect(result.signedTx).toBeDefined();
      expect(result.txHash).toBeDefined();
      expect(result.nonce).toBe(nonce);
    });

    it('should throw error for TRC20 (not yet implemented)', async () => {
      const toAddress = 'TYASr5UV6HEcXatwdFQfmLVUqQQQMUxHLS';
      const amount = '100';
      const network = 'TRC20';
      const nonce = 0;
      const gasLimit = '65000';
      const gasPrice = '50';

      await expect(
        service.signUSDTTransaction(toAddress, amount, network, nonce, gasLimit, gasPrice),
      ).rejects.toThrow('TRC20 signing not yet implemented');
    });

    it('should handle different USDT amounts (6 decimals)', async () => {
      const toAddress = '0x28d88C9000B85aA457E688B93a83c09fDA1D5443';
      const network = 'ERC20';
      const nonce = 0;
      const gasLimit = '65000';
      const gasPrice = '50';

      const result1 = await service.signUSDTTransaction(
        toAddress,
        '100',
        network,
        nonce,
        gasLimit,
        gasPrice,
      );

      const result2 = await service.signUSDTTransaction(
        toAddress,
        '1000.50',
        network,
        nonce,
        gasLimit,
        gasPrice,
      );

      expect(result1.signedTx).toBeDefined();
      expect(result2.signedTx).toBeDefined();
      expect(result1.txHash).not.toBe(result2.txHash);
    });
  });

  describe('validateSignature', () => {
    it('should validate a valid Bitcoin transaction hex', () => {
      // Create a simple transaction
      const tx = new bitcoin.Transaction();
      tx.addInput(Buffer.alloc(32), 0);
      tx.addOutput(Buffer.alloc(20), BigInt(100000));

      const txHex = tx.toHex();
      const expectedTxId = tx.getId();

      const isValid = service.validateSignature(txHex, expectedTxId);
      expect(isValid).toBe(true);
    });

    it('should reject invalid transaction hex', () => {
      const invalidHex = 'invalid_hex_data';
      const isValid = service.validateSignature(invalidHex);
      expect(isValid).toBe(false);
    });

    it('should reject mismatched transaction ID', () => {
      const tx = new bitcoin.Transaction();
      tx.addInput(Buffer.alloc(32), 0);
      tx.addOutput(Buffer.alloc(20), BigInt(100000));

      const txHex = tx.toHex();
      const wrongTxId = '0000000000000000000000000000000000000000000000000000000000000000';

      const isValid = service.validateSignature(txHex, wrongTxId);
      expect(isValid).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle wallet not initialized error for BTC', async () => {
      // Create service with no wallet
      const testModule = await Test.createTestingModule({
        providers: [
          TransactionSigningService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => null),
            },
          },
        ],
      }).compile();

      const testService = testModule.get<TransactionSigningService>(TransactionSigningService);

      await expect(
        testService.signBitcoinTransaction('address', '0.1', [], 10),
      ).rejects.toThrow('Bitcoin wallet not initialized');
    });

    it('should handle wallet not initialized error for ETH', async () => {
      const testModule = await Test.createTestingModule({
        providers: [
          TransactionSigningService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => null),
            },
          },
        ],
      }).compile();

      const testService = testModule.get<TransactionSigningService>(TransactionSigningService);

      await expect(
        testService.signEthereumTransaction('0xaddress', '0.1', 0, '21000', '50'),
      ).rejects.toThrow('Ethereum wallet not initialized');
    });

    it('should handle wallet not initialized error for USDT', async () => {
      const testModule = await Test.createTestingModule({
        providers: [
          TransactionSigningService,
          {
            provide: ConfigService,
            useValue: {
              get: jest.fn(() => null),
            },
          },
        ],
      }).compile();

      const testService = testModule.get<TransactionSigningService>(TransactionSigningService);

      await expect(
        testService.signUSDTTransaction('0xaddress', '100', 'ERC20', 0, '65000', '50'),
      ).rejects.toThrow('USDT wallet not initialized');
    });
  });
});
