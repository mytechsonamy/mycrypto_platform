import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

@Injectable()
export class WhitelistService implements OnModuleInit {
  constructor(
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

  async onModuleInit() {
    // Initialize whitelist from environment variable
    const whitelistIps = this.configService.get<string>('RATE_LIMIT_WHITELIST_IPS', '');

    if (whitelistIps) {
      const ips = whitelistIps.split(',').map(ip => ip.trim()).filter(ip => ip);

      for (const ip of ips) {
        await this.redisService.addToWhitelist(ip);
        console.log(`Added ${ip} to rate limit whitelist`);
      }
    }
  }
}