import { db, menuItems, buildSteps } from '@hyperglow/db';
import { and, asc, eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { getMenuItemStats, getVenue } from '@/lib/queries';
import { getCategoriesForVenue } from '@/app/actions/menu-actions';
import { MenuItemEditor, type StepDraft } from '../../_components/menu-item-editor';
import { gbp, num, pct } from '@/lib/format';

export const dynamic = 'force-dynamic';

export default async function EditMenuItemPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string }>;
}) {
  const { id } = await params;
  const { created } = await searchParams;
  const venue = await getVenue();
  if (!venue) notFound();

  const [item] = await db
    .select()
    .from(menuItems)
    .where(and(eq(menuItems.id, id), eq(menuItems.venueId, venue.id)))
    .limit(1);
  if (!item) notFound();

  const [categories, steps, stats] = await Promise.all([
    getCategoriesForVenue(),
    db.select().from(buildSteps).where(eq(buildSteps.menuItemId, id)).orderBy(asc(buildSteps.stepIndex)),
    getMenuItemStats(id),
  ]);

  const initialSteps: StepDraft[] = steps.map((s) => ({
    uiId: s.id,
    question: s.question,
    subtitle: s.subtitle ?? '',
    options: s.options.map((o) => ({
      uiId: o.id,
      label: o.label,
      description: o.description ?? '',
      deltaPence: o.deltaPence,
      featured: !!o.featured,
      badge: o.badge ?? '',
    })),
  }));

  return (
    <div className="p-8 max-w-[1100px] space-y-2">
      <Link href="/menu" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={14} /> Back to menu
      </Link>

      {created ? (
        <div className="flex items-start gap-2 bg-oliveSoft border border-olive/30 text-olive text-sm px-3 py-2 rounded">
          <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
          <span>Item created. You can keep refining it below.</span>
        </div>
      ) : null}

      <MenuItemEditor
        mode="edit"
        menuItemId={item.id}
        categories={categories}
        initialSteps={initialSteps}
        defaults={{
          sku: item.sku,
          name: item.name,
          description: item.description,
          categoryId: item.categoryId,
          basePricePence: item.basePricePence,
          station: item.station,
          tint: item.tint,
          available: item.available,
          crossSell: item.crossSell,
          allergens: item.allergens,
          sortOrder: item.sortOrder,
          imageUrl: item.imageUrl,
        }}
        statsHeader={
          <>
            <h1 className="font-serif text-3xl text-ink mt-1">{item.name}</h1>
            <p className="text-sm text-muted mt-2">
              <span className="text-ink font-medium">{num(stats.ordersToday)}</span> order
              {stats.ordersToday === 1 ? '' : 's'} today ·{' '}
              <span className="text-ink font-medium">{gbp(stats.revenueTodayPence)}</span> revenue ·{' '}
              <span className="text-terraFg font-medium">{pct(stats.upsellConvPct, 0)}</span> upsell conv
            </p>
          </>
        }
      />
    </div>
  );
}
