import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { TradingController } from './controllers';
import { TradingService, TradeEngineClient } from './services';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
      maxRedirects: 5,
    }),
    ConfigModule,
  ],
  controllers: [TradingController],
  providers: [TradingService, TradeEngineClient],
  exports: [TradingService, TradeEngineClient],
})
export class TradingModule {}
