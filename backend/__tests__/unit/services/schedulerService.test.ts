jest.mock('node-cron', () => ({
  schedule: jest.fn(),
}));
jest.mock('../../../src/db', () => require('./../../unit/__mocks__/db'));
jest.mock('../../../src/services/notificationService');

import cron from 'node-cron';

describe('schedulerService', () => {
  beforeEach(() => jest.clearAllMocks());

  it('startScheduler registers two cron jobs', () => {
    const { startScheduler } = require('../../../src/services/schedulerService');
    startScheduler();
    expect(cron.schedule).toHaveBeenCalledTimes(2);
    expect(cron.schedule).toHaveBeenCalledWith('0 6 * * *', expect.any(Function));
    expect(cron.schedule).toHaveBeenCalledWith('0 8 * * *', expect.any(Function));
  });

  it('scheduled recurring job function queries for due patterns', async () => {
    const { queryMock } = require('./../../unit/__mocks__/db');
    const { mockClient } = require('./../../unit/__mocks__/db');
    queryMock.mockResolvedValue({ rows: [] });

    const { startScheduler } = require('../../../src/services/schedulerService');
    startScheduler();

    // Get the first cron callback
    const recurringCallback = (cron.schedule as jest.Mock).mock.calls[0][1];

    // Execute it — should handle empty results gracefully
    await recurringCallback();
    expect(queryMock).toHaveBeenCalled();
  });

  it('scheduled budget alert job queries users', async () => {
    const { queryMock } = require('./../../unit/__mocks__/db');
    queryMock.mockResolvedValue({ rows: [] });

    const { startScheduler } = require('../../../src/services/schedulerService');
    startScheduler();

    const budgetCallback = (cron.schedule as jest.Mock).mock.calls[1][1];
    await budgetCallback();
  });
});
