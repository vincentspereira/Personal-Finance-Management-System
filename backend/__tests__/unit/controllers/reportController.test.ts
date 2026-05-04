jest.mock('../../../src/services/reportService');

import * as ctrl from '../../../src/controllers/reportController';
import * as service from '../../../src/services/reportService';

const mockRes = () => {
  const res: any = {};
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

describe('reportController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('getMonthlyReport uses query params', async () => {
    const req: any = { query: { year: '2026', month: '3' } , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.getMonthlyReport as jest.Mock).mockResolvedValue({ period: { year: 2026, month: 3 } });

    await ctrl.getMonthlyReport(req, res, mockNext);
    expect(service.getMonthlyReport).toHaveBeenCalledWith('test-user-id', 2026, 3);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('getMonthlyReport defaults to current year/month', async () => {
    const req: any = { query: {} , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.getMonthlyReport as jest.Mock).mockResolvedValue({});

    await ctrl.getMonthlyReport(req, res, mockNext);
    const call = (service.getMonthlyReport as jest.Mock).mock.calls[0];
    expect(call[0]).toBe('test-user-id');
    expect(call[1]).toBe(new Date().getFullYear());
  });

  it('getAnnualReport returns annual data', async () => {
    const req: any = { query: { year: '2026' } , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.getAnnualReport as jest.Mock).mockResolvedValue({ period: { year: 2026 } });

    await ctrl.getAnnualReport(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('getCustomReport requires startDate and endDate', async () => {
    const req: any = { body: {} , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();

    await ctrl.getCustomReport(req, res, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('getCustomReport returns custom report', async () => {
    const req: any = { body: { startDate: '2026-01-01', endDate: '2026-03-31' } , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.getCustomReport as jest.Mock).mockResolvedValue({ period: { start: '2026-01-01' } });

    await ctrl.getCustomReport(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('getNetWorth returns net worth data', async () => {
    const req: any = { user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.getNetWorth as jest.Mock).mockResolvedValue({ total_net_worth: 5000 });

    await ctrl.getNetWorth(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
