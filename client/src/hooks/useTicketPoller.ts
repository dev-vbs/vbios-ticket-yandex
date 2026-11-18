import { useEffect, useRef } from 'react';
import { ticketApi } from '../api/client';
import { useStore } from '../store/useStore';

const POLL_INTERVAL = 155000;

export function useTicketPoller(enabled: boolean) {
  const setHasNewTicketMessages = useStore((s) => s.setHasNewTicketMessages);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    let pending = false;
    const check = async () => {
      if (pending || document.hidden || !navigator.onLine) return;
      pending = true;
      try {
        const response = await ticketApi.list({ status: 'waiting', limit: 1 });
        const data = response.data?.data;
        if (!stopped) setHasNewTicketMessages(Array.isArray(data) && data.length > 0);
      } catch {
        // ignore polling errors silently
      } finally {
        pending = false;
      }
    };

    check();
    timerRef.current = setInterval(check, POLL_INTERVAL);

    return () => {
      stopped = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [enabled, setHasNewTicketMessages]);
}
