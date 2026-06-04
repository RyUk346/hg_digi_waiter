'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io, type Socket } from 'socket.io-client';

interface ChangeEvent {
  table: string;
  op: 'INSERT' | 'UPDATE' | 'DELETE';
  id: string;
  venueId: string | null;
  ts: number;
}

const REFRESH_DEBOUNCE_MS = 1500;

export function LiveRefresh({ venueId }: { venueId: string }) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const [lastEvent, setLastEvent] = useState<ChangeEvent | null>(null);

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_REALTIME_URL;
    // No URL configured → don't try to connect (the indicator stays "Offline").
    // Prevents endless WebSocket retries against the current origin in production
    // when the realtime bridge isn't deployed.
    if (!url) return;
    const socket: Socket = io(url, { transports: ['websocket', 'polling'], reconnection: true });

    let refreshTimer: ReturnType<typeof setTimeout> | null = null;
    const scheduleRefresh = () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => router.refresh(), REFRESH_DEBOUNCE_MS);
    };

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('subscribe', { venueId });
    });
    socket.on('disconnect', () => setConnected(false));
    socket.on('change', (evt: ChangeEvent) => {
      setLastEvent(evt);
      scheduleRefresh();
    });

    return () => {
      if (refreshTimer) clearTimeout(refreshTimer);
      socket.disconnect();
    };
  }, [router, venueId]);

  return (
    <div
      className={[
        'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-[11px] font-medium border',
        connected
          ? 'bg-oliveSoft text-olive border-olive/30'
          : 'bg-surface2 text-muted border-border',
      ].join(' ')}
      title={
        connected
          ? lastEvent
            ? `Last event: ${lastEvent.table} ${lastEvent.op}`
            : 'Live · waiting for first event'
          : 'Disconnected from realtime'
      }
    >
      <span
        className={[
          'w-1.5 h-1.5 rounded-full',
          connected ? 'bg-olive animate-pulse-slow' : 'bg-muted',
        ].join(' ')}
      />
      <span>{connected ? 'Live · auto-refresh 30s' : 'Offline'}</span>
    </div>
  );
}
