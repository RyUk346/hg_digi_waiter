import 'server-only';
import { auth } from '@/auth';
import { forbidden, unauthorized } from './http-errors';
import {
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  roleLabel,
  type Permission,
  type Role,
} from './permissions';

/**
 * Server-only RBAC helpers. Imports the public constants from ./permissions,
 * and adds session-aware helpers that need DB + auth access.
 *
 * Client components must import from `./permissions` directly — importing
 * from this file in a client component throws at build time due to the
 * `server-only` import.
 */

// Re-export the public surface so existing imports of @/lib/rbac keep working.
export { PERMISSIONS, ROLE_PERMISSIONS, hasPermission, roleLabel };
export type { Permission, Role };

export interface SessionUser {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  venueId: string | null;
}

/**
 * Read the current session and return a typed view of the user. Returns null
 * for unauthenticated requests — callers should redirect to /login.
 */
export async function getCurrentUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user) return null;
  const u = session.user as {
    id?: string;
    email?: string | null;
    name?: string | null;
    role?: string;
    venueId?: string | null;
  };
  if (!u.id || !u.email) return null;
  return {
    id: u.id,
    email: u.email,
    name: u.name ?? null,
    role: (u.role as Role) ?? 'staff',
    venueId: u.venueId ?? null,
  };
}

/**
 * Throws if the current user lacks the permission.
 * - Unauthenticated → redirect to /login
 * - Lacks permission → redirect to /403
 */
export async function requirePermission(perm: Permission): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) unauthorized();
  if (!hasPermission(user.role, perm)) {
    forbidden({ requiredPermission: perm, role: user.role });
  }
  return user;
}

/**
 * Returns the current user, but only if they belong to the given venue.
 * Defence against cross-venue tampering (e.g. crafted URL with another venue's id).
 */
export async function requireVenueAccess(venueId: string): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) unauthorized();
  if (user.venueId !== venueId) {
    forbidden({ reason: 'cross-venue access denied' });
  }
  return user;
}
