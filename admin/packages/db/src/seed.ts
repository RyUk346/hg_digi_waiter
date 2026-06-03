import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is not set');
  process.exit(1);
}

const sql = postgres(url, { max: 1 });
const db = drizzle(sql, { schema });

const adminEmail = process.env.SEED_ADMIN_EMAIL ?? 'anton@tavola.test';
const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'tavola';
const adminName = process.env.SEED_ADMIN_NAME ?? 'Anton Joseph';

const pence = (gbp: number) => Math.round(gbp * 100);

async function main() {
  console.log('→ Seeding HyperGlow / Tavola data');

  // 1. Wipe (idempotent reseed)
  await sql.unsafe(`TRUNCATE
    game_plays, payments, order_lines, orders,
    server_shifts, servers,
    build_steps, menu_items, menu_categories,
    alerts, audit_log,
    tables, games,
    accounts, sessions, verification_tokens, users,
    venues
    RESTART IDENTITY CASCADE`);

  // 2. Venue: Tavola Soho
  const [venue] = await db
    .insert(schema.venues)
    .values({
      name: 'Tavola Soho',
      slug: 'tavola-soho',
      city: 'London',
      timezone: 'Europe/London',
      currency: 'GBP',
      recoveryBudgetPence: pence(200),
    })
    .returning();
  if (!venue) throw new Error('venue insert failed');

  // 3. Admin user
  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await db.insert(schema.users).values({
    email: adminEmail,
    name: adminName,
    role: 'admin',
    venueId: venue.id,
    passwordHash,
    emailVerified: new Date(),
  });

  // 4. Tables
  const tablesData = Array.from({ length: 12 }, (_, i) => ({
    venueId: venue.id,
    label: String(i + 1),
    seats: i < 4 ? 2 : i < 8 ? 4 : 6,
    section: i < 6 ? 'window' : 'rear',
    currentPhase: 'pre_order' as const,
  }));
  const insertedTables = await db.insert(schema.tables).values(tablesData).returning();

  // 5. Servers — HANDOVER §7 leaderboard
  const serverRows = [
    { name: 'Sofia Ricci', covers: 124, revenue: pence(4820), upsellAccepted: 51, upsellAttempts: 124 },
    { name: 'Aisha Patel', covers: 108, revenue: pence(4142), upsellAccepted: 41, upsellAttempts: 108 },
    { name: 'Diego Romano', covers: 96, revenue: pence(3664), upsellAccepted: 33, upsellAttempts: 96 },
    { name: 'Mia Chen', covers: 78, revenue: pence(2964), upsellAccepted: 24, upsellAttempts: 78 },
    { name: 'Marcus Holloway', covers: 72, revenue: pence(2484), upsellAccepted: 16, upsellAttempts: 72 },
  ];
  const insertedServers = await db
    .insert(schema.servers)
    .values(serverRows.map((s) => ({ venueId: venue.id, name: s.name })))
    .returning();

  // Server shifts (this week aggregate, single row per server for simplicity)
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 7);
  await db.insert(schema.serverShifts).values(
    insertedServers.map((s, i) => ({
      serverId: s.id,
      venueId: venue.id,
      startedAt: weekStart,
      endedAt: new Date(),
      covers: serverRows[i]!.covers,
      upsellAttemptCount: serverRows[i]!.upsellAttempts,
      upsellAcceptedCount: serverRows[i]!.upsellAccepted,
      revenuePence: serverRows[i]!.revenue,
    })),
  );

  // 6. Menu categories
  const [catStarters, catMains, catDesserts, catDrinks] = await db
    .insert(schema.menuCategories)
    .values([
      { venueId: venue.id, name: 'Starters', sortOrder: 1 },
      { venueId: venue.id, name: 'Mains', sortOrder: 2 },
      { venueId: venue.id, name: 'Desserts', sortOrder: 3 },
      { venueId: venue.id, name: 'Drinks', sortOrder: 4 },
    ])
    .returning();

  // 7. Menu items + build sequences (HANDOVER §7)
  const items = await db
    .insert(schema.menuItems)
    .values([
      // Starters
      { venueId: venue.id, categoryId: catStarters!.id, sku: 'burrata', name: 'Burrata', basePricePence: pence(12.5), station: 'cold', crossSell: true, sortOrder: 1, allergens: ['milk'] },
      { venueId: venue.id, categoryId: catStarters!.id, sku: 'bruschetta', name: 'Bruschetta', basePricePence: pence(7), station: 'cold', crossSell: true, sortOrder: 2, allergens: ['gluten'] },
      { venueId: venue.id, categoryId: catStarters!.id, sku: 'calamari', name: 'Calamari', basePricePence: pence(10), station: 'cold', sortOrder: 3, allergens: ['gluten', 'molluscs'] },
      // Mains
      { venueId: venue.id, categoryId: catMains!.id, sku: 'tavola-burger', name: 'The Tavola burger', basePricePence: pence(12), station: 'grill', tint: 'amber', sortOrder: 1, allergens: ['gluten', 'milk'] },
      { venueId: venue.id, categoryId: catMains!.id, sku: 'pizza-margherita', name: 'Pizza Margherita', basePricePence: pence(14), station: 'pizza', tint: 'rose', sortOrder: 2, allergens: ['gluten', 'milk'] },
      { venueId: venue.id, categoryId: catMains!.id, sku: 'truffle-risotto', name: 'Truffle risotto', basePricePence: pence(18), station: 'pasta', sortOrder: 3, allergens: ['milk'] },
      { venueId: venue.id, categoryId: catMains!.id, sku: 'ribeye-250', name: 'Ribeye 250g', basePricePence: pence(28), station: 'grill', sortOrder: 4 },
      // Desserts
      { venueId: venue.id, categoryId: catDesserts!.id, sku: 'tiramisu', name: 'Tiramisu', basePricePence: pence(8), station: 'dessert', crossSell: true, sortOrder: 1, allergens: ['gluten', 'milk', 'egg'] },
      { venueId: venue.id, categoryId: catDesserts!.id, sku: 'fondant', name: 'Chocolate fondant', basePricePence: pence(9), station: 'dessert', sortOrder: 2, allergens: ['gluten', 'milk', 'egg'] },
      // Drinks
      { venueId: venue.id, categoryId: catDrinks!.id, sku: 'house-red', name: 'Sangiovese', basePricePence: pence(8.5), station: 'bar', crossSell: true, sortOrder: 1 },
      { venueId: venue.id, categoryId: catDrinks!.id, sku: 'ipa', name: 'IPA', basePricePence: pence(6), station: 'bar', crossSell: true, sortOrder: 2 },
      { venueId: venue.id, categoryId: catDrinks!.id, sku: 'espresso', name: 'Espresso', basePricePence: pence(3), station: 'bar', sortOrder: 3 },
    ])
    .returning();

  const burger = items.find((i) => i.sku === 'tavola-burger')!;
  const pizza = items.find((i) => i.sku === 'pizza-margherita')!;

  // Build sequences
  await db.insert(schema.buildSteps).values([
    {
      menuItemId: burger.id,
      stepIndex: 0,
      question: 'Make it a double?',
      subtitle: 'A second patty turns this into a proper hand-burner.',
      options: [
        {
          id: 'double',
          label: 'Yes, double it up',
          description: 'Two patties, two slices of cheese',
          deltaPence: pence(2),
          featured: true,
          badge: 'Most popular',
        },
        {
          id: 'single',
          label: 'Keep it a single',
          description: 'One patty, plenty of flavour',
          deltaPence: 0,
        },
      ],
    },
    {
      menuItemId: burger.id,
      stepIndex: 1,
      question: 'Make it a meal?',
      subtitle: 'Triple-cooked chips and a soft drink, on the side.',
      options: [
        {
          id: 'meal',
          label: 'Add chips and a drink',
          description: 'Triple-cooked chips · drink',
          deltaPence: pence(3.5),
          featured: true,
          badge: 'Best value',
        },
        {
          id: 'no-meal',
          label: 'Just the burger',
          description: 'You can always add sides later',
          deltaPence: 0,
        },
      ],
    },
    {
      menuItemId: burger.id,
      stepIndex: 2,
      question: 'Finish with our signature sauce?',
      subtitle: 'House truffle aioli served on the side.',
      options: [
        {
          id: 'aioli',
          label: 'Truffle aioli on the side',
          description: 'Black truffle, garlic confit',
          deltaPence: pence(0.5),
          featured: true,
          badge: "Chef's pick",
        },
        {
          id: 'no-aioli',
          label: 'No sauce, thank you',
          description: 'Burger comes ready to eat',
          deltaPence: 0,
        },
      ],
    },
    {
      menuItemId: pizza.id,
      stepIndex: 0,
      question: 'Go for the 14-inch?',
      subtitle: 'Same toppings, more pizza.',
      options: [
        {
          id: '14-inch',
          label: 'Yes, 14-inch',
          description: 'Two extra slices to share',
          deltaPence: pence(4),
          featured: true,
          badge: 'Most popular',
        },
        {
          id: '12-inch',
          label: 'Keep 12-inch',
          description: 'Perfect for one',
          deltaPence: 0,
        },
      ],
    },
    {
      menuItemId: pizza.id,
      stepIndex: 1,
      question: 'Add burrata?',
      subtitle: 'Creamy Puglian burrata, torn over the top.',
      options: [
        {
          id: 'burrata',
          label: 'Yes, burrata',
          description: 'Puglian burrata · torn over the top',
          deltaPence: pence(3.5),
          featured: true,
          badge: "Chef's pick",
        },
        {
          id: 'no-burrata',
          label: 'Keep it classic',
          description: 'Just the Margherita',
          deltaPence: 0,
        },
      ],
    },
  ]);

  // 8. Games (HANDOVER §7)
  const insertedGames = await db
    .insert(schema.games)
    .values([
      { slug: 'italian-trivia', name: 'Italian trivia', durationSeconds: 90, pricePence: pence(2), featured: true, hyperglowRevenueShareBps: 8000 },
      { slug: 'couples-quiz', name: "Couple's quiz", durationSeconds: 300, pricePence: pence(2), hyperglowRevenueShareBps: 8000 },
      { slug: 'word-puzzles', name: 'Italian word puzzles', durationSeconds: 180, pricePence: pence(2), hyperglowRevenueShareBps: 8000 },
      { slug: 'spot-the-difference', name: 'Spot the difference', durationSeconds: 120, pricePence: pence(2), hyperglowRevenueShareBps: 8000 },
    ])
    .returning();

  // 9. Orders + payments + game plays — synthesise the last 14 days of activity
  const now = Date.now();
  const burgerItem = items.find((i) => i.sku === 'tavola-burger')!;
  const pizzaItem = items.find((i) => i.sku === 'pizza-margherita')!;
  const risottoItem = items.find((i) => i.sku === 'truffle-risotto')!;
  const ribeye = items.find((i) => i.sku === 'ribeye-250')!;
  const tiramisuItem = items.find((i) => i.sku === 'tiramisu')!;
  const houseRed = items.find((i) => i.sku === 'house-red')!;
  const ipa = items.find((i) => i.sku === 'ipa')!;

  const mainPool = [burgerItem, pizzaItem, risottoItem, ribeye];
  const drinkPool = [houseRed, ipa];

  for (let day = 13; day >= 0; day--) {
    const baseDay = new Date(now - day * 86_400_000);
    const ordersToday = 18 + Math.floor(Math.random() * 12); // 18-30
    for (let i = 0; i < ordersToday; i++) {
      const placedAt = new Date(baseDay);
      placedAt.setHours(17 + Math.floor(Math.random() * 5), Math.floor(Math.random() * 60));
      const tableRow = insertedTables[Math.floor(Math.random() * insertedTables.length)]!;
      const serverRow = insertedServers[Math.floor(Math.random() * insertedServers.length)]!;
      const main = mainPool[Math.floor(Math.random() * mainPool.length)]!;
      const drink = drinkPool[Math.floor(Math.random() * drinkPool.length)]!;
      const wantsDessert = Math.random() < 0.45;

      const upsellDelta = main.sku === 'tavola-burger' && Math.random() < 0.55 ? pence(2 + 3.5) : main.sku === 'pizza-margherita' && Math.random() < 0.45 ? pence(4) : 0;
      const mainLinePrice = main.basePricePence + upsellDelta;
      const drinkLinePrice = drink.basePricePence;
      const dessertLinePrice = wantsDessert ? tiramisuItem.basePricePence : 0;
      const subtotal = mainLinePrice + drinkLinePrice + dessertLinePrice;

      const [order] = await db
        .insert(schema.orders)
        .values({
          venueId: venue.id,
          tableId: tableRow.id,
          serverId: serverRow.id,
          status: 'paid',
          coverCount: 2,
          subtotalPence: subtotal,
          totalPence: subtotal,
          placedAt,
          closedAt: new Date(placedAt.getTime() + 75 * 60 * 1000),
        })
        .returning();
      if (!order) continue;

      await db.insert(schema.orderLines).values([
        {
          orderId: order.id,
          menuItemId: main.id,
          quantity: 1,
          basePricePence: main.basePricePence,
          upsellDeltaPence: upsellDelta,
          linePricePence: mainLinePrice,
          bumpedAt: new Date(placedAt.getTime() + 22 * 60 * 1000),
        },
        {
          orderId: order.id,
          menuItemId: drink.id,
          quantity: 1,
          basePricePence: drink.basePricePence,
          upsellDeltaPence: 0,
          linePricePence: drinkLinePrice,
          bumpedAt: new Date(placedAt.getTime() + 8 * 60 * 1000),
        },
        ...(wantsDessert
          ? [
              {
                orderId: order.id,
                menuItemId: tiramisuItem.id,
                quantity: 1,
                basePricePence: tiramisuItem.basePricePence,
                upsellDeltaPence: 0,
                linePricePence: dessertLinePrice,
                bumpedAt: new Date(placedAt.getTime() + 55 * 60 * 1000),
              },
            ]
          : []),
      ]);

      await db.insert(schema.payments).values({
        orderId: order.id,
        venueId: venue.id,
        amountPence: subtotal,
        tipPence: Math.round(subtotal * 0.1),
        method: 'card_terminal',
        status: 'succeeded',
        paidAt: new Date(placedAt.getTime() + 85 * 60 * 1000),
      });

      // games during waiting (~35% of tables)
      if (Math.random() < 0.35) {
        const playCount = Math.random() < 0.4 ? 2 : 1; // replay rate
        for (let p = 0; p < playCount; p++) {
          const game = insertedGames[Math.floor(Math.random() * insertedGames.length)]!;
          await db.insert(schema.gamePlays).values({
            venueId: venue.id,
            tableId: tableRow.id,
            gameId: game.id,
            pricePence: game.pricePence,
            hyperglowShareBps: game.hyperglowRevenueShareBps,
            completed: Math.random() < 0.85,
            score: Math.floor(Math.random() * 100),
            playedAt: new Date(placedAt.getTime() + (15 + p * 4) * 60 * 1000),
          });
        }
      }
    }
  }

  // 10. Sample alerts (HANDOVER §7)
  await db.insert(schema.alerts).values([
    { venueId: venue.id, tableId: insertedTables[6]!.id, severity: 'critical', title: 'Sentiment alert · Table 7', body: 'Silent 18 min after starters delivered.' },
    { venueId: venue.id, tableId: insertedTables[7]!.id, severity: 'celebration', title: 'Birthday booking · Table 8', body: "Eleanor's 30th, party of 4." },
    { venueId: venue.id, severity: 'warning', title: 'Marcus upsell drop', body: '15% drop this hour, £42/hr lost.' },
    { venueId: venue.id, tableId: insertedTables[3]!.id, severity: 'info', title: 'Service recovery · Table 4', body: 'Wait 24min, VIP, £14 spritz suggestion.' },
    { venueId: venue.id, tableId: insertedTables[11]!.id, severity: 'critical', title: 'Allergen confirmed · Table 12', body: 'Nut allergy, chain complete.' },
    { venueId: venue.id, severity: 'warning', title: 'Kitchen pacing', body: 'Grill heavy, slow 15min.' },
  ]);

  // 11. Audit log examples
  await db.insert(schema.auditLog).values([
    {
      venueId: venue.id,
      tableId: insertedTables[3]!.id,
      action: 'recovery_spend',
      amountPence: pence(14),
      details: { reason: 'VIP wait recovery', drink: 'Aperol spritz' },
    },
    {
      venueId: venue.id,
      tableId: insertedTables[11]!.id,
      action: 'allergen_signoff',
      details: { allergen: 'tree-nuts', verifiedBy: 'kitchen+manager' },
    },
  ]);

  console.log('✓ seeded venue:', venue.name);
  console.log('✓ admin user:', adminEmail, '/ password:', adminPassword);
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
