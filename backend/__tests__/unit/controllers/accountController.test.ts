jest.mock('../../../src/services/accountService');

import * as ctrl from '../../../src/controllers/accountController';
import * as service from '../../../src/services/accountService';

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

describe('accountController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('listAccounts returns all accounts', async () => {
    const res = mockRes();
    (service.listAccounts as jest.Mock).mockResolvedValue([{ id: '1' }]);

    await ctrl.listAccounts({ user: { id: 'test-user-id', email: 'test@test.com' } } as any, res, mockNext);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: [{ id: '1' }] }));
  });

  it('createAccount returns 201', async () => {
    const req: any = { body: { name: 'Checking', type: 'checking' }, user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.createAccount as jest.Mock).mockResolvedValue({ id: 'new' });

    await ctrl.createAccount(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('updateAccount returns updated account', async () => {
    const req: any = { params: { id: 'acc-1' }, body: { name: 'Renamed' }, user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.updateAccount as jest.Mock).mockResolvedValue({ id: 'acc-1', name: 'Renamed' });

    await ctrl.updateAccount(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('updateAccount returns 404 if not found', async () => {
    const req: any = { params: { id: 'missing' }, body: { name: 'X' }, user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.updateAccount as jest.Mock).mockResolvedValue(null);

    await ctrl.updateAccount(req, res, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('archiveAccount archives successfully', async () => {
    const req: any = { params: { id: 'acc-1' }, user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.archiveAccount as jest.Mock).mockResolvedValue({ id: 'acc-1', is_archived: true });

    await ctrl.archiveAccount(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('archiveAccount returns 404 if not found', async () => {
    const req: any = { params: { id: 'missing' } , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.archiveAccount as jest.Mock).mockResolvedValue(null);

    await ctrl.archiveAccount(req, res, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('getAccountBalance returns balance history', async () => {
    const req: any = { params: { id: 'acc-1' }, query: { startDate: '2026-01-01', endDate: '2026-01-31' }, user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.getAccountBalanceHistory as jest.Mock).mockResolvedValue([{ date: '2026-01-01', balance: 1000 }]);

    await ctrl.getAccountBalance(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });
});
