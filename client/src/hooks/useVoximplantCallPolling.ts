import { useEffect, useRef } from 'react';
import { trpc } from '@/lib/trpc';

interface UseVoximplantCallPollingOptions {
  applicationId: number;
  enabled?: boolean;
  interval?: number; // milliseconds
}

/**
 * Hook to poll for active Voximplant calls and sync them to the database
 * 
 * This hook will:
 * 1. Poll Voximplant API for active calls every `interval` ms
 * 2. Sync new calls to the database
 * 3. Update call status for completed calls
 * 4. Invalidate queries to trigger UI updates
 */
export function useVoximplantCallPolling({
  applicationId,
  enabled = true,
  interval = 10000, // 10 seconds default
}: UseVoximplantCallPollingOptions) {
  const utils = trpc.useUtils();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const syncCallsMutation = trpc.voximplant.syncCalls.useMutation({
    onSuccess: () => {
      // Invalidate queries to refresh UI
      utils.voximplant.getCalls.invalidate({ applicationId });
      utils.voximplant.getStats.invalidate({ applicationId });
    },
  });

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial sync
    syncCallsMutation.mutate({ applicationId });

    // Set up polling
    intervalRef.current = setInterval(() => {
      syncCallsMutation.mutate({ applicationId });
    }, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [applicationId, enabled, interval]);

  return {
    isSyncing: syncCallsMutation.isPending,
    lastSyncError: syncCallsMutation.error,
  };
}
