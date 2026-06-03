import Link from 'next/link';

export type MenuView = 'active' | 'archived';

export function ViewTabs({
  view,
  activeCount,
  archivedCount,
}: {
  view: MenuView;
  activeCount: number;
  archivedCount: number;
}) {
  return (
    <div className="inline-flex bg-surface2 p-0.5 rounded-md text-sm">
      <Tab href="/menu?view=active" active={view === 'active'} label="Active" count={activeCount} />
      <Tab
        href="/menu?view=archived"
        active={view === 'archived'}
        label="Archived"
        count={archivedCount}
        muted
      />
    </div>
  );
}

function Tab({
  href,
  active,
  label,
  count,
  muted,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
  muted?: boolean;
}) {
  return (
    <Link
      href={href as never}
      className={[
        'px-3 py-1.5 rounded inline-flex items-center gap-2 transition-colors',
        active
          ? 'bg-ink text-bg'
          : muted
            ? 'text-muted hover:text-ink'
            : 'text-text hover:text-ink',
      ].join(' ')}
    >
      {label}
      <span
        className={[
          'text-[10px] font-mono px-1.5 py-0.5 rounded',
          active ? 'bg-bg/15' : 'bg-surface3 text-muted',
        ].join(' ')}
      >
        {count}
      </span>
    </Link>
  );
}
