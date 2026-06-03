import 'dotenv/config';
import { createServer } from 'node:http';
import { Server } from 'socket.io';
import postgres from 'postgres';

const PORT = Number(process.env.REALTIME_PORT ?? 3001);
const ORIGIN = process.env.REALTIME_CORS_ORIGIN ?? 'http://localhost:3000';
const DATABASE_URL = process.env.DATABASE_URL;
const CHANNEL = 'hyperglow_events';

if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

interface ChangeEvent {
  table: string;
  op: 'INSERT' | 'UPDATE' | 'DELETE';
  id: string;
  venueId: string | null;
  ts: number;
}

const httpServer = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, sockets: io.engine.clientsCount }));
    return;
  }
  res.writeHead(404);
  res.end();
});

const io = new Server(httpServer, {
  cors: { origin: ORIGIN, credentials: true },
});

io.on('connection', (socket) => {
  console.log(`[ws] + ${socket.id} (total ${io.engine.clientsCount})`);

  socket.on('subscribe', ({ venueId }: { venueId?: string }) => {
    if (typeof venueId === 'string' && venueId.length > 0) {
      socket.join(`venue:${venueId}`);
      socket.emit('subscribed', { venueId });
    }
    socket.join('all');
  });

  socket.on('disconnect', () => {
    console.log(`[ws] - ${socket.id} (total ${io.engine.clientsCount})`);
  });
});

const sql = postgres(DATABASE_URL, { max: 1, idle_timeout: 0, connection: { application_name: 'hyperglow-realtime' } });

async function startListener() {
  // postgres.js exposes LISTEN on the unsafe channel
  await sql.listen(CHANNEL, (payload) => {
    let parsed: ChangeEvent | null = null;
    try {
      parsed = JSON.parse(payload) as ChangeEvent;
    } catch {
      console.warn('[pg] non-JSON payload', payload);
      return;
    }
    if (!parsed) return;

    io.to('all').emit('change', parsed);
    if (parsed.venueId) {
      io.to(`venue:${parsed.venueId}`).emit('change', parsed);
    }
  });
  console.log(`[pg] LISTEN ${CHANNEL}`);
}

startListener().catch((err) => {
  console.error('[pg] listener failed', err);
  process.exit(1);
});

httpServer.listen(PORT, () => {
  console.log(`[realtime] :${PORT}  cors=${ORIGIN}`);
});

// Graceful shutdown
const shutdown = async () => {
  console.log('\n[realtime] shutting down');
  io.close();
  await sql.end({ timeout: 2 });
  process.exit(0);
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
