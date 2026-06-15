/**
 * Menu store — hydrated from the device-api at app boot.
 *
 * Maps the admin DB shape (menu_items + build_steps) onto the shape the
 * existing screens expect (price in major units, emoji image, extras list).
 * Falls back to the bundled mock menu if the API is unreachable so the demo
 * never shows an empty screen.
 */

import { create } from 'zustand';
import { fetchMenu } from '../api/client';
import { menu as mockMenu } from '../data/menu';
import { categories as mockCategories } from '../data/categories';

const STATION_EMOJI = {
  grill: '🍔',
  pizza: '🍕',
  pasta: '🍝',
  cold: '🥗',
  dessert: '🍨',
  bar: '🥤',
};

const CATEGORY_EMOJI = [
  ['starter', '🥗'], ['main', '🍽️'], ['burger', '🍔'], ['pizza', '🍕'],
  ['pasta', '🍝'], ['dessert', '🍨'], ['drink', '🥤'], ['coffee', '☕'],
  ['wine', '🍷'], ['beer', '🍺'], ['cocktail', '🍸'], ['side', '🍟'],
];

const TINT_CYCLE = ['brand-light', 'tint-pizza', 'tint-pasta', 'tint-coffee', 'tint-icecream', 'tint-drinks'];

const categoryEmoji = (name) => {
  const lower = name.toLowerCase();
  for (const [kw, emoji] of CATEGORY_EMOJI) {
    if (lower.includes(kw)) return emoji;
  }
  return '🍽️';
};

/** DB item → screen-facing item shape. */
const mapItem = (item) => {
  // Each build-step option with a price delta becomes an "extra" the guest can
  // add. The featured option's badge is surfaced for the upsell nudge.
  const extras = [];
  for (const step of item.buildSteps ?? []) {
    for (const opt of step.options ?? []) {
      if (opt.deltaPence > 0) {
        extras.push({
          id: opt.id,
          name: opt.label,
          blurb: opt.description ?? '',
          priceDelta: opt.deltaPence / 100,
          inStock: true,
          featured: !!opt.featured,
          badge: opt.badge ?? null,
        });
      }
    }
  }

  return {
    id: item.id,
    name: item.name,
    categoryId: item.categoryId,
    description: item.description ?? '',
    longDescription: item.description ?? '',
    price: item.pricePence / 100,
    image: STATION_EMOJI[item.station] ?? '🍽️',
    imageUrl: item.imageUrl ?? null,
    tint: 'brand-light',
    tags: item.crossSell ? ['popular'] : [],
    badge: extras.some((e) => e.featured) ? '⭐ UPGRADES' : undefined,
    inStock: true,
    kcal: null,
    station: item.station === 'bar' ? 'bar' : 'kitchen',
    allergens: item.allergens ?? [],
    variants: [{ id: 'regular', name: 'Regular', blurb: '', priceDelta: 0 }],
    extras,
    removable: [],
    spice: [],
  };
};

const mapCategories = (categories, items) => {
  const countBy = new Map();
  for (const i of items) {
    countBy.set(i.categoryId, (countBy.get(i.categoryId) ?? 0) + 1);
  }
  return categories.map((c, idx) => ({
    id: c.id,
    name: c.name,
    emoji: categoryEmoji(c.name),
    tint: TINT_CYCLE[idx % TINT_CYCLE.length],
    blurb: '',
    count: countBy.get(c.id) ?? 0,
  }));
};

export const useMenuStore = create((set) => ({
  items: mockMenu,
  categories: mockCategories,
  hydrated: false,
  source: 'mock', // 'mock' | 'api'

  hydrate: async () => {
    try {
      const data = await fetchMenu();
      const items = data.items.map(mapItem);
      set({
        items,
        categories: mapCategories(data.categories, items),
        hydrated: true,
        source: 'api',
      });
      console.log(`[menu] hydrated from API: ${items.length} items`);
    } catch (err) {
      console.log('[menu] API unreachable, using bundled mock data:', err.message);
      set({ hydrated: true, source: 'mock' });
    }
  },
}));

// ─── Pure derive helpers (use with raw store slices to avoid re-render loops)

export const getFeatured = (items) =>
  items.filter((m) => (m.tags || []).some((t) => ['signature', 'popular'].includes(t))).slice(0, 4);

export const filterByCategory = (items, categoryId) =>
  items.filter((m) => m.categoryId === categoryId);

export const getItem = (items, id) => items.find((m) => m.id === id);
