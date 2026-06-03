import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getCategoriesForVenue } from '@/app/actions/menu-actions';
import { MenuItemEditor } from '../_components/menu-item-editor';

export const dynamic = 'force-dynamic';

export default async function NewMenuItemPage() {
  const categories = await getCategoriesForVenue();

  return (
    <div className="p-8 max-w-[1100px] space-y-2">
      <Link href="/menu" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft size={14} /> Back to menu
      </Link>
      <MenuItemEditor
        mode="create"
        categories={categories}
        statsHeader={
          <>
            <h1 className="font-serif text-3xl text-ink mt-1">Add a new item</h1>
            <p className="text-sm text-muted mt-2">
              Fill out the basic info and (optionally) the upsell sequence. Everything saves in one go.
            </p>
          </>
        }
      />
    </div>
  );
}
