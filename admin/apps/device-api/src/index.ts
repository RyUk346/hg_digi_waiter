import 'dotenv/config';
import { createServer } from 'node:http';
import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { Server } from 'socket.io';
import { z } from 'zod';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import {
  db,
  devices,
  venues,
  tables,
  menuCategories,
  menuItems,
  buildSteps,
  orders,
  orderLines,
  alerts,
} from '@hyperglow/db';

const PORT = Number(process.env.DEVICE_API_PORT ?? 3020);
const CORS_ORIGIN = process.env.DEVICE_API_CORS ?? '*';

// ─── App + Socket.io ──────────────────────────────────────────────────────

const app = express();
app.use(cors({ origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',') }));
app.use(express.json({ limit: '256kb' }));

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: CORS_ORIGIN === '*' ? true : CORS_ORIGIN.split(',') },
});

// ─── Device auth ──────────────────────────────────────────────────────────

interface DeviceCtx {
  id: string;
  venueId: string;
  tableId: string | null;
  kind: 'order' | 'kitchen' | 'manager';
  name: string;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      device?: DeviceCtx;
    }
  }
}

async function lookupDevice(token: string | undefined): Promise<DeviceCtx | null> {
  if (!token) return null;
  const [row] = await db
    .select({
      id: devices.id,
      venueId: devices.venueId,
      tableId: devices.tableId,
      kind: devices.kind,
      name: devices.name,
    })
    .from(devices)
    .where(eq(devices.token, token))
    .limit(1);
  if (!row) return null;
  // Touch lastSeenAt (fire-and-forget)
  db.update(devices).set({ lastSeenAt: new Date() }).where(eq(devices.id, row.id)).then(
    () => {},
    () => {},
  );
  return row as DeviceCtx;
}

async function requireDevice(req: Request, res: Response, next: NextFunction) {
  const header = req.headers.authorization ?? '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : undefined;
  const device = await lookupDevice(token);
  if (!device) {
    res.status(401).json({ error: 'invalid device token' });
    return;
  }
  req.device = device;
  next();
}

function requireKind(...kinds: DeviceCtx['kind'][]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.device || !kinds.includes(req.device.kind)) {
      res.status(403).json({ error: `requires ${kinds.join('|')} device` });
      return;
    }
    next();
  };
}

// ─── Health ───────────────────────────────────────────────────────────────

app.get('/health', (_req, res) => {
  res.json({ ok: true, sockets: io.engine.clientsCount });
});

// ─── GET /v1/bootstrap — device identity + venue + table info ─────────────

app.get('/v1/bootstrap', requireDevice, async (req, res) => {
  const device = req.device!;
  const [venue] = await db
    .select({ id: venues.id, name: venues.name, currency: venues.currency })
    .from(venues)
    .where(eq(venues.id, device.venueId))
    .limit(1);

  let table: { id: string; label: string } | null = null;
  if (device.tableId) {
    const [t] = await db
      .select({ id: tables.id, label: tables.label })
      .from(tables)
      .where(eq(tables.id, device.tableId))
      .limit(1);
    table = t ?? null;
  }

  res.json({ device: { id: device.id, kind: device.kind, name: device.name }, venue, table });
});

// ─── GET /v1/menu — categories + items + build steps for this venue ───────

app.get('/v1/menu', requireDevice, async (req, res) => {
  const venueId = req.device!.venueId;

  const cats = await db
    .select({ id: menuCategories.id, name: menuCategories.name, sortOrder: menuCategories.sortOrder })
    .from(menuCategories)
    .where(eq(menuCategories.venueId, venueId))
    .orderBy(asc(menuCategories.sortOrder));

  const items = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.venueId, venueId), eq(menuItems.available, true), isNull(menuItems.deletedAt)))
    .orderBy(asc(menuItems.sortOrder));

  const itemIds = items.map((i) => i.id);
  const steps = itemIds.length
    ? await db
        .select()
        .from(buildSteps)
        .where(inArray(buildSteps.menuItemId, itemIds))
        .orderBy(asc(buildSteps.stepIndex))
    : [];

  const stepsByItem = new Map<string, typeof steps>();
  for (const s of steps) {
    const list = stepsByItem.get(s.menuItemId) ?? [];
    list.push(s);
    stepsByItem.set(s.menuItemId, list);
  }

  res.json({
    categories: cats,
    items: items.map((i) => ({
      id: i.id,
      sku: i.sku,
      name: i.name,
      description: i.description,
      categoryId: i.categoryId,
      pricePence: i.basePricePence,
      station: i.station,
      tint: i.tint,
      imageUrl: i.imageUrl,
      allergens: i.allergens,
      crossSell: i.crossSell,
      buildSteps: (stepsByItem.get(i.id) ?? []).map((s) => ({
        id: s.id,
        question: s.question,
        subtitle: s.subtitle,
        options: s.options,
      })),
    })),
  });
});

// ─── POST /v1/orders — place an order (order devices only) ────────────────
// Prices are computed SERVER-SIDE from the DB. The client only sends item ids,
// quantities, and chosen option ids — never prices.

const placeOrderSchema = z.object({
  coverCount: z.number().int().min(1).max(20).default(2),
  lines: z
    .array(
      z.object({
        menuItemId: z.string().uuid(),
        quantity: z.number().int().min(1).max(20),
        selectedOptionIds: z.array(z.string()).default([]),
        notes: z.string().max(280).optional(),
      }),
    )
    .min(1)
    .max(50),
});

app.post('/v1/orders', requireDevice, requireKind('order'), async (req, res) => {
  const device = req.device!;
  if (!device.tableId) {
    res.status(400).json({ error: 'order device has no table bound' });
    return;
  }

  const parsed = placeOrderSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid payload', issues: parsed.error.issues });
    return;
  }
  const { coverCount, lines } = parsed.data;

  // Load items + steps to price the order server-side
  const itemIds = [...new Set(lines.map((l) => l.menuItemId))];
  const items = await db
    .select()
    .from(menuItems)
    .where(
      and(
        inArray(menuItems.id, itemIds),
        eq(menuItems.venueId, device.venueId),
        eq(menuItems.available, true),
        isNull(menuItems.deletedAt),
      ),
    );
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const steps = itemIds.length
    ? await db.select().from(buildSteps).where(inArray(buildSteps.menuItemId, itemIds))
    : [];
  // optionId -> {deltaPence, label, stepId}
  const optionIndex = new Map<string, { deltaPence: number; label: string; stepId: string; itemId: string }>();
  for (const s of steps) {
    for (const o of s.options) {
      optionIndex.set(o.id, { deltaPence: o.deltaPence, label: o.label, stepId: s.id, itemId: s.menuItemId });
    }
  }

  let subtotal = 0;
  const computedLines: Array<{
    menuItemId: string;
    quantity: number;
    basePricePence: number;
    upsellDeltaPence: number;
    linePricePence: number;
    selections: Array<{ stepId: string; optionId: string; label: string; deltaPence: number }>;
  }> = [];

  for (const line of lines) {
    const item = itemMap.get(line.menuItemId);
    if (!item) {
      res.status(400).json({ error: `menu item ${line.menuItemId} not available` });
      return;
    }
    let delta = 0;
    const selections: (typeof computedLines)[number]['selections'] = [];
    for (const optId of line.selectedOptionIds) {
      const opt = optionIndex.get(optId);
      if (!opt || opt.itemId !== item.id) {
        res.status(400).json({ error: `option ${optId} not valid for item ${item.name}` });
        return;
      }
      delta += opt.deltaPence;
      selections.push({ stepId: opt.stepId, optionId: optId, label: opt.label, deltaPence: opt.deltaPence });
    }
    const linePrice = (item.basePricePence + delta) * line.quantity;
    subtotal += linePrice;
    computedLines.push({
      menuItemId: item.id,
      quantity: line.quantity,
      basePricePence: item.basePricePence,
      upsellDeltaPence: delta,
      linePricePence: item.basePricePence + delta,
      selections,
    });
  }

  const result = await db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        venueId: device.venueId,
        tableId: device.tableId!,
        status: 'placed',
        coverCount,
        subtotalPence: subtotal,
        totalPence: subtotal,
        placedAt: new Date(),
      })
      .returning();
    if (!order) throw new Error('order insert failed');

    const insertedLines = await tx
      .insert(orderLines)
      .values(computedLines.map((l) => ({ ...l, orderId: order.id })))
      .returning();

    // Move the table into 'waiting' phase (games window opens)
    await tx.update(tables).set({ currentPhase: 'waiting' }).where(eq(tables.id, device.tableId!));

    return { order, lines: insertedLines };
  });

  // Notify kitchen displays + admin
  io.to(`venue:${device.venueId}`).emit('order:new', {
    orderId: result.order.id,
    tableId: device.tableId,
  });

  res.status(201).json({
    orderId: result.order.id,
    status: result.order.status,
    subtotalPence: subtotal,
    totalPence: subtotal,
    placedAt: result.order.placedAt,
    lines: result.lines.map((l) => ({
      id: l.id,
      menuItemId: l.menuItemId,
      quantity: l.quantity,
      linePricePence: l.linePricePence,
    })),
  });
});

// ─── GET /v1/orders/:id — status for the placing table ────────────────────

app.get('/v1/orders/:id', requireDevice, async (req, res) => {
  const device = req.device!;
  const [order] = await db
    .select()
    .from(orders)
    .where(and(eq(orders.id, req.params.id), eq(orders.venueId, device.venueId)))
    .limit(1);
  if (!order) {
    res.status(404).json({ error: 'order not found' });
    return;
  }
  // Order devices can only see their own table's orders
  if (device.kind === 'order' && order.tableId !== device.tableId) {
    res.status(403).json({ error: 'not your table' });
    return;
  }
  const lines = await db.select().from(orderLines).where(eq(orderLines.orderId, order.id));
  res.json({
    id: order.id,
    status: order.status,
    placedAt: order.placedAt,
    totalPence: order.totalPence,
    lines: lines.map((l) => ({
      id: l.id,
      menuItemId: l.menuItemId,
      quantity: l.quantity,
      bumpedAt: l.bumpedAt,
    })),
  });
});

// ─── Kitchen: GET /v1/kitchen/tickets — open orders with lines ────────────

app.get('/v1/kitchen/tickets', requireDevice, requireKind('kitchen', 'manager'), async (req, res) => {
  const venueId = req.device!.venueId;
  const open = await db
    .select({
      id: orders.id,
      status: orders.status,
      placedAt: orders.placedAt,
      tableLabel: tables.label,
    })
    .from(orders)
    .innerJoin(tables, eq(orders.tableId, tables.id))
    .where(and(eq(orders.venueId, venueId), inArray(orders.status, ['placed', 'in_kitchen'])))
    .orderBy(asc(orders.placedAt));

  const orderIds = open.map((o) => o.id);
  const lines = orderIds.length
    ? await db
        .select({
          id: orderLines.id,
          orderId: orderLines.orderId,
          quantity: orderLines.quantity,
          selections: orderLines.selections,
          bumpedAt: orderLines.bumpedAt,
          itemName: menuItems.name,
          station: menuItems.station,
        })
        .from(orderLines)
        .innerJoin(menuItems, eq(orderLines.menuItemId, menuItems.id))
        .where(inArray(orderLines.orderId, orderIds))
    : [];

  const linesByOrder = new Map<string, typeof lines>();
  for (const l of lines) {
    const list = linesByOrder.get(l.orderId) ?? [];
    list.push(l);
    linesByOrder.set(l.orderId, list);
  }

  res.json({
    tickets: open.map((o) => ({
      ...o,
      lines: linesByOrder.get(o.id) ?? [],
    })),
  });
});

// ─── Kitchen: POST /v1/kitchen/lines/:lineId/bump ─────────────────────────
// Marks a line as done. When the last line of an order is bumped, the order
// flips to 'served', the table moves to 'eating' phase (games window CLOSES),
// and an order:served event fires.

app.post(
  '/v1/kitchen/lines/:lineId/bump',
  requireDevice,
  requireKind('kitchen', 'manager'),
  async (req, res) => {
    const venueId = req.device!.venueId;
    const lineId = req.params.lineId;

    const [line] = await db
      .select({ id: orderLines.id, orderId: orderLines.orderId })
      .from(orderLines)
      .innerJoin(orders, eq(orderLines.orderId, orders.id))
      .where(and(eq(orderLines.id, lineId), eq(orders.venueId, venueId)))
      .limit(1);
    if (!line) {
      res.status(404).json({ error: 'line not found' });
      return;
    }

    await db.update(orderLines).set({ bumpedAt: new Date() }).where(eq(orderLines.id, lineId));

    const [{ remaining }] = await db
      .select({ remaining: sql<number>`count(*)::int` })
      .from(orderLines)
      .where(and(eq(orderLines.orderId, line.orderId), isNull(orderLines.bumpedAt)));

    let allDelivered = false;
    if ((remaining ?? 0) === 0) {
      allDelivered = true;
      const [order] = await db
        .update(orders)
        .set({ status: 'served' })
        .where(eq(orders.id, line.orderId))
        .returning({ tableId: orders.tableId });
      if (order?.tableId) {
        await db.update(tables).set({ currentPhase: 'eating' }).where(eq(tables.id, order.tableId));
        io.to(`table:${order.tableId}`).emit('order:served', { orderId: line.orderId });
      }
    }

    io.to(`venue:${venueId}`).emit('order:line:bumped', {
      orderId: line.orderId,
      lineId,
      allDelivered,
    });

    res.json({ ok: true, allDelivered });
  },
);

// ─── POST /v1/call-server — guest taps "call server" ─────────────────────

app.post('/v1/call-server', requireDevice, requireKind('order'), async (req, res) => {
  const device = req.device!;
  let tableLabel = '?';
  if (device.tableId) {
    const [t] = await db
      .select({ label: tables.label })
      .from(tables)
      .where(eq(tables.id, device.tableId))
      .limit(1);
    tableLabel = t?.label ?? '?';
  }
  await db.insert(alerts).values({
    venueId: device.venueId,
    tableId: device.tableId,
    severity: 'info',
    title: `Service call · Table ${tableLabel}`,
    body: 'Guest tapped "call server" on the order tablet.',
  });
  io.to(`venue:${device.venueId}`).emit('service:call', { tableId: device.tableId, tableLabel });
  res.json({ ok: true });
});

// ─── Socket.io auth + rooms ───────────────────────────────────────────────

io.use(async (socket, next) => {
  const token = socket.handshake.auth?.token as string | undefined;
  const device = await lookupDevice(token);
  if (!device) return next(new Error('invalid device token'));
  socket.data.device = device;
  next();
});

io.on('connection', (socket) => {
  const device = socket.data.device as DeviceCtx;
  socket.join(`venue:${device.venueId}`);
  if (device.tableId) socket.join(`table:${device.tableId}`);
  console.log(`[ws] + ${device.kind}:${device.name} (${io.engine.clientsCount} total)`);
  socket.on('disconnect', () => {
    console.log(`[ws] - ${device.kind}:${device.name}`);
  });
});

// ─── Boot ─────────────────────────────────────────────────────────────────

httpServer.listen(PORT, () => {
  console.log(`[device-api] :${PORT} cors=${CORS_ORIGIN}`);
});

const shutdown = () => {
  console.log('\n[device-api] shutting down');
  io.close();
  httpServer.close(() => process.exit(0));
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
