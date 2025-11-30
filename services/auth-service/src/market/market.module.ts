import { Module } from '@nestjs/common';
import { MarketController } from './controllers/market.controller';
import { MarketService } from './services/market.service';
import { TickerService } from './services/ticker.service';
import { StatisticsService } from './services/statistics.service';
import { UserOrderHighlightService } from './services/user-order-highlight.service';
import { MarketGateway } from './gateways/market.gateway';
import { TradingModule } from '../trading/trading.module';
import { RedisService } from '../common/services/redis.service';

@Module({
  imports: [TradingModule],
  controllers: [MarketController],
  providers: [
    MarketService,
    TickerService,
    StatisticsService,
    UserOrderHighlightService,
    MarketGateway,
    RedisService,
  ],
  exports: [
    MarketService,
    TickerService,
    StatisticsService,
    UserOrderHighlightService,
    MarketGateway,
  ],
})
export class MarketModule {}
