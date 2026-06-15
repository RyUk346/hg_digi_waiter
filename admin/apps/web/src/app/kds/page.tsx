import type { Metadata } from 'next';
import { KdsApp } from './kds-app';

export const metadata: Metadata = {
  title: 'Kitchen · HyperGlow KDS',
};

/**
 * Standalone Kitchen Display System.
 *
 * NOT part of the admin — no sidebar, no admin login. The kitchen tablet
 * authenticates with a device token (devices table, kind='kitchen') and talks
 * directly to the device-api (REST + socket.io). Open on the pass display:
 *
 *   http://<host>/kds              → asks for the device token once
 *   http://<host>/kds?token=XXXX   → auto-connects and remembers the token
 */
export default function KdsPage() {
  return <KdsApp />;
}
