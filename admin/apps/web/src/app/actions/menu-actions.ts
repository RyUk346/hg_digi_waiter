'use server';

import { writeFile, mkdir, unlink } from 'node:fs/promises';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { db, menuItems, menuCategories, buildSteps, orderLines } from '@hyperglow/db';
import { and, eq, sql } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { auth } from '@/auth';
import { getVenue } from '@/lib/queries';
import { PERMISSIONS, type Permission, requirePermission } from '@/lib/rbac';

const STATIONS = ['grill', 'pasta', 'pizza', 'cold', 'dessert', 'bar'] as const;
const TINTS = ['', 'amber', 'rose', 'olive', 'blue', 'purple'] as const;

const itemSchema = z.object({
  sku: z.string().trim().min(1, 'SKU is required').max(64),
  name: z.string().trim().min(1, 'Name is required').max(120),
  description: z.string().trim().max(500).optional().or(z.literal('')).transform((v) => v || null),
  categoryId: z.string().uuid().or(z.literal('')).transform((v) => v || null),
  basePriceGbp: z.coerce.number().min(0).max(9999),
  station: z.enum(STATIONS),
  tint: z.enum(TINTS).transform((v) => v || null),
  available: z.coerce.boolean(),
  crossSell: z.coerce.boolean(),
  allergens: z.string().optional().transform((v) =>
    v ? v.split(',').map((s) => s.trim()).filter(Boolean) : [],
  ),
  sortOrder: z.coerce.number().int().min(0).max(9999).default(0),
  imageUrl: z
    .string()
    .max(500)
    .optional()
    .or(z.literal(''))
    .transform((v) => (v ? v : null)),
});

export type MenuItemFormState =
  | { ok: true }
  | { ok: false; errors: Record<string, string>; values: Record<string, string> };

async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect('/login');
  const venue = await getVenue();
  if (!venue) throw new Error('No venue. Run pnpm db:seed.');
  return { session, venue };
}

/**
 * Combines `requirePermission(perm)` with venue lookup for the user's branch.
 * Use this at the top of every Server Action that mutates data.
 */
async function requirePerm(perm: Permission) {
  const user = await requirePermission(perm);
  const venue = await getVenue();
  if (!venue) throw new Error('No venue. Run pnpm db:seed.');
  return { user, venue };
}

function parse(formData: FormData) {
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  return {
    raw,
    parsed: itemSchema.safeParse({
      sku: raw.sku,
      name: raw.name,
      description: raw.description,
      categoryId: raw.categoryId,
      basePriceGbp: raw.basePriceGbp,
      station: raw.station,
      tint: raw.tint ?? '',
      available: raw.available === 'on',
      crossSell: raw.crossSell === 'on',
      allergens: raw.allergens,
      sortOrder: raw.sortOrder || '0',
      imageUrl: raw.imageUrl,
    }),
  };
}

function flattenErrors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path[0]?.toString() ?? '_';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

export async function createMenuItem(_prev: MenuItemFormState, formData: FormData): Promise<MenuItemFormState> {
  const { venue } = await requirePerm(PERMISSIONS.MENU_WRITE);
  const { raw, parsed } = parse(formData);
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error), values: raw };

  const data = parsed.data;
  try {
    await db.insert(menuItems).values({
      venueId: venue.id,
      sku: data.sku,
      name: data.name,
      description: data.description,
      categoryId: data.categoryId,
      basePricePence: Math.round(data.basePriceGbp * 100),
      station: data.station,
      tint: data.tint,
      available: data.available,
      crossSell: data.crossSell,
      allergens: data.allergens,
      sortOrder: data.sortOrder,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Insert failed';
    if (message.includes('menu_items_venue_sku_idx')) {
      return { ok: false, errors: { sku: 'A menu item with this SKU already exists.' }, values: raw };
    }
    return { ok: false, errors: { _: message }, values: raw };
  }

  revalidatePath('/menu');
  redirect('/menu');
}

export async function updateMenuItem(
  id: string,
  _prev: MenuItemFormState,
  formData: FormData,
): Promise<MenuItemFormState> {
  const { venue } = await requirePerm(PERMISSIONS.MENU_WRITE);
  const { raw, parsed } = parse(formData);
  if (!parsed.success) return { ok: false, errors: flattenErrors(parsed.error), values: raw };

  const data = parsed.data;
  try {
    await db
      .update(menuItems)
      .set({
        sku: data.sku,
        name: data.name,
        description: data.description,
        categoryId: data.categoryId,
        basePricePence: Math.round(data.basePriceGbp * 100),
        station: data.station,
        tint: data.tint,
        available: data.available,
        crossSell: data.crossSell,
        allergens: data.allergens,
        sortOrder: data.sortOrder,
      })
      .where(and(eq(menuItems.id, id), eq(menuItems.venueId, venue.id)));
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Update failed';
    if (message.includes('menu_items_venue_sku_idx')) {
      return { ok: false, errors: { sku: 'A menu item with this SKU already exists.' }, values: raw };
    }
    return { ok: false, errors: { _: message }, values: raw };
  }

  revalidatePath('/menu');
  revalidatePath(`/menu/${id}/edit`);
  redirect('/menu');
}

export type RestoreResult = { ok: true; name: string } | { ok: false; error: string };

/**
 * Bring an archived item back to the menu.
 * Restored items return as Out of stock so the operator makes a deliberate
 * decision before they go live to guests.
 */
export async function restoreMenuItem(id: string): Promise<RestoreResult> {
  const { venue } = await requirePerm(PERMISSIONS.MENU_DELETE);
  const [item] = await db
    .select({ name: menuItems.name })
    .from(menuItems)
    .where(and(eq(menuItems.id, id), eq(menuItems.venueId, venue.id)))
    .limit(1);
  if (!item) return { ok: false, error: 'Item not found.' };
  await db
    .update(menuItems)
    .set({ deletedAt: null, available: false })
    .where(and(eq(menuItems.id, id), eq(menuItems.venueId, venue.id)));
  revalidatePath('/menu');
  revalidatePath('/overview');
  return { ok: true, name: item.name };
}

export type DeleteResult =
  | { ok: true; mode: 'deleted' | 'archived'; ordersAffected: number }
  | { ok: false; error: string };

/**
 * Smart delete:
 * - If the item has no historical order_lines → hard DELETE + remove image file.
 * - If it has any historical orders → soft delete (set deletedAt + available=false).
 *   The order_lines FK is `onDelete: 'restrict'` because financial / audit history
 *   must survive menu edits (SRS FR-MENU-001: "Items are deactivated, never deleted").
 */
export async function deleteMenuItem(id: string): Promise<DeleteResult> {
  const { venue } = await requirePerm(PERMISSIONS.MENU_DELETE);

  const [item] = await db
    .select({ id: menuItems.id, imageUrl: menuItems.imageUrl })
    .from(menuItems)
    .where(and(eq(menuItems.id, id), eq(menuItems.venueId, venue.id)))
    .limit(1);
  if (!item) return { ok: false, error: 'Menu item not found in this venue.' };

  const [counts] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(orderLines)
    .where(eq(orderLines.menuItemId, id));
  const ordersAffected = counts?.n ?? 0;

  try {
    if (ordersAffected === 0) {
      await db.delete(menuItems).where(eq(menuItems.id, id));
      if (item.imageUrl) await deleteUploadedImage(item.imageUrl);
      revalidatePath('/menu');
      revalidatePath('/overview');
      return { ok: true, mode: 'deleted', ordersAffected: 0 };
    }
    await db
      .update(menuItems)
      .set({ deletedAt: new Date(), available: false })
      .where(eq(menuItems.id, id));
    revalidatePath('/menu');
    revalidatePath('/overview');
    return { ok: true, mode: 'archived', ordersAffected };
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Delete failed';
    return { ok: false, error: msg };
  }
}

// ─── Image upload ─────────────────────────────────────────────────────────

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export async function uploadMenuImage(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const { venue } = await requirePerm(PERMISSIONS.MENU_WRITE);
  const file = formData.get('image');
  if (!(file instanceof File)) return { ok: false, error: 'No file provided' };
  if (file.size === 0) return { ok: false, error: 'File is empty' };
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'Max 5MB' };

  const ext = ALLOWED_IMAGE_TYPES[file.type];
  if (!ext) return { ok: false, error: 'JPG, PNG, or WebP only' };

  const dir = join(process.cwd(), 'public', 'uploads', 'menu', venue.id);
  await mkdir(dir, { recursive: true });
  const filename = `${randomUUID()}.${ext}`;
  const filepath = join(dir, filename);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filepath, buffer);

  return { ok: true, url: `/uploads/menu/${venue.id}/${filename}` };
}

/**
 * Delete a previously-uploaded image file from disk.
 * Safe: only deletes inside our uploads folder, ignores missing files.
 */
async function deleteUploadedImage(imageUrl: string | null) {
  if (!imageUrl) return;
  if (!imageUrl.startsWith('/uploads/menu/')) return;
  try {
    const filepath = join(process.cwd(), 'public', imageUrl.replace(/^\//, ''));
    await unlink(filepath);
  } catch {
    // file already gone; ignore
  }
}

export async function getCategoriesForVenue() {
  const { venue } = await requirePerm(PERMISSIONS.MENU_READ);
  return db
    .select({ id: menuCategories.id, name: menuCategories.name })
    .from(menuCategories)
    .where(eq(menuCategories.venueId, venue.id))
    .orderBy(menuCategories.sortOrder);
}

// ─── Build sequence (upsell flow) ─────────────────────────────────────────

const optionSchema = z.object({
  label: z.string().trim().min(1, 'Option label is required').max(120),
  description: z.string().trim().max(160).nullable().optional(),
  deltaPence: z.coerce.number().int().min(0).max(50000),
  featured: z.boolean().default(false),
  badge: z.string().trim().max(40).nullable().optional(),
});

const stepSchema = z.object({
  question: z.string().trim().min(1, 'Question is required').max(160),
  subtitle: z.string().trim().max(240).nullable().optional(),
  options: z.array(optionSchema).min(1, 'Each step needs at least one option').max(6),
});

const buildSequenceSchema = z.object({
  steps: z.array(stepSchema).max(3, 'Maximum 3 steps per item (conversion drops sharply past three)'),
});

export type BuildSequenceState =
  | { ok: true; message?: string }
  | { ok: false; errors: Record<string, string>; rawStepsJson: string };

/**
 * Replace the entire build sequence for a menu item.
 * Idempotent: deletes existing rows for this item and re-inserts.
 */
export async function saveBuildSequence(
  menuItemId: string,
  _prev: BuildSequenceState,
  formData: FormData,
): Promise<BuildSequenceState> {
  const { venue } = await requirePerm(PERMISSIONS.MENU_WRITE);
  const rawJson = formData.get('stepsJson');
  if (typeof rawJson !== 'string') {
    return { ok: false, errors: { _: 'Missing stepsJson payload.' }, rawStepsJson: '[]' };
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(rawJson);
  } catch {
    return { ok: false, errors: { _: 'Invalid steps payload.' }, rawStepsJson: rawJson };
  }

  const validated = buildSequenceSchema.safeParse({ steps: parsedJson });
  if (!validated.success) {
    const errors: Record<string, string> = {};
    for (const issue of validated.error.issues) {
      const key = issue.path.join('.') || '_';
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors, rawStepsJson: rawJson };
  }

  // Verify the item belongs to this venue (defence-in-depth)
  const [item] = await db
    .select({ id: menuItems.id })
    .from(menuItems)
    .where(and(eq(menuItems.id, menuItemId), eq(menuItems.venueId, venue.id)))
    .limit(1);
  if (!item) return { ok: false, errors: { _: 'Menu item not found in this venue.' }, rawStepsJson: rawJson };

  await db.transaction(async (tx) => {
    await tx.delete(buildSteps).where(eq(buildSteps.menuItemId, menuItemId));
    if (validated.data.steps.length === 0) return;
    await tx.insert(buildSteps).values(
      validated.data.steps.map((step, idx) => ({
        menuItemId,
        stepIndex: idx,
        question: step.question,
        subtitle: step.subtitle ?? null,
        options: step.options.map((opt, i) => ({
          id: `opt-${idx}-${i}-${Date.now().toString(36)}`,
          label: opt.label,
          description: opt.description || undefined,
          deltaPence: opt.deltaPence,
          featured: opt.featured ?? false,
          badge: opt.badge || undefined,
        })),
      })),
    );
  });

  revalidatePath('/menu');
  revalidatePath(`/menu/${menuItemId}/edit`);
  revalidatePath('/overview');

  return { ok: true, message: 'Upsell sequence saved.' };
}

/** Toggle availability without rebuilding the whole form. Spec: FR-MENU-008. */
export async function toggleItemAvailability(formData: FormData) {
  const { venue } = await requirePerm(PERMISSIONS.MENU_TOGGLE_STOCK);
  const id = formData.get('id');
  const next = formData.get('available') === 'true';
  if (typeof id !== 'string') return;
  await db
    .update(menuItems)
    .set({ available: next })
    .where(and(eq(menuItems.id, id), eq(menuItems.venueId, venue.id)));
  revalidatePath('/menu');
  revalidatePath(`/menu/${id}/edit`);
}

// ─── Categories: create inline ────────────────────────────────────────────

export async function createCategory(
  name: string,
): Promise<{ ok: true; category: { id: string; name: string } } | { ok: false; error: string }> {
  const { venue } = await requirePerm(PERMISSIONS.MENU_WRITE);
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, error: 'Category name is required' };
  if (trimmed.length > 80) return { ok: false, error: 'Category name is too long (max 80 chars)' };

  // Highest sortOrder + 1
  const [{ next }] = await db
    .select({ next: sql<number>`coalesce(max(${menuCategories.sortOrder}), 0)::int + 1` })
    .from(menuCategories)
    .where(eq(menuCategories.venueId, venue.id));

  const [row] = await db
    .insert(menuCategories)
    .values({ venueId: venue.id, name: trimmed, sortOrder: next })
    .returning({ id: menuCategories.id, name: menuCategories.name });

  if (!row) return { ok: false, error: 'Insert failed' };
  revalidatePath('/menu');
  return { ok: true, category: row };
}

// ─── Unified save: basic info + build sequence in ONE transaction ─────────

export type SaveMenuItemState =
  | { ok: true; message?: string; newId?: string }
  | { ok: false; errors: Record<string, string>; values: Record<string, string>; rawStepsJson?: string };

/**
 * One Server Action that handles BOTH create and update, AND persists the build
 * sequence at the same time. Used by /menu/new and /menu/[id]/edit so the UI
 * is identical on both pages.
 *
 * - maybeId null → INSERT item, then INSERT build_steps
 * - maybeId set  → UPDATE item, then DELETE+INSERT build_steps
 *
 * Either path is wrapped in a single Postgres transaction.
 */
export async function saveMenuItemAndSteps(
  maybeId: string | null,
  _prev: SaveMenuItemState,
  formData: FormData,
): Promise<SaveMenuItemState> {
  const { venue } = await requirePerm(PERMISSIONS.MENU_WRITE);
  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;

  const basic = itemSchema.safeParse({
    sku: raw.sku,
    name: raw.name,
    description: raw.description,
    categoryId: raw.categoryId,
    basePriceGbp: raw.basePriceGbp,
    station: raw.station,
    tint: raw.tint ?? '',
    available: raw.available === 'on',
    crossSell: raw.crossSell === 'on',
    allergens: raw.allergens,
    sortOrder: raw.sortOrder || '0',
    imageUrl: raw.imageUrl,
  });

  const errors: Record<string, string> = {};
  if (!basic.success) {
    for (const issue of basic.error.issues) {
      const key = issue.path[0]?.toString() ?? '_';
      if (!errors[key]) errors[key] = issue.message;
    }
  }

  // Parse steps JSON (optional — may not be provided for items without upsells)
  let stepsParsed: z.infer<typeof buildSequenceSchema>['steps'] = [];
  const stepsJson = raw.stepsJson;
  if (stepsJson && stepsJson !== '[]') {
    try {
      const parsedJson = JSON.parse(stepsJson);
      const validated = buildSequenceSchema.safeParse({ steps: parsedJson });
      if (!validated.success) {
        for (const issue of validated.error.issues) {
          const key = issue.path.join('.') || '_';
          if (!errors[key]) errors[key] = issue.message;
        }
      } else {
        stepsParsed = validated.data.steps;
      }
    } catch {
      errors._ = 'Invalid upsell payload.';
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors, values: raw, rawStepsJson: stepsJson };
  }

  // Defensive narrowing — TS can't connect the empty-errors check above to
  // basic.success. Unreachable if reached (basic errors would have populated
  // `errors` and we'd have returned), but the compiler needs it.
  if (!basic.success) {
    return { ok: false, errors: { _: 'Validation failed.' }, values: raw, rawStepsJson: stepsJson };
  }

  const data = basic.data;
  let resultId = maybeId;

  try {
    await db.transaction(async (tx) => {
      if (maybeId) {
        // Verify ownership
        const [exists] = await tx
          .select({ id: menuItems.id })
          .from(menuItems)
          .where(and(eq(menuItems.id, maybeId), eq(menuItems.venueId, venue.id)))
          .limit(1);
        if (!exists) throw new Error('Menu item not found in this venue.');

        await tx
          .update(menuItems)
          .set({
            sku: data.sku,
            name: data.name,
            description: data.description,
            categoryId: data.categoryId,
            basePricePence: Math.round(data.basePriceGbp * 100),
            station: data.station,
            tint: data.tint,
            available: data.available,
            crossSell: data.crossSell,
            allergens: data.allergens,
            sortOrder: data.sortOrder,
            imageUrl: data.imageUrl,
          })
          .where(eq(menuItems.id, maybeId));
        await tx.delete(buildSteps).where(eq(buildSteps.menuItemId, maybeId));
      } else {
        const [inserted] = await tx
          .insert(menuItems)
          .values({
            venueId: venue.id,
            sku: data.sku,
            name: data.name,
            description: data.description,
            categoryId: data.categoryId,
            basePricePence: Math.round(data.basePriceGbp * 100),
            station: data.station,
            tint: data.tint,
            available: data.available,
            crossSell: data.crossSell,
            allergens: data.allergens,
            sortOrder: data.sortOrder,
            imageUrl: data.imageUrl,
          })
          .returning({ id: menuItems.id });
        if (!inserted) throw new Error('Insert failed');
        resultId = inserted.id;
      }

      if (stepsParsed.length > 0 && resultId) {
        await tx.insert(buildSteps).values(
          stepsParsed.map((step, idx) => ({
            menuItemId: resultId!,
            stepIndex: idx,
            question: step.question,
            subtitle: step.subtitle ?? null,
            options: step.options.map((opt, i) => ({
              id: `opt-${idx}-${i}-${Date.now().toString(36)}`,
              label: opt.label,
              description: opt.description || undefined,
              deltaPence: opt.deltaPence,
              featured: opt.featured ?? false,
              badge: opt.badge || undefined,
            })),
          })),
        );
      }
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Save failed';
    if (msg.includes('menu_items_venue_sku_idx')) {
      return { ok: false, errors: { sku: 'A menu item with this SKU already exists.' }, values: raw, rawStepsJson: stepsJson };
    }
    return { ok: false, errors: { _: msg }, values: raw, rawStepsJson: stepsJson };
  }

  revalidatePath('/menu');
  if (resultId) revalidatePath(`/menu/${resultId}/edit`);
  revalidatePath('/overview');

  // New item → redirect to its edit page so user can keep working with stats visible.
  if (!maybeId && resultId) {
    redirect(`/menu/${resultId}/edit?created=1`);
  }

  return { ok: true, message: 'Saved.', newId: resultId ?? undefined };
}
