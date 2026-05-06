jest.mock('../../../src/services/exportService');

import * as ctrl from '../../../src/controllers/exportController';
import * as service from '../../../src/services/exportService';

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  res.setHeader = jest.fn();
  res.send = jest.fn();
  return res;
};
const mockNext = jest.fn();

describe('exportController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('exportTransactionsCSV sends CSV file', async () => {
    const res = mockRes();
    (service.exportTransactionsCSV as jest.Mock).mockResolvedValue('Date,Type\n2026-01-01,expense');
    await ctrl.exportTransactionsCSV({ query: {}, user: { id: 'u1' } } as any, res, mockNext);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.setHeader).toHaveBeenCalledWith('Content-Disposition', expect.stringContaining('.csv"'));
    expect(res.send).toHaveBeenCalledWith(expect.stringContaining('Date'));
  });

  it('exportReportCSV sends report CSV', async () => {
    const res = mockRes();
    (service.exportReportCSV as jest.Mock).mockResolvedValue('SUMMARY\nPeriod,2026-01');
    await ctrl.exportReportCSV({ query: { type: 'monthly', year: '2026', month: '1' }, user: { id: 'u1' } } as any, res, mockNext);
    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
    expect(res.send).toHaveBeenCalled();
  });

  it('exportTransactionsCSV handles errors', async () => {
    const res = mockRes();
    (service.exportTransactionsCSV as jest.Mock).mockRejectedValue(new Error('DB error'));
    await ctrl.exportTransactionsCSV({ query: {}, user: { id: 'u1' } } as any, res, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
  });
});
