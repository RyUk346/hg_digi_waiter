/**
 * Order store — the active order placed from this device.
 * Once confirmed, this lets the persistent Order Summary button + live status
 * screen display the right state. The status field is driven by websocket
 * updates from the kitchen (TODO: wire when backend lands).
 */

import { create } from 'zustand';
import { ORDER_STATUS } from '../constants/tokens';

const randomToken = () => {
  const num = Math.floor(Math.random() * 900 + 100); // 100-999
  return `#A${num}`;
};

export const useOrderStore = create((set) => ({
  active: null,          // { token, items, totals, placedAt, status, eta }
  history: [],           // previous orders this session

  placeOrder: ({ lines, totals, table, server }) => {
    const placedAt = new Date();
    const order = {
      token: randomToken(),
      table,
      server: server || 'Auto-assigned',
      items: lines.map((l) => ({
        itemId: l.itemId,
        name: l.name,
        quantity: l.quantity,
        variant: l.variant?.name,
        extras: (l.extras || []).map((e) => e.name),
        removed: (l.removed || []).map((r) => r.name),
        spice: l.spice?.name,
        station: 'kitchen', // TODO: routing
        status: ORDER_STATUS.ACCEPTED,
      })),
      totals,
      placedAt: placedAt.toISOString(),
      status: ORDER_STATUS.ACCEPTED,
      eta: 15, // minutes — TODO compute from kitchen load
    };
    set({ active: order });
    return order;
  },

  updateStatus: (status) =>
    set((state) => (state.active ? { active: { ...state.active, status } } : state)),

  updateItemStatus: (itemId, status) =>
    set((state) => {
      if (!state.active) return state;
      return {
        active: {
          ...state.active,
          items: state.active.items.map((it) =>
            it.itemId === itemId ? { ...it, status } : it,
          ),
        },
      };
    }),

  closeOrder: () =>
    set((state) => ({
      active: null,
      history: state.active ? [state.active, ...state.history] : state.history,
    })),
}));
