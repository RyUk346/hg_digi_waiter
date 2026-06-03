// Installs Postgres LISTEN/NOTIFY triggers on hot tables.
// Run with: pnpm db:triggers
// Idempotent — safe to re-run after schema changes.

import 'dotenv/config';
import postgres from 'postgres';

const CHANNEL = 'hyperglow_events';
const WATCHED = ['orders', 'order_lines', 'payments', 'game_plays', 'alerts', 'menu_items', 'audit_log'];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }
  const sql = postgres(url, { max: 1 });

  // Notify function — emits {table, op, id, venueId}
  await sql.unsafe(`
    CREATE OR REPLACE FUNCTION hyperglow_notify_change()
    RETURNS trigger AS $$
    DECLARE
      payload jsonb;
      row_id  text;
      v_id    text;
    BEGIN
      IF (TG_OP = 'DELETE') THEN
        row_id := OLD.id::text;
        BEGIN
          v_id := OLD.venue_id::text;
        EXCEPTION WHEN undefined_column THEN
          v_id := NULL;
        END;
      ELSE
        row_id := NEW.id::text;
        BEGIN
          v_id := NEW.venue_id::text;
        EXCEPTION WHEN undefined_column THEN
          v_id := NULL;
        END;
      END IF;

      payload := jsonb_build_object(
        'table', TG_TABLE_NAME,
        'op', TG_OP,
        'id', row_id,
        'venueId', v_id,
        'ts', extract(epoch from now())
      );

      PERFORM pg_notify('${CHANNEL}', payload::text);
      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql;
  `);

  for (const table of WATCHED) {
    const trig = `hyperglow_notify_${table}`;
    await sql.unsafe(`DROP TRIGGER IF EXISTS ${trig} ON ${table};`);
    await sql.unsafe(`
      CREATE TRIGGER ${trig}
      AFTER INSERT OR UPDATE OR DELETE ON ${table}
      FOR EACH ROW EXECUTE FUNCTION hyperglow_notify_change();
    `);
    console.log(`✓ trigger installed on ${table}`);
  }

  await sql.end();
  console.log(`\n✓ listening channel: ${CHANNEL}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
