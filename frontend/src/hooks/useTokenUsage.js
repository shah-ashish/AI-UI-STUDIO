import { useState, useCallback } from 'react';
import { fetchSessionUsage, resetSessionOnServer } from '../api/studioApi';

const DEFAULT_USAGE = {
  research: { used: 0, max: 10000, percentage: 0, remaining: 10000 },
  design: { used: 0, max: 10000, percentage: 0, remaining: 10000 },
  code: { used: 0 },
};

export function useTokenUsage(sessionId) {
  const [usage, setUsage] = useState(DEFAULT_USAGE);

  const refreshUsage = useCallback(async () => {
    if (!sessionId) return;
    const data = await fetchSessionUsage(sessionId);
    if (data) {
      setUsage(data);
    }
  }, [sessionId]);

  const updateUsageDirectly = useCallback((newUsage) => {
    if (newUsage) {
      setUsage(newUsage);
    }
  }, []);

  const resetUsage = useCallback(async () => {
    if (!sessionId) return;
    const updated = await resetSessionOnServer(sessionId);
    if (updated) {
      setUsage(updated);
    } else {
      setUsage(DEFAULT_USAGE);
    }
  }, [sessionId]);

  return {
    usage,
    refreshUsage,
    updateUsageDirectly,
    resetUsage,
  };
}
