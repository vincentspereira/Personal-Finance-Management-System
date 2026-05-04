jest.mock('../../../src/db', () => require('./../../unit/__mocks__/db'));
jest.mock('../../../src/middleware/errorHandler', () => ({
  createError: (statusCode: number, message: string) => {
    const err: any = new Error(message);
    err.statusCode = statusCode;
    return err;
  },
}));

import { paginate, parsePagination, validateAccountExists, validateCategoryExists } from '../../../src/utils/validators';
import { queryMock } from './../../unit/__mocks__/db';

describe('parsePagination', () => {
  it('parses page and limit from query', () => {
    const result = parsePagination({ page: '2', limit: '25' });
    expect(result).toEqual({ page: 2, limit: 25 });
  });

  it('returns undefined for missing values', () => {
    const result = parsePagination({});
    expect(result).toEqual({ page: undefined, limit: undefined });
  });

  it('handles partial params', () => {
    expect(parsePagination({ page: '3' })).toEqual({ page: 3, limit: undefined });
    expect(parsePagination({ limit: '10' })).toEqual({ page: undefined, limit: 10 });
  });
});

describe('paginate', () => {
  beforeEach(() => {
    queryMock.mockReset();
  });

  it('paginates results correctly', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ count: '100' }] })
      .mockResolvedValueOnce({ rows: [{ id: '1' }, { id: '2' }] });

    const result = await paginate('SELECT *', 'SELECT COUNT(*)', [], { page: 1, limit: 50 });

    expect(result).toEqual({
      rows: [{ id: '1' }, { id: '2' }],
      total: 100,
      page: 1,
      limit: 50,
      totalPages: 2,
    });
  });

  it('defaults to page 1 and limit 50', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ count: '10' }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await paginate('SELECT *', 'SELECT COUNT(*)');

    expect(result.page).toBe(1);
    expect(result.limit).toBe(50);
    expect(result.totalPages).toBe(1);
  });

  it('clamps limit to max 100', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await paginate('SEL', 'SEL', [], { limit: 500 });
    expect(result.limit).toBe(100);
  });

  it('clamps page to min 1', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ count: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    const result = await paginate('SEL', 'SEL', [], { page: -5 });
    expect(result.page).toBe(1);
  });

  it('passes params to both queries', async () => {
    queryMock
      .mockResolvedValueOnce({ rows: [{ count: '1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 'a' }] });

    await paginate('SELECT * WHERE x=$1', 'SELECT COUNT(*) WHERE x=$1', ['val']);

    expect(queryMock).toHaveBeenNthCalledWith(1, 'SELECT COUNT(*) WHERE x=$1', ['val']);
    expect(queryMock).toHaveBeenNthCalledWith(
      2,
      'SELECT * WHERE x=$1 LIMIT $2 OFFSET $3',
      ['val', 50, 0]
    );
  });
});

describe('validateAccountExists', () => {
  beforeEach(() => queryMock.mockReset());

  it('does not throw when account exists', async () => {
    queryMock.mockResolvedValue({ rows: [{ id: 'abc' }] });
    await expect(validateAccountExists('abc')).resolves.toBeUndefined();
  });

  it('throws 404 when account not found', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    await expect(validateAccountExists('missing')).rejects.toThrow('Account not found');
  });
});

describe('validateCategoryExists', () => {
  beforeEach(() => queryMock.mockReset());

  it('does not throw when category exists', async () => {
    queryMock.mockResolvedValue({ rows: [{ id: 'cat1' }] });
    await expect(validateCategoryExists('cat1')).resolves.toBeUndefined();
  });

  it('throws 404 when category not found', async () => {
    queryMock.mockResolvedValue({ rows: [] });
    await expect(validateCategoryExists('missing')).rejects.toThrow('Category not found');
  });
});
