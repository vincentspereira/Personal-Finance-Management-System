import { useState, useEffect, useCallback } from 'react';
import { analyticsApi } from '../api';

export function useAnalytics() {
  const [summary, setSummary] = useState(null);
  const [byCategory, setByCategory] = useState([]);
  const [trends, setTrends] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSummary = useCallback(async (startDate, endDate) => {
    setLoading(true);
    try {
      const res = await analyticsApi.summary({ startDate, endDate });
      setSummary(res.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchByCategory = useCallback(async (startDate, endDate) => {
    try {
      const res = await analyticsApi.byCategory({ startDate, endDate });
      setByCategory(res.data || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const fetchTrends = useCallback(async (months = 12) => {
    try {
      const res = await analyticsApi.trends({ months });
      setTrends(res.data || []);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  return { summary, byCategory, trends, loading, error, fetchSummary, fetchByCategory, fetchTrends };
}
