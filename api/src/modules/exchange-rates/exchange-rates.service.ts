import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';

const UAH = 980;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface MonobankRate {
  currencyCodeA: number;
  currencyCodeB: number;
  date: number;
  rateBuy: number;
  rateSell: number;
  rateCross?: number;
}

@Injectable()
export class ExchangeRatesService {
  private readonly logger = new Logger(ExchangeRatesService.name);
  private cache: { data: MonobankRate[]; fetchedAt: number } | null = null;

  async getRates(): Promise<MonobankRate[]> {
    if (this.cache && Date.now() - this.cache.fetchedAt < CACHE_TTL_MS) {
      return this.cache.data;
    }

    try {
      const res = await axios.get<MonobankRate[]>('https://api.monobank.ua/bank/currency');
      this.cache = { data: res.data, fetchedAt: Date.now() };
      this.logger.log('Exchange rates refreshed');
      return res.data;
    } catch (err) {
      this.logger.warn('Failed to fetch exchange rates, using stale cache or fallback');
      return this.cache?.data ?? [];
    }
  }

  async buildRateToUAH(): Promise<(code: number) => number> {
    const rates = await this.getRates();
    return (code: number) => {
      if (code === UAH) return 1;
      const pair = rates.find((r) => r.currencyCodeA === code && r.currencyCodeB === UAH);
      if (pair) return (pair.rateBuy + pair.rateSell) / 2;
      const cross = rates.find((r) => r.currencyCodeA === code);
      return cross?.rateCross ?? 1;
    };
  }
}
