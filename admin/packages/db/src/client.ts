import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString =
  process.env.DATABASE_URL ?? 'postgres://hyperglow:hyperglow_dev@localhost:5432/hyperglow';

const globalForDb = globalThis as unknown as { __hgClient?: ReturnType<typeof postgres> };

const client =
  globalForDb.__hgClient ??
  postgres(connectionString, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== 'production') globalForDb.__hgClient = client;

export const db = drizzle(client, { schema });
export type Db = typeof db;
export { schema };
