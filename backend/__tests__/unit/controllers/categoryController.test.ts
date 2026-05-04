jest.mock('../../../src/services/categoryService');

import * as ctrl from '../../../src/controllers/categoryController';
import * as service from '../../../src/services/categoryService';

const mockRes = () => {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};
const mockNext = jest.fn();

describe('categoryController', () => {
  beforeEach(() => jest.clearAllMocks());

  it('listCategories returns tree', async () => {
    const res = mockRes();
    (service.listCategories as jest.Mock).mockResolvedValue([{ id: 'c1', children: [] }]);

    await ctrl.listCategories({ user: { id: "test-user-id", email: "test@test.com" } } as any, res, mockNext);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('createCategory returns 201', async () => {
    const req: any = { body: { name: 'Test', type: 'expense' } , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.createCategory as jest.Mock).mockResolvedValue({ id: 'new' });

    await ctrl.createCategory(req, res, mockNext);
    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('updateCategory returns updated category', async () => {
    const req: any = { params: { id: 'c1' }, body: { name: 'Updated' } , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.updateCategory as jest.Mock).mockResolvedValue({ id: 'c1', name: 'Updated' });

    await ctrl.updateCategory(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('updateCategory returns 404 if not found', async () => {
    const req: any = { params: { id: 'x' }, body: { name: 'Y' } , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.updateCategory as jest.Mock).mockResolvedValue(null);

    await ctrl.updateCategory(req, res, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });

  it('deleteCategory deletes successfully', async () => {
    const req: any = { params: { id: 'c1' }, query: {} , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.deleteCategory as jest.Mock).mockResolvedValue({ id: 'c1' });

    await ctrl.deleteCategory(req, res, mockNext);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
  });

  it('deleteCategory passes reassignTo query param', async () => {
    const req: any = { params: { id: 'c1' }, query: { reassignTo: 'c2' } , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.deleteCategory as jest.Mock).mockResolvedValue({ id: 'c1' });

    await ctrl.deleteCategory(req, res, mockNext);
    expect(service.deleteCategory).toHaveBeenCalledWith('c1', 'test-user-id', 'c2');
  });

  it('deleteCategory returns 404 if not found', async () => {
    const req: any = { params: { id: 'x' }, query: {} , user: { id: 'test-user-id', email: 'test@test.com' } };
    const res = mockRes();
    (service.deleteCategory as jest.Mock).mockResolvedValue(null);

    await ctrl.deleteCategory(req, res, mockNext);
    expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });
});
