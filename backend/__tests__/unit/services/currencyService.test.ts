jest.mock('../../../src/db', () => require('./../../unit/__mocks__/db'));

import * as currencyService from '../../../src/services/currencyService';
import { queryMock } from './../../unit/__mocks__/db';

const userId = 'test-user-id';

// Mock fetch for exchange rate API
const mockFetch = jest.fn();
global.fetch = mockFetch;

const mockRatesResponse = {
  base: 'USD',
  rates: {
    USD: 1, EUR: 0.85, GBP: 0.73, INR: 83.12, CAD: 1.36, AUD: 1.54, JPY: 149.5, CHF: 0.88, CNY: 7.24, BRL: 4.97, MXN: 17.15, SGD: 1.34,
  },
};

describe('currencyService', () => {
  beforeEach(() => {
    queryMock.mockReset();
    mockFetch.mockReset();
  });

  describe('getRates', () => {
    it('returns exchange rates for supported currencies', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockRatesResponse) });
      const result = await currencyService.getRates('USD');
      expect(result.base).toBe('USD');
      expect(result.rates.EUR).toBe(0.85);
      expect(result.rates.INR).toBe(83.12);
      expect(result.fetchedAt).toBeTruthy();
    });

    it('caches rates on subsequent calls', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ base: 'CAD', rates: { USD: 0.73 } }) });
      await currencyService.getRates('CAD');
      await currencyService.getRates('CAD');
      // Second call should use cache — fetch only called once
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('throws on API error', async () => {
      mockFetch.mockResolvedValue({ ok: false, status: 500 });
      // Clear cache for 'EUR' base to force a fresh fetch
      await expect(currencyService.getRates('EUR')).rejects.toThrow();
    });
  });

  describe('convertCurrency', () => {
    it('returns same amount for same currency', async () => {
      const result = await currencyService.convertCurrency(100, 'USD', 'USD');
      expect(result.converted).toBe(100);
      expect(result.rate).toBe(1);
    });

    it('converts between currencies', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockRatesResponse) });
      const result = await currencyService.convertCurrency(100, 'USD', 'EUR');
      expect(result.original).toBe(100);
      expect(result.converted).toBe(85);
      expect(result.rate).toBe(0.85);
      expect(result.from).toBe('USD');
      expect(result.to).toBe('EUR');
    });
  });

  describe('getUserBaseCurrency', () => {
    it('returns currency from first active account', async () => {
      queryMock.mockResolvedValue({ rows: [{ currency: 'EUR' }] });
      const result = await currencyService.getUserBaseCurrency(userId);
      expect(result).toBe('EUR');
    });

    it('returns USD when no accounts', async () => {
      queryMock.mockResolvedValue({ rows: [] });
      const result = await currencyService.getUserBaseCurrency(userId);
      expect(result).toBe('USD');
    });
  });

  describe('convertToBaseCurrency', () => {
    it('returns amount as-is for USD', async () => {
      const result = await currencyService.convertToBaseCurrency(userId, 100, 'USD');
      expect(result).toBe(100);
    });

    it('converts non-USD to base currency', async () => {
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve(mockRatesResponse) });
      queryMock.mockResolvedValue({ rows: [{ currency: 'USD' }] });
      const result = await currencyService.convertToBaseCurrency(userId, 100, 'EUR');
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('SUPPORTED_CURRENCIES', () => {
    it('includes major currencies', () => {
      expect(currencyService.SUPPORTED_CURRENCIES).toContain('USD');
      expect(currencyService.SUPPORTED_CURRENCIES).toContain('EUR');
      expect(currencyService.SUPPORTED_CURRENCIES).toContain('GBP');
    });
  });
});
