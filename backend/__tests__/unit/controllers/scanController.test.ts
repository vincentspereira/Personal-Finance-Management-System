jest.mock('../../../src/services/scanService');

import * as ctrl from '../../../src/controllers/scanController';
import * as scanService from '../../../src/services/scanService';

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

describe('scanController', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('uploadScan', () => {
    it('returns 202 with scan data when files uploaded', async () => {
      const req: any = {
        files: [{ originalname: 'receipt.jpg', path: '/tmp/receipt.jpg' }],
        user: { id: 'test-user-id', email: 'test@test.com' },
      };
      const res = mockRes();
      (scanService.createScanRecord as jest.Mock).mockResolvedValue({ id: 'scan-1', status: 'pending' });
      (scanService.processScan as jest.Mock).mockResolvedValue(undefined);

      await ctrl.uploadScan(req, res, mockNext);
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true })
      );
      expect(res.json.mock.calls[0][0].meta.count).toBe(1);
    });

    it('returns 400 when no files uploaded', async () => {
      const req: any = { files: [], user: { id: 'test-user-id', email: 'test@test.com' } };
      const res = mockRes();

      await ctrl.uploadScan(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });

    it('handles undefined files', async () => {
      const req: any = { files: undefined, user: { id: 'test-user-id', email: 'test@test.com' } };
      const res = mockRes();

      await ctrl.uploadScan(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });
  });

  describe('getScanStatus', () => {
    it('returns scan status', async () => {
      const req: any = { params: { id: 'scan-1' }, user: { id: 'test-user-id', email: 'test@test.com' } };
      const res = mockRes();
      (scanService.getScan as jest.Mock).mockResolvedValue({ id: 'scan-1', status: 'completed', document_count: 1, error_message: null });

      await ctrl.getScanStatus(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: expect.objectContaining({ status: 'completed' }) })
      );
    });

    it('returns 404 for non-existent scan', async () => {
      const req: any = { params: { id: 'missing' }, user: { id: 'test-user-id', email: 'test@test.com' } };
      const res = mockRes();
      (scanService.getScan as jest.Mock).mockResolvedValue(null);

      await ctrl.getScanStatus(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });
  });

  describe('getScanResults', () => {
    it('returns scan and documents', async () => {
      const req: any = { params: { id: 'scan-1' }, user: { id: 'test-user-id', email: 'test@test.com' } };
      const res = mockRes();
      (scanService.getScan as jest.Mock).mockResolvedValue({ id: 'scan-1' });
      (scanService.getScanDocuments as jest.Mock).mockResolvedValue([{ id: 'doc-1' }]);

      await ctrl.getScanResults(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          data: { scan: { id: 'scan-1' }, documents: [{ id: 'doc-1' }] },
        })
      );
    });
  });

  describe('confirmScan', () => {
    it('confirms documents and creates transactions', async () => {
      const req: any = {
        params: { id: 'scan-1' },
        body: { documents: [{ documentIndex: 0, categoryId: 'c1', accountId: 'a1', amount: 50 }] },
        user: { id: 'test-user-id', email: 'test@test.com' },
      };
      const res = mockRes();
      (scanService.confirmDocuments as jest.Mock).mockResolvedValue(true);

      await ctrl.confirmScan(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { confirmed: 1 } })
      );
    });

    it('returns 400 when documents not provided', async () => {
      const req: any = { params: { id: 'scan-1' }, body: {}, user: { id: 'test-user-id', email: 'test@test.com' } };
      const res = mockRes();

      await ctrl.confirmScan(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    });
  });

  describe('retryScan', () => {
    it('retries a failed scan', async () => {
      const req: any = { params: { id: 'scan-1' }, user: { id: 'test-user-id', email: 'test@test.com' } };
      const res = mockRes();
      (scanService.retryScan as jest.Mock).mockResolvedValue({ id: 'scan-1', status: 'failed' });

      await ctrl.retryScan(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ success: true, data: { id: 'scan-1', status: 'pending' } })
      );
    });

    it('returns 404 for non-failed scan', async () => {
      const req: any = { params: { id: 'scan-1' }, user: { id: 'test-user-id', email: 'test@test.com' } };
      const res = mockRes();
      (scanService.retryScan as jest.Mock).mockResolvedValue(null);

      await ctrl.retryScan(req, res, mockNext);
      expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
    });
  });

  describe('listScans', () => {
    it('returns paginated scan list', async () => {
      const req: any = { query: { page: '1', limit: '10' }, user: { id: 'test-user-id', email: 'test@test.com' } };
      const res = mockRes();
      (scanService.listScans as jest.Mock).mockResolvedValue({
        rows: [{ id: 'scan-1' }], total: 1, page: 1, limit: 10, totalPages: 1,
      });

      await ctrl.listScans(req, res, mockNext);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
    });

    it('uses default pagination', async () => {
      const req: any = { query: {}, user: { id: 'test-user-id', email: 'test@test.com' } };
      const res = mockRes();
      (scanService.listScans as jest.Mock).mockResolvedValue({
        rows: [], total: 0, page: 1, limit: 20, totalPages: 0,
      });

      await ctrl.listScans(req, res, mockNext);
      expect(scanService.listScans).toHaveBeenCalledWith('test-user-id', 1, 20);
    });
  });
});
