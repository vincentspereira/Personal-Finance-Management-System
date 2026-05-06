jest.mock('../../../src/services/notificationService');

import * as ctrl from '../../../src/controllers/notificationController';
import * as service from '../../../src/services/notificationService';

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

describe('notificationController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('listNotifications returns paginated data', async () => {
    const res = mockRes();
    (service.listNotifications as jest.Mock).mockResolvedValue({ rows: [], total: 0, unread: 0, page: 1, limit: 20 });
    await ctrl.listNotifications({ query: {}, user: { id: 'u1' } } as any, res, mockNext);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('markRead marks a notification', async () => {
    const res = mockRes();
    (service.markRead as jest.Mock).mockResolvedValue(undefined);
    await ctrl.markRead({ params: { id: 'n1' }, user: { id: 'u1' } } as any, res, mockNext);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('markAllRead marks all', async () => {
    const res = mockRes();
    (service.markAllRead as jest.Mock).mockResolvedValue(undefined);
    await ctrl.markAllRead({ user: { id: 'u1' } } as any, res, mockNext);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });

  it('deleteNotification deletes', async () => {
    const res = mockRes();
    (service.deleteNotification as jest.Mock).mockResolvedValue(undefined);
    await ctrl.deleteNotification({ params: { id: 'n1' }, user: { id: 'u1' } } as any, res, mockNext);
    expect(res.json).toHaveBeenCalledWith({ success: true });
  });
});
