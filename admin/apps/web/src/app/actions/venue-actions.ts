'use server';

import { db, venues } from '@hyperglow/db';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { PERMISSIONS, requirePermission, requireVenueAccess } from '@/lib/rbac';

const venueSchema = z.object({
  name: z.string().trim().min(1, 'Venue name is required').max(120),
  city: z.string().trim().max(80).optional().or(z.literal('')).transform((v) => v || null),
  timezone: z.string().trim().min(1).max(64),
  currency: z.enum(['GBP', 'EUR', 'USD']),
  recoveryBudgetGbp: z.coerce.number().min(0).max(10000),
});

export type VenueFormState =
  | { ok: true; message?: string }
  | { ok: false; errors: Record<string, string>; values: Record<string, string> };

export async function updateVenue(
  venueId: string,
  _prev: VenueFormState,
  formData: FormData,
): Promise<VenueFormState> {
  await requirePermission(PERMISSIONS.SETTINGS_WRITE);
  // Defence-in-depth: even an admin can only edit their own venue.
  await requireVenueAccess(venueId);

  const raw = Object.fromEntries(formData.entries()) as Record<string, string>;
  const parsed = venueSchema.safeParse({
    name: raw.name,
    city: raw.city,
    timezone: raw.timezone,
    currency: raw.currency,
    recoveryBudgetGbp: raw.recoveryBudgetGbp,
  });

  if (!parsed.success) {
    const errors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0]?.toString() ?? '_';
      if (!errors[key]) errors[key] = issue.message;
    }
    return { ok: false, errors, values: raw };
  }

  const data = parsed.data;
  await db
    .update(venues)
    .set({
      name: data.name,
      city: data.city,
      timezone: data.timezone,
      currency: data.currency,
      recoveryBudgetPence: Math.round(data.recoveryBudgetGbp * 100),
    })
    .where(eq(venues.id, venueId));

  revalidatePath('/settings');
  revalidatePath('/overview');
  return { ok: true, message: 'Venue updated' };
}
