import 'dotenv/config';
import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL is not set');
    process.exit(1);
  }

  const sql = postgres(url, { max: 1 });
  const db = drizzle(sql);

  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('✓ migrations applied');
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
