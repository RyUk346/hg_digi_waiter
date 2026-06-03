/**
 * Cart store — zustand
 *
 * Line item shape:
 *   {
 *     lineId: string,            // unique per line (item+config hash)
 *     itemId: string,            // menu.id
 *     name: string,
 *     image: string,
 *     basePrice: number,
 *     quantity: number,
 *     variant: { id, name, priceDelta } | null,
 *     extras: [{ id, name, priceDelta }],
 *     removed: [{ id, name }],
 *     spice: { id, name } | null,
 *     notes: string,
 *   }
 *
 * Pricing model:
 *   subtotal = sum( (basePrice + variantDelta + sum(extrasDelta)) * quantity )
 *   tax      = subtotal * TAX_RATE
 *   tip      = subtotal * tipPercent   OR   custom tip amount
 *   total    = subtotal + tax + tip
 */

import { create } from 'zustand';

const TAX_RATE = 0.08;

const lineSubtotal = (line) => {
  const variantDelta = line.variant?.priceDelta ?? 0;
  const extrasDelta = (line.extras || []).reduce((s, e) => s + (e.priceDelta || 0), 0);
  return (line.basePrice + variantDelta + extrasDelta) * line.quantity;
};

export const useCartStore = create((set, get) => ({
  lines: [],
  tipPercent: 15, // 10 / 15 / 20 / 0 / null (custom)
  tipCustom: null, // dollar amount if user typed in Custom field
  promo: null,

  // ----- selectors (call as functions for fresh values) -----
  subtotal: () => get().lines.reduce((s, l) => s + lineSubtotal(l), 0),
  tax: () => +(get().subtotal() * TAX_RATE).toFixed(2),
  tip: () => {
    const { tipPercent, tipCustom } = get();
    if (tipCustom != null) return +tipCustom.toFixed(2);
    if (tipPercent == null || tipPercent === 0) return 0;
    return +(get().subtotal() * (tipPercent / 100)).toFixed(2);
  },
  total: () => +(get().subtotal() + get().tax() + get().tip()).toFixed(2),
  itemCount: () => get().lines.reduce((c, l) => c + l.quantity, 0),

  // ----- mutations -----
  addLine: (line) =>
    set((state) => ({
      lines: [...state.lines, { ...line, lineId: line.lineId || `${line.itemId}-${Date.now()}` }],
    })),

  updateQuantity: (lineId, quantity) =>
    set((state) => ({
      lines: state.lines
        .map((l) => (l.lineId === lineId ? { ...l, quantity: Math.max(0, quantity) } : l))
        .filter((l) => l.quantity > 0),
    })),

  removeLine: (lineId) =>
    set((state) => ({ lines: state.lines.filter((l) => l.lineId !== lineId) })),

  setTipPercent: (pct) => set({ tipPercent: pct, tipCustom: null }),
  setTipCustom: (amount) => set({ tipCustom: amount, tipPercent: null }),
  clearTip: () => set({ tipPercent: 0, tipCustom: null }),

  applyPromo: (code) => set({ promo: code }),

  clearCart: () => set({ lines: [], tipPercent: 15, tipCustom: null, promo: null }),
}));

export { lineSubtotal, TAX_RATE };
