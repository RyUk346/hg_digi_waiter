import Link from 'next/link';
import type { Route } from 'next';

export function SectionHead({
  eyebrow,
  title,
  sub,
  link,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  link?: { href: Route; label: string };
}) {
  return (
    <header className="flex items-end justify-between gap-6 mb-4">
      <div>
        <p className="text-[11px] uppercase tracking-[0.12em] text-terraFg font-medium">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-serif text-ink mt-1 leading-tight">{title}</h2>
        {sub ? <p className="text-sm italic text-muted mt-1">{sub}</p> : null}
      </div>
      {link ? (
        <Link
          href={link.href}
          className="text-sm text-terraFg hover:text-terra transition-colors whitespace-nowrap"
        >
          {link.label} →
        </Link>
      ) : null}
    </header>
  );
}
