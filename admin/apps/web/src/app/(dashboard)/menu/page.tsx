import Link from 'next/link';
import Image from 'next/image';
import { db, menuItems, menuCategories, orderLines } from '@hyperglow/db';
import { and, asc, eq, isNull, isNotNull, sql } from 'drizzle-orm';
import { getVenue } from '@/lib/queries';
import { gbp2 } from '@/lib/format';
import { Plus, Pencil, ImageIcon, Archive } from 'lucide-react';
import { DeleteButton } from './_components/delete-button';
import { StockToggleInline } from './_components/stock-toggle-inline';
import { ViewTabs, type MenuView } from './_components/view-tabs';
import { RestoreButton } from './_components/restore-button';

export const dynamic = 'force-dynamic';

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const venue = await getVenue();
  if (!venue) return <Empty />;

  const params = await searchParams;
  const view: MenuView = params.view === 'archived' ? 'archived' : 'active';

  // Single aggregate query for both counts so the tabs are accurate
  const [counts] = await db
    .select({
      activeCount: sql<number>`sum(case when ${menuItems.deletedAt} is null then 1 else 0 end)::int`,
      archivedCount: sql<number>`sum(case when ${menuItems.deletedAt} is not null then 1 else 0 end)::int`,
    })
    .from(menuItems)
    .where(eq(menuItems.venueId, venue.id));

  const items = await db
    .select({
      id: menuItems.id,
      sku: menuItems.sku,
      name: menuItems.name,
      pricePence: menuItems.basePricePence,
      station: menuItems.station,
      available: menuItems.available,
      crossSell: menuItems.crossSell,
      allergens: menuItems.allergens,
      imageUrl: menuItems.imageUrl,
      deletedAt: menuItems.deletedAt,
      categoryName: menuCategories.name,
      orderCount: sql<number>`count(${orderLines.id})::int`,
    })
    .from(menuItems)
    .leftJoin(menuCategories, eq(menuItems.categoryId, menuCategories.id))
    .leftJoin(orderLines, eq(orderLines.menuItemId, menuItems.id))
    .where(
      and(
        eq(menuItems.venueId, venue.id),
        view === 'archived' ? isNotNull(menuItems.deletedAt) : isNull(menuItems.deletedAt),
      ),
    )
    .groupBy(menuItems.id, menuCategories.id)
    .orderBy(asc(menuCategories.sortOrder), asc(menuItems.sortOrder));

  const outOfStockCount = view === 'active' ? items.filter((i) => !i.available).length : 0;

  return (
    <div className="p-8 max-w-[1400px] space-y-6">
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted">Menu</p>
          <h2 className="text-3xl font-serif text-ink">
            {items.length} {view === 'archived' ? 'archived' : ''} item{items.length === 1 ? '' : 's'}
            {view === 'active' && outOfStockCount > 0 ? (
              <span className="text-sm font-sans text-red ml-2 font-normal">
                · {outOfStockCount} out of stock
              </span>
            ) : null}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <ViewTabs
            view={view}
            activeCount={counts?.activeCount ?? 0}
            archivedCount={counts?.archivedCount ?? 0}
          />
          {view === 'active' ? (
            <Link
              href="/menu/new"
              className="inline-flex items-center gap-2 bg-ink text-bg px-4 py-2 rounded font-medium hover:bg-text transition-colors"
            >
              <Plus size={16} strokeWidth={2} />
              Add item
            </Link>
          ) : null}
        </div>
      </header>

      {items.length === 0 ? (
        <div className="card text-center py-12">
          {view === 'archived' ? (
            <>
              <Archive size={28} className="mx-auto text-muted mb-2" strokeWidth={1.5} />
              <p className="text-ink font-medium">No archived items</p>
              <p className="text-sm text-muted mt-1">
                Items appear here when you delete a menu item that has historical orders.
              </p>
            </>
          ) : (
            <>
              <p className="text-muted">No menu items yet.</p>
              <Link href="/menu/new" className="text-terraFg text-sm mt-3 inline-block hover:underline">
                Create the first one →
              </Link>
            </>
          )}
        </div>
      ) : (
        <div className="card overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead className="bg-surface2 text-xs uppercase tracking-wide text-muted">
              <tr>
                <th className="text-left font-medium px-4 py-3 w-14"></th>
                <th className="text-left font-medium px-4 py-3">SKU</th>
                <th className="text-left font-medium px-4 py-3">Item</th>
                <th className="text-left font-medium px-4 py-3">Category</th>
                <th className="text-left font-medium px-4 py-3">Station</th>
                <th className="text-right font-medium px-4 py-3">Price</th>
                <th className="text-left font-medium px-4 py-3 w-44">
                  {view === 'archived' ? 'Archived' : 'Stock'}
                </th>
                <th className="text-left font-medium px-4 py-3">Tags</th>
                <th className="text-right font-medium px-4 py-3 w-32">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={[
                    'border-t border-border hover:bg-surface2/40',
                    view === 'archived' ? 'text-muted' : '',
                  ].join(' ')}
                >
                  <td className="px-4 py-2">
                    <div
                      className={[
                        'relative w-10 h-10 rounded overflow-hidden border border-border bg-surface2 flex items-center justify-center',
                        view === 'archived' ? 'opacity-60 grayscale' : '',
                      ].join(' ')}
                    >
                      {item.imageUrl ? (
                        <Image src={item.imageUrl} alt="" fill sizes="40px" className="object-cover" />
                      ) : (
                        <ImageIcon size={14} className="text-mutedSoft" strokeWidth={1.5} />
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-muted">{item.sku}</td>
                  <td className={['px-4 py-2', view === 'archived' ? 'text-text' : 'text-ink'].join(' ')}>
                    {item.name}
                  </td>
                  <td className="px-4 py-2 text-text">{item.categoryName ?? '—'}</td>
                  <td className="px-4 py-2 text-text capitalize">{item.station}</td>
                  <td className="px-4 py-2 text-right font-mono">{gbp2(item.pricePence)}</td>
                  <td className="px-4 py-2">
                    {view === 'archived' && item.deletedAt ? (
                      <ArchivedMeta deletedAt={item.deletedAt} orderCount={item.orderCount} />
                    ) : (
                      <StockToggleInline id={item.id} inStock={item.available} />
                    )}
                  </td>
                  <td className="px-4 py-2 space-x-1">
                    {item.crossSell ? (
                      <span className="pill bg-terraSoft text-terraFg">cross-sell</span>
                    ) : null}
                    {item.allergens.length > 0 ? (
                      <span className="pill bg-surface2 text-muted">
                        {item.allergens.length} allergen{item.allergens.length === 1 ? '' : 's'}
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end items-center gap-1">
                      {view === 'archived' ? (
                        <RestoreButton id={item.id} name={item.name} />
                      ) : (
                        <>
                          <Link
                            href={`/menu/${item.id}/edit`}
                            className="p-1.5 rounded text-muted hover:text-ink hover:bg-surface3 transition-colors"
                            aria-label={`Edit ${item.name}`}
                            title="Edit"
                          >
                            <Pencil size={14} strokeWidth={1.75} />
                          </Link>
                          <DeleteButton id={item.id} name={item.name} orderCount={item.orderCount} />
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {view === 'active' ? (
        <p className="text-xs text-muted">
          Click any <span className="text-olive font-medium">In stock</span> or{' '}
          <span className="text-red font-medium">Out of stock</span> chip to flip stock status without
          leaving the table. Changes reach the Order App within 2 seconds.
        </p>
      ) : (
        <p className="text-xs text-muted">
          Archived items are hidden from the Order App but their order history is preserved. Restored
          items come back as <span className="text-red font-medium">Out of stock</span> — you decide
          when they go live again.
        </p>
      )}
    </div>
  );
}

function ArchivedMeta({ deletedAt, orderCount }: { deletedAt: Date; orderCount: number }) {
  const days = Math.max(0, Math.floor((Date.now() - deletedAt.getTime()) / 86_400_000));
  const ago =
    days === 0 ? 'today' : days === 1 ? 'yesterday' : days < 30 ? `${days} days ago` : `${Math.floor(days / 30)} mo ago`;
  return (
    <div className="text-[11px] leading-tight">
      <p className="text-muted">{ago}</p>
      <p className="text-mutedSoft">
        {orderCount} past order{orderCount === 1 ? '' : 's'}
      </p>
    </div>
  );
}

function Empty() {
  return (
    <div className="p-10">
      <h1 className="text-2xl font-serif">No venue found</h1>
      <p className="text-muted mt-2">
        Run <code className="bg-surface2 px-2 py-0.5 rounded">pnpm db:seed</code>.
      </p>
    </div>
  );
}
