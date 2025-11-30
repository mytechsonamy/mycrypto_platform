import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PriceAlertService } from '../services/price-alert.service';
import { PriceAlert, AlertType } from '../entities/price-alert.entity';
import { TickerService } from '../services/ticker.service';
import { MarketGateway } from '../gateways/market.gateway';

describe('PriceAlertService', () => {
  let service: PriceAlertService;
  let repository: Repository<PriceAlert>;
  let tickerService: TickerService;
  let marketGateway: MarketGateway;

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  const mockTickerService = {
    getTicker: jest.fn(),
  };

  const mockMarketGateway = {
    server: {
      emit: jest.fn(),
    },
  };

  const mockUserId = 'user-123';
  const mockAlertId = 'alert-456';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PriceAlertService,
        {
          provide: getRepositoryToken(PriceAlert),
          useValue: mockRepository,
        },
        {
          provide: TickerService,
          useValue: mockTickerService,
        },
        {
          provide: MarketGateway,
          useValue: mockMarketGateway,
        },
      ],
    }).compile();

    service = module.get<PriceAlertService>(PriceAlertService);
    repository = module.get<Repository<PriceAlert>>(getRepositoryToken(PriceAlert));
    tickerService = module.get<TickerService>(TickerService);
    marketGateway = module.get<MarketGateway>(MarketGateway);

    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto = {
      symbol: 'BTC/USD',
      alertType: AlertType.ABOVE,
      targetPrice: '50000.00',
    };

    it('should create a new price alert successfully', async () => {
      const mockAlert = {
        id: mockAlertId,
        userId: mockUserId,
        ...createDto,
        isActive: true,
        notificationsSent: 0,
      };

      mockRepository.findOne.mockResolvedValue(null); // No existing alert
      mockRepository.create.mockReturnValue(mockAlert);
      mockRepository.save.mockResolvedValue(mockAlert);

      const result = await service.create(mockUserId, createDto);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: {
          userId: mockUserId,
          symbol: createDto.symbol,
          alertType: createDto.alertType,
          targetPrice: createDto.targetPrice,
          isActive: true,
        },
      });
      expect(mockRepository.create).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result).toEqual(mockAlert);
    });

    it('should throw BadRequestException if duplicate active alert exists', async () => {
      const existingAlert = {
        id: mockAlertId,
        userId: mockUserId,
        ...createDto,
        isActive: true,
      };

      mockRepository.findOne.mockResolvedValue(existingAlert);

      await expect(service.create(mockUserId, createDto)).rejects.toThrow(BadRequestException);
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.save).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if target price is negative', async () => {
      const invalidDto = {
        ...createDto,
        targetPrice: '-100.00',
      };

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.create(mockUserId, invalidDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if target price is zero', async () => {
      const invalidDto = {
        ...createDto,
        targetPrice: '0',
      };

      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.create(mockUserId, invalidDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return all alerts for a user', async () => {
      const mockAlerts = [
        {
          id: 'alert-1',
          userId: mockUserId,
          symbol: 'BTC/USD',
          alertType: AlertType.ABOVE,
          targetPrice: '50000',
        },
        {
          id: 'alert-2',
          userId: mockUserId,
          symbol: 'ETH/USD',
          alertType: AlertType.BELOW,
          targetPrice: '3000',
        },
      ];

      mockRepository.find.mockResolvedValue(mockAlerts);

      const result = await service.findAll(mockUserId);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUserId },
        order: { createdAt: 'DESC' },
      });
      expect(result).toEqual(mockAlerts);
    });

    it('should return empty array if user has no alerts', async () => {
      mockRepository.find.mockResolvedValue([]);

      const result = await service.findAll(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return a specific alert', async () => {
      const mockAlert = {
        id: mockAlertId,
        userId: mockUserId,
        symbol: 'BTC/USD',
        alertType: AlertType.ABOVE,
        targetPrice: '50000',
      };

      mockRepository.findOne.mockResolvedValue(mockAlert);

      const result = await service.findOne(mockAlertId, mockUserId);

      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: mockAlertId, userId: mockUserId },
      });
      expect(result).toEqual(mockAlert);
    });

    it('should throw NotFoundException if alert not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.findOne(mockAlertId, mockUserId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const mockAlert = {
      id: mockAlertId,
      userId: mockUserId,
      symbol: 'BTC/USD',
      alertType: AlertType.ABOVE,
      targetPrice: '50000',
      isActive: true,
      triggeredAt: null,
      notificationsSent: 0,
    };

    it('should update an alert successfully', async () => {
      const updateDto = {
        targetPrice: '55000',
      };

      mockRepository.findOne.mockResolvedValue(mockAlert);
      mockRepository.save.mockResolvedValue({ ...mockAlert, ...updateDto });

      const result = await service.update(mockAlertId, mockUserId, updateDto);

      expect(mockRepository.findOne).toHaveBeenCalled();
      expect(mockRepository.save).toHaveBeenCalled();
      expect(result.targetPrice).toBe(updateDto.targetPrice);
    });

    it('should reset trigger data when reactivating an alert', async () => {
      const triggeredAlert = {
        ...mockAlert,
        isActive: false,
        triggeredAt: new Date(),
        notificationsSent: 3,
      };

      const updateDto = {
        isActive: true,
      };

      mockRepository.findOne.mockResolvedValue(triggeredAlert);
      mockRepository.save.mockResolvedValue({ ...triggeredAlert, ...updateDto, triggeredAt: null, notificationsSent: 0 });

      const result = await service.update(mockAlertId, mockUserId, updateDto);

      expect(result.triggeredAt).toBeNull();
      expect(result.notificationsSent).toBe(0);
    });

    it('should throw BadRequestException if target price is invalid', async () => {
      const updateDto = {
        targetPrice: '-100',
      };

      mockRepository.findOne.mockResolvedValue(mockAlert);

      await expect(service.update(mockAlertId, mockUserId, updateDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if alert not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.update(mockAlertId, mockUserId, { isActive: false })).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should delete an alert successfully', async () => {
      const mockAlert = {
        id: mockAlertId,
        userId: mockUserId,
        symbol: 'BTC/USD',
      };

      mockRepository.findOne.mockResolvedValue(mockAlert);
      mockRepository.remove.mockResolvedValue(mockAlert);

      await service.remove(mockAlertId, mockUserId);

      expect(mockRepository.findOne).toHaveBeenCalled();
      expect(mockRepository.remove).toHaveBeenCalledWith(mockAlert);
    });

    it('should throw NotFoundException if alert not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.remove(mockAlertId, mockUserId)).rejects.toThrow(NotFoundException);
      expect(mockRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('checkActiveAlerts', () => {
    it('should check active alerts and trigger if conditions met', async () => {
      const activeAlerts = [
        {
          id: 'alert-1',
          userId: 'user-1',
          symbol: 'BTC/USD',
          alertType: AlertType.ABOVE,
          targetPrice: '50000',
          isActive: true,
        },
      ];

      const mockTicker = {
        lastPrice: '51000',
        priceChange: '1000',
        priceChangePercent: '2.0',
        timestamp: new Date().toISOString(),
      };

      mockRepository.find.mockResolvedValue(activeAlerts);
      mockTickerService.getTicker.mockResolvedValue(mockTicker);
      mockRepository.save.mockResolvedValue({});

      await service.checkActiveAlerts();

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { isActive: true },
      });
      expect(mockTickerService.getTicker).toHaveBeenCalledWith('BTC/USD');
      expect(mockMarketGateway.server.emit).toHaveBeenCalled();
    });

    it('should not trigger alert if conditions not met', async () => {
      const activeAlerts = [
        {
          id: 'alert-1',
          userId: 'user-1',
          symbol: 'BTC/USD',
          alertType: AlertType.ABOVE,
          targetPrice: '55000',
          isActive: true,
        },
      ];

      const mockTicker = {
        lastPrice: '51000',
        priceChange: '1000',
        priceChangePercent: '2.0',
        timestamp: new Date().toISOString(),
      };

      mockRepository.find.mockResolvedValue(activeAlerts);
      mockTickerService.getTicker.mockResolvedValue(mockTicker);
      mockRepository.save.mockResolvedValue({});

      await service.checkActiveAlerts();

      expect(mockMarketGateway.server.emit).not.toHaveBeenCalled();
    });

    it('should handle empty active alerts', async () => {
      mockRepository.find.mockResolvedValue([]);

      await service.checkActiveAlerts();

      expect(mockTickerService.getTicker).not.toHaveBeenCalled();
      expect(mockMarketGateway.server.emit).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully', async () => {
      mockRepository.find.mockRejectedValue(new Error('Database error'));

      // Should not throw, just log error
      await expect(service.checkActiveAlerts()).resolves.not.toThrow();
    });
  });

  describe('getAlertStatistics', () => {
    it('should return correct statistics', async () => {
      mockRepository.count
        .mockResolvedValueOnce(10) // total
        .mockResolvedValueOnce(5) // active
        .mockResolvedValueOnce(3); // triggered

      const result = await service.getAlertStatistics(mockUserId);

      expect(result).toEqual({
        total: 10,
        active: 5,
        triggered: 3,
      });
    });

    it('should return zero statistics for user with no alerts', async () => {
      mockRepository.count
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0);

      const result = await service.getAlertStatistics(mockUserId);

      expect(result).toEqual({
        total: 0,
        active: 0,
        triggered: 0,
      });
    });
  });
});
