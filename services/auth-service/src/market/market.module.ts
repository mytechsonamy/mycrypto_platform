import { Module } from '@nestjs/common';
import { MarketController } from './controllers/market.controller';
import { MarketService } from './services/market.service';
import { UserOrderHighlightService } from './services/user-order-highlight.service';
import { MarketGateway } from './gateways/market.gateway';
import { TradingModule } from '../trading/trading.module';
import { RedisService } from '../common/services/redis.service';

@Module({
  imports: [TradingModule],
  controllers: [MarketController],
  providers: [MarketService, UserOrderHighlightService, MarketGateway, RedisService],
  exports: [MarketService, UserOrderHighlightService, MarketGateway],
})
export class MarketModule {}
