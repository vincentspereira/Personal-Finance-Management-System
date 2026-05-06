jest.mock('../../../src/services/currencyService');

import * as ctrl from '../../../src/controllers/currencyController';
import * as service from '../../../src/services/currencyService';

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

describe('currencyController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getExchangeRates returns rates', async () => {
    const res = mockRes();
    (service.getRates as jest.Mock).mockResolvedValue({ base: 'USD', rates: { EUR: 0.85 }, fetchedAt: '2026-01-01' });
    await ctrl.getExchangeRates({ query: { base: 'USD' }, user: { id: 'u1' } } as any, res, mockNext);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('convertAmount returns conversion result', async () => {
    const res = mockRes();
    (service.convertCurrency as jest.Mock).mockResolvedValue({ original: 100, converted: 85, rate: 0.85, from: 'USD', to: 'EUR' });
    await ctrl.convertAmount({ body: { amount: '100', from: 'USD', to: 'EUR' }, user: { id: 'u1' } } as any, res, mockNext);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('convertAmount returns 400 if missing fields', async () => {
    const res = mockRes();
    await ctrl.convertAmount({ body: { amount: '100' }, user: { id: 'u1' } } as any, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('listCurrencies returns supported currencies', async () => {
    const res = mockRes();
    await ctrl.listCurrencies({ user: { id: 'u1' } } as any, res, mockNext);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
