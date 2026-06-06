'use client';

import Link from 'next/link';
import type { Route } from 'next';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  BarChart3,
  Gamepad2,
  TrendingUp,
  Activity,
  Users,
  BookOpen,
  ShieldCheck,
  Settings,
  LogOut,
} from 'lucide-react';
import { logoutAction } from '@/app/actions/auth-actions';
import { PERMISSIONS, type Permission } from '@/lib/permissions';

interface NavItem {
  href: Route;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: string;
  permission: Permission;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Performance',
    items: [
      { href: '/overview', label: 'Dashboard', icon: LayoutDashboard, permission: PERMISSIONS.OVERVIEW_READ },
      { href: '/revenue', label: 'Revenue', icon: BarChart3, permission: PERMISSIONS.REVENUE_READ },
      { href: '/games', label: 'Games', icon: Gamepad2, badge: 'NEW', permission: PERMISSIONS.GAMES_READ },
      { href: '/upsell', label: 'Upsell engine', icon: TrendingUp, permission: PERMISSIONS.UPSELL_READ },
    ],
  },
  {
    label: 'Operations',
    items: [
      { href: '/alerts', label: 'Service', icon: Activity, permission: PERMISSIONS.ALERTS_READ },
      { href: '/servers', label: 'Team', icon: Users, permission: PERMISSIONS.SERVERS_READ },
      { href: '/menu', label: 'Menu & pricing', icon: BookOpen, permission: PERMISSIONS.MENU_READ },
    ],
  },
  {
    label: 'Governance',
    items: [
      { href: '/compliance', label: 'Compliance', icon: ShieldCheck, permission: PERMISSIONS.COMPLIANCE_READ },
      { href: '/settings', label: 'Settings', icon: Settings, permission: PERMISSIONS.SETTINGS_READ },
    ],
  },
];

export function Sidebar({
  venueName,
  tableCount,
  userName,
  userRole,
  allowedPermissions,
}: {
  venueName: string;
  tableCount: number;
  userName: string;
  userRole: string;
  /** Permissions the current user has — used to filter nav items. */
  allowedPermissions: readonly Permission[];
}) {
  const allowed = new Set(allowedPermissions);
  const visibleGroups = NAV_GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((i) => allowed.has(i.permission)),
  })).filter((g) => g.items.length > 0);

  const pathname = usePathname();
  const initials = userName
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <aside className="w-60 shrink-0 bg-sb-bg text-sb-text h-screen flex flex-col sticky top-0">
      {/* Brand */}
      <div className="px-5 pt-5 pb-4 border-b border-sb-border">
        <h1 className="text-[22px] font-serif text-sb-text leading-none">{firstWord(venueName)}</h1>
        <p className="text-[10px] uppercase tracking-[0.18em] text-sb-textSoft mt-1.5">
          Admin Portal
        </p>
        <p className="text-[11px] text-sb-textMuted mt-3">
          Powered by <span className="text-terra font-medium tracking-wide">HYPERGLOW</span>
        </p>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto">
        {visibleGroups.map((group) => (
          <div key={group.label} className="mb-5">
            <p className="px-3 mb-1.5 text-[10px] uppercase tracking-[0.16em] text-sb-textSoft font-medium">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon;
                const active =
                  pathname === item.href || pathname.startsWith(item.href + '/');
                const badge = (item as { badge?: string }).badge;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        'flex items-center gap-3 px-3 py-2 rounded text-[13px] transition-colors',
                        active
                          ? 'bg-terra/15 text-terra font-medium'
                          : 'text-sb-text hover:bg-white/[0.04]',
                      ].join(' ')}
                    >
                      <Icon size={15} strokeWidth={1.75} />
                      <span className="flex-1">{item.label}</span>
                      {badge ? (
                        <span className="text-[9px] font-semibold tracking-wider bg-terra text-bg px-1.5 py-0.5 rounded">
                          {badge}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer cards */}
      <div className="p-3 space-y-2 border-t border-sb-border">
        <div className="bg-sb-bg2 rounded p-3 text-[11px] leading-snug">
          <p className="flex items-center gap-1.5 text-sb-text font-medium mb-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-olive animate-pulse-slow" />
            {venueName}
          </p>
          <p className="text-sb-textMuted">{tableCount} tables · open until 23:30</p>
        </div>
        <div className="bg-sb-bg2 rounded p-3 flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full bg-terraSoft text-terraFg flex items-center justify-center text-[12px] font-semibold">
            {initials}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] text-sb-text font-medium truncate">{userName}</p>
            <p className="text-[10px] text-sb-textMuted truncate">{userRole}</p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              aria-label="Sign out"
              className="text-sb-textMuted hover:text-sb-text p-1 rounded transition-colors"
              title="Sign out"
            >
              <LogOut size={14} strokeWidth={1.75} />
            </button>
          </form>
        </div>
      </div>
    </aside>
  );
}

function firstWord(s: string) {
  return s.split(/\s+/)[0] ?? s;
}
