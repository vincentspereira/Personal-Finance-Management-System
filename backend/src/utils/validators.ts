import { query } from '../db';
import { createError } from '../middleware/errorHandler';

export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginatedResult {
  rows: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function paginate(
  baseQuery: string,
  countQuery: string,
  params: any[] = [],
  pagination: PaginationParams = {}
): Promise<PaginatedResult> {
  const page = Math.max(1, pagination.page || 1);
  const limit = Math.min(100, Math.max(1, pagination.limit || 50));
  const offset = (page - 1) * limit;

  const countResult = await query(countQuery, params);
  const total = parseInt(countResult.rows[0].count);
  const totalPages = Math.ceil(total / limit);

  const rows = await query(
    `${baseQuery} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limit, offset]
  );

  return { rows: rows.rows, total, page, limit, totalPages };
}

export function parsePagination(query: any): PaginationParams {
  return {
    page: query.page ? parseInt(query.page) : undefined,
    limit: query.limit ? parseInt(query.limit) : undefined,
  };
}

export async function validateAccountExists(accountId: string) {
  const result = await query('SELECT id FROM accounts WHERE id = $1 AND is_archived = false', [accountId]);
  if (result.rows.length === 0) {
    throw createError(404, 'Account not found');
  }
}

export async function validateCategoryExists(categoryId: string) {
  const result = await query('SELECT id FROM categories WHERE id = $1', [categoryId]);
  if (result.rows.length === 0) {
    throw createError(404, 'Category not found');
  }
}
