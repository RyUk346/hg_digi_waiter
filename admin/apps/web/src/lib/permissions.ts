/**
 * Permission constants + role map.
 *
 * Client-safe: no `server-only` import, no DB or auth dependencies. Both
 * client components (sidebar nav filtering) and server code (action gating)
 * import from here. The server-side helpers live in `./rbac.ts`.
 */

export type Role = 'admin' | 'manager' | 'staff';

export const PERMISSIONS = {
  // Menu
  MENU_READ: 'menu.read',
  MENU_WRITE: 'menu.write',
  MENU_DELETE: 'menu.delete',
  MENU_TOGGLE_STOCK: 'menu.stock',
  // Reports / dashboards
  OVERVIEW_READ: 'overview.read',
  REVENUE_READ: 'revenue.read',
  GAMES_READ: 'games.read',
  UPSELL_READ: 'upsell.read',
  // Ops
  ALERTS_READ: 'alerts.read',
  ALERTS_RESOLVE: 'alerts.resolve',
  SERVERS_READ: 'servers.read',
  SERVERS_WRITE: 'servers.write',
  // Compliance
  COMPLIANCE_READ: 'compliance.read',
  COMPLIANCE_EXPORT: 'compliance.export',
  COMPLIANCE_GDPR: 'compliance.gdpr',
  // Settings
  SETTINGS_READ: 'settings.read',
  SETTINGS_WRITE: 'settings.write',
  // Users + venues
  USERS_MANAGE: 'users.manage',
  VENUES_MANAGE: 'venues.manage',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

const MANAGER_PERMISSIONS: Permission[] = [
  PERMISSIONS.MENU_READ,
  PERMISSIONS.MENU_WRITE,
  PERMISSIONS.MENU_TOGGLE_STOCK,
  PERMISSIONS.OVERVIEW_READ,
  PERMISSIONS.REVENUE_READ,
  PERMISSIONS.GAMES_READ,
  PERMISSIONS.UPSELL_READ,
  PERMISSIONS.ALERTS_READ,
  PERMISSIONS.ALERTS_RESOLVE,
  PERMISSIONS.SERVERS_READ,
  PERMISSIONS.COMPLIANCE_READ,
  PERMISSIONS.SETTINGS_READ,
];

export const ROLE_PERMISSIONS: Record<Role, ReadonlyArray<Permission>> = {
  admin: ALL_PERMISSIONS,
  manager: MANAGER_PERMISSIONS,
  staff: [],
};

const ROLE_LABELS: Record<Role, string> = {
  admin: 'Administrator',
  manager: 'Manager',
  staff: 'Staff',
};

export function roleLabel(role: string | null | undefined): string {
  if (!role) return 'Guest';
  return ROLE_LABELS[role as Role] ?? role;
}

export function hasPermission(role: string | null | undefined, perm: Permission): boolean {
  if (!role) return false;
  const perms = ROLE_PERMISSIONS[role as Role];
  if (!perms) return false;
  return perms.includes(perm);
}
