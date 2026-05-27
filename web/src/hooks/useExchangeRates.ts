import { useState, useEffect, useCallback } from "react";
import { exchangeRatesApi, type ExchangeRate } from "../lib/api-client";

const UAH = 980;
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let cache: { data: ExchangeRate[]; fetchedAt: number } | null = null;

export function useExchangeRates() {
  const [rates, setRates] = useState<ExchangeRate[]>(cache?.data ?? []);

  useEffect(() => {
    const now = Date.now();
    if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
      if (rates !== cache.data) setRates(cache.data);
      return;
    }
    exchangeRatesApi.getAll().then((data) => {
      cache = { data, fetchedAt: Date.now() };
      setRates(data);
    });
  }, []);

  const rateToUAH = useCallback(
    (code: number): number | null => {
      if (code === UAH) return 1;
      const pair = rates.find(
        (r) => r.currencyCodeA === code && r.currencyCodeB === UAH,
      );
      if (pair) return (pair.rateBuy + pair.rateSell) / 2;
      const cross = rates.find((r) => r.currencyCodeA === code);
      return cross?.rateCross ?? null;
    },
    [rates],
  );

  return { rates, rateToUAH };
}
