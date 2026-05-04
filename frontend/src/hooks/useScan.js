import { useState, useCallback, useRef } from 'react';
import { scansApi } from '../api';

export function useScan() {
  const [scans, setScans] = useState([]);
  const [currentScan, setCurrentScan] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const pollingRef = useRef(null);

  const upload = useCallback(async (files) => {
    setLoading(true);
    setError(null);
    try {
      const res = await scansApi.upload(files);
      const uploadedScans = res.data || [];

      // Start polling the first scan
      if (uploadedScans.length > 0) {
        setCurrentScan(uploadedScans[0]);
        startPolling(uploadedScans[0].id);
      }

      return uploadedScans;
    } catch (err) {
      setError(err.message);
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const startPolling = useCallback((scanId) => {
    if (pollingRef.current) clearInterval(pollingRef.current);

    pollingRef.current = setInterval(async () => {
      try {
        const res = await scansApi.status(scanId);
        if (res.data.status === 'completed' || res.data.status === 'failed') {
          clearInterval(pollingRef.current);
          pollingRef.current = null;

          if (res.data.status === 'completed') {
            const results = await scansApi.results(scanId);
            setDocuments(results.data?.documents || []);
          }

          setCurrentScan((prev) => prev ? { ...prev, status: res.data.status } : null);
        }
      } catch {
        clearInterval(pollingRef.current);
      }
    }, 2000);
  }, []);

  const confirm = useCallback(async (scanId, docs) => {
    try {
      await scansApi.confirm(scanId, docs);
      setDocuments([]);
      setCurrentScan(null);
      return true;
    } catch (err) {
      setError(err.message);
      return false;
    }
  }, []);

  const retry = useCallback(async (scanId) => {
    try {
      await scansApi.retry(scanId);
      setCurrentScan((prev) => prev ? { ...prev, status: 'pending' } : null);
      startPolling(scanId);
    } catch (err) {
      setError(err.message);
    }
  }, [startPolling]);

  const fetchHistory = useCallback(async (page = 1) => {
    try {
      const res = await scansApi.list({ page });
      setScans(res.data || []);
      return res.meta?.pagination;
    } catch (err) {
      setError(err.message);
    }
  }, []);

  return {
    scans, currentScan, documents, loading, error,
    upload, confirm, retry, fetchHistory,
  };
}
