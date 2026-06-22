import { useCallback, useEffect, useState } from 'react';
import { apiService, type ModelStatusResponse } from '../services/api';

export function useModelStatus() {
  const [status, setStatus] = useState<ModelStatusResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const res = await apiService.getModelStatus();
      setStatus(res);
    } catch {
      setStatus(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const isWarming = status != null && status.publish_ready === false;

  return { status, loading, isWarming, reload };
}
