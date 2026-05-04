import { useState, useEffect, useCallback } from 'react';
import { transactionsApi } from '../api';

export function useTransactions(initialParams = {}) {
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 50, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [params, setParams] = useState(initialParams);

  const fetch = useCallback(async (overrideParams = {}) => {
    setLoading(true);
    setError(null);
    try {
      const res = await transactionsApi.list({ ...params, ...overrideParams });
      setData(res.data || []);
      if (res.meta?.pagination) {
        setPagination(res.meta.pagination);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { fetch(); }, [fetch]);

  const create = async (input) => {
    const res = await transactionsApi.create(input);
    await fetch();
    return res.data;
  };

  const update = async (id, input) => {
    const res = await transactionsApi.update(id, input);
    await fetch();
    return res.data;
  };

  const remove = async (id) => {
    await transactionsApi.delete(id);
    await fetch();
  };

  return { data, pagination, loading, error, refetch: fetch, setParams, create, update, remove };
}
