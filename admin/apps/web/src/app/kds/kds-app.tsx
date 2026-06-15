'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { Check, CheckCheck, Flame, LogOut, WifiOff } from 'lucide-react';

/**
 * Kitchen Display System client. Token-gated; everything goes through the
 * device-api (REST + socket.io) — no admin session involved.
 */

const DEVICE_API_URL = process.env.NEXT_PUBLIC_DEVICE_API_URL ?? 'http://localhost:3020';
const TOKEN_KEY = 'hyperglow-kds-token';

interface TicketLine {
  id: string;
  quantity: number;
  itemName: string;
  station: string;
  bumpedAt: string | null;
  selections: Array<{ label: string }>;
}

interface Ticket {
  id: string;
  status: string;
  placedAt: string;
  tableLabel: string;
  lines: TicketLine[];
}

// Kitchen dark theme (HANDOVER §8)
const C = {
  env: '#08070C',
  bg: '#0E0D0C',
  surface: '#1A1715',
  surface2: '#211D1A',
  surface3: '#2B2622',
  text: '#E8E2D3',
  textBright: '#FBF7EE',
  muted: '#95887A',
  olive: '#4A7C3F',
  amber: '#B8843D',
  red: '#C13F35',
};

const STATION_COLORS: Record<string, { fg: string; bg: string }> = {
  grill: { fg: '#E08838', bg: 'rgba(224,136,56,0.15)' },
  pasta: { fg: '#5A95E0', bg: 'rgba(90,149,224,0.15)' },
  pizza: { fg: '#D85040', bg: 'rgba(216,80,64,0.15)' },
  cold: { fg: '#6FB35A', bg: 'rgba(111,179,90,0.15)' },
  dessert: { fg: '#B280D4', bg: 'rgba(178,128,212,0.15)' },
  bar: { fg: '#C76B52', bg: 'rgba(199,107,82,0.15)' },
};

export function KdsApp() {
  const [token, setToken] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  // Token bootstrapping: URL ?token= wins, else localStorage.
  useEffect(() => {
    const url = new URL(window.location.href);
    const fromUrl = url.searchParams.get('token');
    if (fromUrl) {
      localStorage.setItem(TOKEN_KEY, fromUrl);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', url.toString());
      setToken(fromUrl);
    } else {
      setToken(localStorage.getItem(TOKEN_KEY));
    }
    setChecked(true);
  }, []);

  if (!checked) return <Shell />;
  if (!token) {
    return (
      <TokenGate
        onSubmit={(t) => {
          localStorage.setItem(TOKEN_KEY, t);
          setToken(t);
        }}
      />
    );
  }
  return (
    <Board
      token={token}
      onLogout={() => {
        localStorage.removeItem(TOKEN_KEY);
        setToken(null);
      }}
    />
  );
}

// ─── Shell + token gate ───────────────────────────────────────────────────

function Shell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="min-h-screen px-6 py-5" style={{ background: C.bg }}>
      {children}
    </div>
  );
}

function TokenGate({ onSubmit }: { onSubmit: (token: string) => void }) {
  const [value, setValue] = useState('');
  return (
    <Shell>
      <div className="max-w-sm mx-auto mt-32">
        <div className="text-center mb-8">
          <Flame size={36} className="mx-auto mb-3" style={{ color: '#E08838' }} />
          <h1 className="font-serif text-3xl" style={{ color: C.textBright }}>
            Kitchen Display
          </h1>
          <p className="text-sm mt-2" style={{ color: C.muted }}>
            Enter this display&rsquo;s device token to connect.
          </p>
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (value.trim()) onSubmit(value.trim());
          }}
          className="space-y-3"
        >
          <input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="device token"
            autoFocus
            className="w-full px-4 py-3 rounded-lg font-mono text-sm focus:outline-none"
            style={{ background: C.surface, color: C.text, border: `1px solid ${C.surface3}` }}
          />
          <button
            type="submit"
            className="w-full py-3 rounded-lg font-bold text-sm"
            style={{ background: C.olive, color: C.textBright }}
          >
            Connect
          </button>
          <p className="text-[11px] text-center" style={{ color: C.muted }}>
            Dev token: <span className="font-mono">dev-kitchen-pass</span> (from pnpm db:seed)
          </p>
        </form>
      </div>
    </Shell>
  );
}

// ─── Board ────────────────────────────────────────────────────────────────

function Board({ token, onLogout }: { token: string; onLogout: () => void }) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [venueName, setVenueName] = useState('');
  const [connected, setConnected] = useState(false);
  const [authFailed, setAuthFailed] = useState(false);
  const [, setClock] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch(`${DEVICE_API_URL}/v1/kitchen/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.status === 401 || res.status === 403) {
        setAuthFailed(true);
        return;
      }
      const data = await res.json();
      setTickets(data.tickets ?? []);
    } catch {
      // network blip — keep last known tickets, poller will retry
    }
  }, [token]);

  useEffect(() => {
    // Bootstrap: venue name
    fetch(`${DEVICE_API_URL}/v1/bootstrap`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d) => setVenueName(d.venue?.name ?? ''))
      .catch((status) => {
        if (status === 401 || status === 403) setAuthFailed(true);
      });

    fetchTickets();

    // Socket: refetch on any order event
    const socket = io(DEVICE_API_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('connect_error', () => setConnected(false));
    socket.on('order:new', fetchTickets);
    socket.on('order:line:bumped', fetchTickets);

    // Polling fallback + age-label clock
    const poll = setInterval(fetchTickets, 10_000);
    const clock = setInterval(() => setClock((c) => c + 1), 30_000);

    return () => {
      socket.disconnect();
      clearInterval(poll);
      clearInterval(clock);
    };
  }, [token, fetchTickets]);

  async function bump(lineId: string) {
    // Optimistic: mark locally, server confirms via socket refetch
    setTickets((prev) =>
      prev.map((t) => ({
        ...t,
        lines: t.lines.map((l) => (l.id === lineId ? { ...l, bumpedAt: new Date().toISOString() } : l)),
      })),
    );
    await fetch(`${DEVICE_API_URL}/v1/kitchen/lines/${lineId}/bump`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
    fetchTickets();
  }

  async function bumpAllLines(ticket: Ticket) {
    for (const line of ticket.lines.filter((l) => !l.bumpedAt)) {
      // sequential — server flips order to served on the last one
      // eslint-disable-next-line no-await-in-loop
      await fetch(`${DEVICE_API_URL}/v1/kitchen/lines/${line.id}/bump`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
    fetchTickets();
  }

  if (authFailed) {
    return (
      <Shell>
        <div className="max-w-sm mx-auto mt-32 text-center">
          <WifiOff size={32} className="mx-auto mb-3" style={{ color: C.red }} />
          <h1 className="font-serif text-2xl" style={{ color: C.textBright }}>
            Token rejected
          </h1>
          <p className="text-sm mt-2 mb-6" style={{ color: C.muted }}>
            This device token isn&rsquo;t valid (or was revoked).
          </p>
          <button
            type="button"
            onClick={onLogout}
            className="px-5 py-2.5 rounded-lg font-bold text-sm"
            style={{ background: C.surface3, color: C.text }}
          >
            Enter a different token
          </button>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {/* Top bar */}
      <header className="flex items-center justify-between mb-5">
        <div>
          <h1 className="font-serif text-2xl" style={{ color: C.textBright }}>
            Kitchen{venueName ? ` · ${venueName}` : ''}
          </h1>
          <p className="text-xs mt-0.5" style={{ color: C.muted }}>
            {tickets.length} open ticket{tickets.length === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2"
            style={{ background: C.surface, color: connected ? '#6FB35A' : C.muted }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: connected ? '#6FB35A' : C.muted }}
            />
            {connected ? 'Live' : 'Reconnecting…'}
          </span>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Disconnect device"
            title="Disconnect device"
            className="p-2 rounded-full"
            style={{ background: C.surface, color: C.muted }}
          >
            <LogOut size={14} />
          </button>
        </div>
      </header>

      {/* Grid */}
      {tickets.length === 0 ? (
        <div
          className="rounded-2xl text-center py-24"
          style={{ background: C.surface, border: `1px solid ${C.surface3}`, color: C.muted }}
        >
          <p className="text-lg" style={{ color: C.text }}>
            All clear
          </p>
          <p className="text-sm mt-1">New orders appear the moment a table places them.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
          {tickets.map((t) => (
            <TicketCard key={t.id} ticket={t} onBump={bump} onBumpAll={() => bumpAllLines(t)} />
          ))}
        </div>
      )}
    </Shell>
  );
}

// ─── Ticket ───────────────────────────────────────────────────────────────

function minutesSince(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
}

function TicketCard({
  ticket,
  onBump,
  onBumpAll,
}: {
  ticket: Ticket;
  onBump: (lineId: string) => void;
  onBumpAll: () => void;
}) {
  const mins = minutesSince(ticket.placedAt);
  const ageColor = mins >= 15 ? C.red : mins >= 8 ? C.amber : '#6FB35A';
  const remaining = ticket.lines.filter((l) => !l.bumpedAt).length;

  return (
    <article
      className="rounded-xl overflow-hidden flex flex-col"
      style={{ background: C.surface, border: `1px solid ${C.surface3}` }}
    >
      <header
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: `1px solid ${C.surface3}` }}
      >
        <span
          className="font-mono text-lg font-bold px-2.5 py-0.5 rounded"
          style={{ background: C.surface3, color: C.textBright }}
        >
          T{ticket.tableLabel}
        </span>
        <span className="font-mono text-sm font-bold" style={{ color: ageColor }}>
          {mins}m
        </span>
      </header>

      <ul className="flex-1 px-2 py-2 space-y-1">
        {ticket.lines.map((l) => {
          const station = STATION_COLORS[l.station] ?? STATION_COLORS.grill;
          const bumped = !!l.bumpedAt;
          return (
            <li key={l.id}>
              <button
                type="button"
                onClick={() => onBump(l.id)}
                disabled={bumped}
                className="w-full text-left px-3 py-2.5 rounded-lg flex items-start gap-3"
                style={{
                  background: bumped ? 'rgba(111,179,90,0.08)' : C.surface2,
                  opacity: bumped ? 0.55 : 1,
                }}
              >
                <span
                  className="shrink-0 font-mono text-sm font-bold w-7 text-center rounded"
                  style={{ background: station.bg, color: station.fg }}
                >
                  {l.quantity}
                </span>
                <span className="flex-1 min-w-0">
                  <span
                    className="block text-sm font-medium leading-tight"
                    style={{
                      color: bumped ? '#6FB35A' : C.text,
                      textDecoration: bumped ? 'line-through' : 'none',
                    }}
                  >
                    {l.itemName}
                  </span>
                  {l.selections.length > 0 ? (
                    <span className="block text-[11px] mt-0.5" style={{ color: C.muted }}>
                      {l.selections.map((s) => s.label).join(' · ')}
                    </span>
                  ) : null}
                </span>
                {bumped ? <Check size={16} className="shrink-0 mt-0.5" style={{ color: '#6FB35A' }} /> : null}
              </button>
            </li>
          );
        })}
      </ul>

      <footer className="px-3 pb-3">
        <button
          type="button"
          onClick={onBumpAll}
          disabled={remaining === 0}
          className="w-full py-2.5 rounded-lg text-sm font-bold flex items-center justify-center gap-2 disabled:opacity-40"
          style={{ background: C.olive, color: C.textBright }}
        >
          <CheckCheck size={15} strokeWidth={2.25} />
          {remaining === 0 ? 'Served' : `Serve all (${remaining})`}
        </button>
      </footer>
    </article>
  );
}
