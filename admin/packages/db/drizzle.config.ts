import 'dotenv/config';
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL ?? 'postgres://hyperglow:hyperglow_dev@localhost:5432/hyperglow',
  },
  verbose: true,
  strict: true,
});
