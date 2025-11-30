import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { MarketController } from './controllers/market.controller';
import { PriceAlertController } from './controllers/price-alert.controller';
import { MarketService } from './services/market.service';
import { TickerService } from './services/ticker.service';
import { StatisticsService } from './services/statistics.service';
import { UserOrderHighlightService } from './services/user-order-highlight.service';
import { PriceAlertService } from './services/price-alert.service';
import { TechnicalIndicatorsService } from './services/technical-indicators.service';
import { MarketGateway } from './gateways/market.gateway';
import { TradingModule } from '../trading/trading.module';
import { RedisService } from '../common/services/redis.service';
import { PriceAlert } from './entities/price-alert.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PriceAlert]),
    ScheduleModule.forRoot(),
    TradingModule,
  ],
  controllers: [MarketController, PriceAlertController],
  providers: [
    MarketService,
    TickerService,
    StatisticsService,
    UserOrderHighlightService,
    PriceAlertService,
    TechnicalIndicatorsService,
    MarketGateway,
    RedisService,
  ],
  exports: [
    MarketService,
    TickerService,
    StatisticsService,
    UserOrderHighlightService,
    PriceAlertService,
    TechnicalIndicatorsService,
    MarketGateway,
  ],
})
export class MarketModule {}
