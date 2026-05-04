jest.mock('../../../src/services/analyticsService');

import * as ctrl from '../../../src/controllers/analyticsController';
import * as service from '../../../src/services/analyticsService';

const mockRes = () => {
  const res: any = {};
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

describe('analyticsController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getSummary returns analytics summary', async () => {
    const req: any = { query: { startDate: '2026-01-01', endDate: '2026-01-31' } , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.getSummary as jest.Mock).mockResolvedValue({ total_income: '5000' });

    await ctrl.getSummary(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('getSummary uses default dates when not provided', async () => {
    const req: any = { query: {} , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.getSummary as jest.Mock).mockResolvedValue({});

    await ctrl.getSummary(req, res, mockNext);
    expect(service.getSummary).toHaveBeenCalledWith('test-user-id', expect.any(String), expect.any(String));
  });

  it('getByCategory passes type filter', async () => {
    const req: any = { query: { startDate: '2026-01-01', endDate: '2026-01-31', type: 'expense' } , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.getByCategory as jest.Mock).mockResolvedValue([]);

    await ctrl.getByCategory(req, res, mockNext);
    expect(service.getByCategory).toHaveBeenCalledWith('test-user-id', expect.any(String), expect.any(String), 'expense');
  });

  it('getTrends passes months param', async () => {
    const req: any = { query: { months: '6' } , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.getTrends as jest.Mock).mockResolvedValue([]);

    await ctrl.getTrends(req, res, mockNext);
    expect(service.getTrends).toHaveBeenCalledWith('test-user-id', 6);
  });

  it('getTrends defaults to 12 months', async () => {
    const req: any = { query: {} , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.getTrends as jest.Mock).mockResolvedValue([]);

    await ctrl.getTrends(req, res, mockNext);
    expect(service.getTrends).toHaveBeenCalledWith('test-user-id', 12);
  });

  it('getTopMerchants returns data', async () => {
    const req: any = { query: { startDate: '2026-01-01', endDate: '2026-01-31' } , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.getTopMerchants as jest.Mock).mockResolvedValue([{ merchant_name: 'Amazon' }]);

    await ctrl.getTopMerchants(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('getCashflow returns daily data', async () => {
    const req: any = { query: {} , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.getCashflow as jest.Mock).mockResolvedValue([]);

    await ctrl.getCashflow(req, res, mockNext);
    expect(res.json).toHaveBeenCalled();
  });

  it('getBudgetVsActual returns comparison data', async () => {
    const req: any = { query: {} , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.getBudgetVsActual as jest.Mock).mockResolvedValue([]);

    await ctrl.getBudgetVsActual(req, res, mockNext);
    expect(res.json).toHaveBeenCalled();
  });

  it('getRecurring returns recurring transactions', async () => {
    const req: any = { user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.getRecurring as jest.Mock).mockResolvedValue([]);

    await ctrl.getRecurring(req, res, mockNext);
    expect(res.json).toHaveBeenCalled();
  });

  it('handles service errors gracefully', async () => {
    const req: any = { query: {} , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.getSummary as jest.Mock).mockRejectedValue(new Error('DB error'));

    await ctrl.getSummary(req, res, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });
});
