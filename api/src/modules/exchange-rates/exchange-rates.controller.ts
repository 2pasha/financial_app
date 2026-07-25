import { Controller, Get } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ExchangeRatesService } from './exchange-rates.service';

@Controller('exchange-rates')
export class ExchangeRatesController {
  constructor(private readonly service: ExchangeRatesService) {}

  // Public and low-risk, but shouldn't be scrapeable without any limit.
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  @Get()
  async getAll() {
    return this.service.getRates();
  }
}
