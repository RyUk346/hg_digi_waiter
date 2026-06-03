import { relations, sql } from 'drizzle-orm';
import {
  pgTable,
  text,
  uuid,
  integer,
  numeric,
  boolean,
  timestamp,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
  primaryKey,
} from 'drizzle-orm/pg-core';

// ─── Enums ────────────────────────────────────────────────────────────────

export const userRole = pgEnum('user_role', ['admin', 'manager', 'staff']);
export const diningPhase = pgEnum('dining_phase', ['pre_order', 'waiting', 'eating', 'paying', 'closed']);
export const orderStatus = pgEnum('order_status', ['draft', 'placed', 'in_kitchen', 'served', 'paid', 'voided']);
export const paymentStatus = pgEnum('payment_status', ['pending', 'succeeded', 'failed', 'refunded']);
export const paymentMethod = pgEnum('payment_method', ['card_terminal', 'cash', 'split']);
export const kitchenStation = pgEnum('kitchen_station', ['grill', 'pasta', 'pizza', 'cold', 'dessert', 'bar']);
export const auditAction = pgEnum('audit_action', [
  'refusal_of_service',
  'comp',
  'void',
  'allergen_signoff',
  'manager_override',
  'recovery_spend',
  'shift_handover',
]);
export const alertSeverity = pgEnum('alert_severity', ['info', 'warning', 'critical', 'celebration']);

// ─── Timestamps helper ────────────────────────────────────────────────────

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
};

// ─── Tenancy: venues ──────────────────────────────────────────────────────

export const venues = pgTable('venues', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  city: text('city'),
  timezone: text('timezone').notNull().default('Europe/London'),
  currency: text('currency').notNull().default('GBP'),
  recoveryBudgetPence: integer('recovery_budget_pence').notNull().default(20000),
  ...timestamps,
});

// ─── Auth: users (Auth.js compatible) ─────────────────────────────────────

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    email: text('email').notNull().unique(),
    emailVerified: timestamp('email_verified', { withTimezone: true }),
    name: text('name'),
    image: text('image'),
    passwordHash: text('password_hash'),
    role: userRole('role').notNull().default('admin'),
    venueId: uuid('venue_id').references(() => venues.id, { onDelete: 'set null' }),
    ...timestamps,
  },
  (t) => ({
    emailIdx: uniqueIndex('users_email_idx').on(t.email),
  }),
);

export const accounts = pgTable(
  'accounts',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    provider: text('provider').notNull(),
    providerAccountId: text('provider_account_id').notNull(),
    refresh_token: text('refresh_token'),
    access_token: text('access_token'),
    expires_at: integer('expires_at'),
    token_type: text('token_type'),
    scope: text('scope'),
    id_token: text('id_token'),
    session_state: text('session_state'),
  },
  (t) => ({ pk: primaryKey({ columns: [t.provider, t.providerAccountId] }) }),
);

export const sessions = pgTable('sessions', {
  sessionToken: text('session_token').primaryKey(),
  userId: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expires: timestamp('expires', { withTimezone: true }).notNull(),
});

export const verificationTokens = pgTable(
  'verification_tokens',
  {
    identifier: text('identifier').notNull(),
    token: text('token').notNull(),
    expires: timestamp('expires', { withTimezone: true }).notNull(),
  },
  (t) => ({ pk: primaryKey({ columns: [t.identifier, t.token] }) }),
);

// ─── Floor: tables ────────────────────────────────────────────────────────

export const tables = pgTable(
  'tables',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    seats: integer('seats').notNull().default(2),
    section: text('section'),
    currentPhase: diningPhase('current_phase').notNull().default('pre_order'),
    ...timestamps,
  },
  (t) => ({
    venueLabelIdx: uniqueIndex('tables_venue_label_idx').on(t.venueId, t.label),
  }),
);

// ─── Staff: servers ───────────────────────────────────────────────────────

export const servers = pgTable('servers', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id')
    .notNull()
    .references(() => venues.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  avatarUrl: text('avatar_url'),
  active: boolean('active').notNull().default(true),
  ...timestamps,
});

// ─── Menu ─────────────────────────────────────────────────────────────────

export const menuCategories = pgTable('menu_categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  venueId: uuid('venue_id')
    .notNull()
    .references(() => venues.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  ...timestamps,
});

export const menuItems = pgTable(
  'menu_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => menuCategories.id, { onDelete: 'set null' }),
    sku: text('sku').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    basePricePence: integer('base_price_pence').notNull(),
    station: kitchenStation('station').notNull().default('grill'),
    tint: text('tint'),
    available: boolean('available').notNull().default(true),
    crossSell: boolean('cross_sell').notNull().default(false),
    allergens: jsonb('allergens').$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    imageUrl: text('image_url'),
    sortOrder: integer('sort_order').notNull().default(0),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => ({
    venueSkuIdx: uniqueIndex('menu_items_venue_sku_idx').on(t.venueId, t.sku),
    venueIdx: index('menu_items_venue_idx').on(t.venueId),
  }),
);

// Build sequence: ordered question-list per item.
// `options` is the choices for one step (delta-priced, featured flag).
export const buildSteps = pgTable(
  'build_steps',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    menuItemId: uuid('menu_item_id')
      .notNull()
      .references(() => menuItems.id, { onDelete: 'cascade' }),
    stepIndex: integer('step_index').notNull(),
    question: text('question').notNull(),
    subtitle: text('subtitle'),
    options: jsonb('options')
      .$type<Array<{
        id: string;
        label: string;
        description?: string;
        deltaPence: number;
        featured?: boolean;
        badge?: string;
      }>>()
      .notNull(),
    ...timestamps,
  },
  (t) => ({
    itemStepIdx: uniqueIndex('build_steps_item_step_idx').on(t.menuItemId, t.stepIndex),
  }),
);

// ─── Games ────────────────────────────────────────────────────────────────

export const games = pgTable('games', {
  id: uuid('id').primaryKey().defaultRandom(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  durationSeconds: integer('duration_seconds').notNull(),
  pricePence: integer('price_pence').notNull().default(200),
  featured: boolean('featured').notNull().default(false),
  hyperglowRevenueShareBps: integer('hyperglow_revenue_share_bps').notNull().default(8000), // 80% in basis points
  ...timestamps,
});

// ─── Orders ───────────────────────────────────────────────────────────────

export const orders = pgTable(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    tableId: uuid('table_id')
      .notNull()
      .references(() => tables.id, { onDelete: 'restrict' }),
    serverId: uuid('server_id').references(() => servers.id, { onDelete: 'set null' }),
    status: orderStatus('status').notNull().default('draft'),
    coverCount: integer('cover_count').notNull().default(2),
    subtotalPence: integer('subtotal_pence').notNull().default(0),
    totalPence: integer('total_pence').notNull().default(0),
    placedAt: timestamp('placed_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => ({
    venueStatusIdx: index('orders_venue_status_idx').on(t.venueId, t.status),
    placedAtIdx: index('orders_placed_at_idx').on(t.placedAt),
  }),
);

export const orderLines = pgTable(
  'order_lines',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    menuItemId: uuid('menu_item_id')
      .notNull()
      .references(() => menuItems.id, { onDelete: 'restrict' }),
    quantity: integer('quantity').notNull().default(1),
    basePricePence: integer('base_price_pence').notNull(),
    upsellDeltaPence: integer('upsell_delta_pence').notNull().default(0),
    linePricePence: integer('line_price_pence').notNull(),
    selections: jsonb('selections')
      .$type<Array<{ stepId: string; optionId: string; label: string; deltaPence: number }>>()
      .notNull()
      .default(sql`'[]'::jsonb`),
    bumpedAt: timestamp('bumped_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => ({
    orderIdx: index('order_lines_order_idx').on(t.orderId),
  }),
);

// ─── Payments ─────────────────────────────────────────────────────────────

export const payments = pgTable(
  'payments',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'cascade' }),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    amountPence: integer('amount_pence').notNull(),
    tipPence: integer('tip_pence').notNull().default(0),
    method: paymentMethod('method').notNull(),
    status: paymentStatus('status').notNull().default('pending'),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    paidAt: timestamp('paid_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => ({
    orderIdx: index('payments_order_idx').on(t.orderId),
    venuePaidIdx: index('payments_venue_paid_idx').on(t.venueId, t.paidAt),
  }),
);

// ─── Game plays (revenue) ─────────────────────────────────────────────────

export const gamePlays = pgTable(
  'game_plays',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    tableId: uuid('table_id').references(() => tables.id, { onDelete: 'set null' }),
    gameId: uuid('game_id')
      .notNull()
      .references(() => games.id, { onDelete: 'restrict' }),
    pricePence: integer('price_pence').notNull(),
    hyperglowShareBps: integer('hyperglow_share_bps').notNull(),
    score: integer('score'),
    completed: boolean('completed').notNull().default(false),
    stripePaymentIntentId: text('stripe_payment_intent_id'),
    playedAt: timestamp('played_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => ({
    venuePlayedIdx: index('game_plays_venue_played_idx').on(t.venueId, t.playedAt),
  }),
);

// ─── Server upsell attribution ────────────────────────────────────────────

export const serverShifts = pgTable(
  'server_shifts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    serverId: uuid('server_id')
      .notNull()
      .references(() => servers.id, { onDelete: 'cascade' }),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    covers: integer('covers').notNull().default(0),
    upsellAttemptCount: integer('upsell_attempt_count').notNull().default(0),
    upsellAcceptedCount: integer('upsell_accepted_count').notNull().default(0),
    revenuePence: integer('revenue_pence').notNull().default(0),
    ...timestamps,
  },
  (t) => ({
    serverIdx: index('server_shifts_server_idx').on(t.serverId, t.startedAt),
  }),
);

// ─── Audit (compliance, refusals, comps, overrides) ───────────────────────

export const auditLog = pgTable(
  'audit_log',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    actorUserId: uuid('actor_user_id').references(() => users.id, { onDelete: 'set null' }),
    actorServerId: uuid('actor_server_id').references(() => servers.id, { onDelete: 'set null' }),
    tableId: uuid('table_id').references(() => tables.id, { onDelete: 'set null' }),
    action: auditAction('action').notNull(),
    amountPence: integer('amount_pence'),
    details: jsonb('details').$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
    occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
    ...timestamps,
  },
  (t) => ({
    venueOccurredIdx: index('audit_log_venue_occurred_idx').on(t.venueId, t.occurredAt),
    actionIdx: index('audit_log_action_idx').on(t.action),
  }),
);

// ─── Sentiment / live alerts (denormalised hot feed) ──────────────────────

export const alerts = pgTable(
  'alerts',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    venueId: uuid('venue_id')
      .notNull()
      .references(() => venues.id, { onDelete: 'cascade' }),
    tableId: uuid('table_id').references(() => tables.id, { onDelete: 'set null' }),
    severity: alertSeverity('severity').notNull(),
    title: text('title').notNull(),
    body: text('body'),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    ...timestamps,
  },
  (t) => ({
    venueResolvedIdx: index('alerts_venue_resolved_idx').on(t.venueId, t.resolvedAt),
  }),
);

// ─── Relations ────────────────────────────────────────────────────────────

export const venuesRelations = relations(venues, ({ many }) => ({
  tables: many(tables),
  servers: many(servers),
  menuItems: many(menuItems),
  orders: many(orders),
  payments: many(payments),
  gamePlays: many(gamePlays),
  auditLog: many(auditLog),
  alerts: many(alerts),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  venue: one(venues, { fields: [orders.venueId], references: [venues.id] }),
  table: one(tables, { fields: [orders.tableId], references: [tables.id] }),
  server: one(servers, { fields: [orders.serverId], references: [servers.id] }),
  lines: many(orderLines),
  payments: many(payments),
}));

export const orderLinesRelations = relations(orderLines, ({ one }) => ({
  order: one(orders, { fields: [orderLines.orderId], references: [orders.id] }),
  menuItem: one(menuItems, { fields: [orderLines.menuItemId], references: [menuItems.id] }),
}));

export const menuItemsRelations = relations(menuItems, ({ one, many }) => ({
  venue: one(venues, { fields: [menuItems.venueId], references: [venues.id] }),
  category: one(menuCategories, { fields: [menuItems.categoryId], references: [menuCategories.id] }),
  buildSteps: many(buildSteps),
}));

export const buildStepsRelations = relations(buildSteps, ({ one }) => ({
  menuItem: one(menuItems, { fields: [buildSteps.menuItemId], references: [menuItems.id] }),
}));

export const serversRelations = relations(servers, ({ one, many }) => ({
  venue: one(venues, { fields: [servers.venueId], references: [venues.id] }),
  shifts: many(serverShifts),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, { fields: [payments.orderId], references: [orders.id] }),
  venue: one(venues, { fields: [payments.venueId], references: [venues.id] }),
}));

export const gamePlaysRelations = relations(gamePlays, ({ one }) => ({
  venue: one(venues, { fields: [gamePlays.venueId], references: [venues.id] }),
  table: one(tables, { fields: [gamePlays.tableId], references: [tables.id] }),
  game: one(games, { fields: [gamePlays.gameId], references: [games.id] }),
}));

export const serverShiftsRelations = relations(serverShifts, ({ one }) => ({
  server: one(servers, { fields: [serverShifts.serverId], references: [servers.id] }),
  venue: one(venues, { fields: [serverShifts.venueId], references: [venues.id] }),
}));

export const gamesRelations = relations(games, ({ many }) => ({
  plays: many(gamePlays),
}));

export const menuCategoriesRelations = relations(menuCategories, ({ one, many }) => ({
  venue: one(venues, { fields: [menuCategories.venueId], references: [venues.id] }),
  items: many(menuItems),
}));

export const tablesRelations = relations(tables, ({ one, many }) => ({
  venue: one(venues, { fields: [tables.venueId], references: [venues.id] }),
  orders: many(orders),
  gamePlays: many(gamePlays),
  alerts: many(alerts),
  auditEntries: many(auditLog),
}));

export const alertsRelations = relations(alerts, ({ one }) => ({
  venue: one(venues, { fields: [alerts.venueId], references: [venues.id] }),
  table: one(tables, { fields: [alerts.tableId], references: [tables.id] }),
}));

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  venue: one(venues, { fields: [auditLog.venueId], references: [venues.id] }),
  actorUser: one(users, { fields: [auditLog.actorUserId], references: [users.id] }),
  actorServer: one(servers, { fields: [auditLog.actorServerId], references: [servers.id] }),
  table: one(tables, { fields: [auditLog.tableId], references: [tables.id] }),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  venue: one(venues, { fields: [users.venueId], references: [venues.id] }),
  accounts: many(accounts),
  sessions: many(sessions),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));
