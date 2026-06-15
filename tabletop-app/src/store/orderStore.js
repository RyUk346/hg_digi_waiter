/**
 * Order store — the active order placed from this device.
 *
 * placeOrder() POSTs to the device-api; the server prices the order from the
 * DB and the kitchen sees it instantly. If the API is unreachable the order
 * falls back to a local-only object so the demo flow still completes.
 *
 * Live status updates arrive over socket.io (src/api/socket.js):
 *   order:line:bumped → item READY
 *   order:served      → order DELIVERED
 */

import { create } from 'zustand';
import { ORDER_STATUS } from '../constants/tokens';
import { postOrder } from '../api/client';

const randomToken = () => {
  const num = Math.floor(Math.random() * 900 + 100); // 100-999
  return `#A${num}`;
};

export const useOrderStore = create((set) => ({
  active: null, // { orderId, token, items, totals, placedAt, status, eta }
  history: [],

  /**
   * Place the order. Async — resolves with the order object either way
   * (server-backed if API reachable, local-only otherwise).
   */
  placeOrder: async ({ lines, totals, table, server }) => {
    const placedAt = new Date();

    const baseItems = lines.map((l) => ({
      itemId: l.itemId,
      lineId: null, // filled from server response when available
      name: l.name,
      quantity: l.quantity,
      variant: l.variant?.name,
      extras: (l.extras || []).map((e) => e.name),
      removed: (l.removed || []).map((r) => r.name),
      spice: l.spice?.name,
      station: 'kitchen',
      status: ORDER_STATUS.ACCEPTED,
    }));

    let orderId = null;
    let token = randomToken();

    try {
      const res = await postOrder({
        lines: lines.map((l) => ({
          menuItemId: l.itemId,
          quantity: l.quantity,
          selectedOptionIds: (l.extras || []).map((e) => e.id),
        })),
      });
      orderId = res.orderId;
      token = `#${res.orderId.slice(0, 4).toUpperCase()}`;
      // Attach server line ids so socket bump events can match items
      for (const serverLine of res.lines) {
        const match = baseItems.find(
          (it) => it.itemId === serverLine.menuItemId && it.lineId === null,
        );
        if (match) match.lineId = serverLine.id;
      }
      console.log('[order] placed on server:', orderId);
    } catch (err) {
      console.log('[order] API unreachable, local-only order:', err.message);
    }

    const order = {
      orderId,
      token,
      table,
      server: server || 'Auto-assigned',
      items: baseItems,
      totals,
      placedAt: placedAt.toISOString(),
      status: ORDER_STATUS.ACCEPTED,
      eta: 15,
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

  updateItemStatusByLineId: (lineId, status) =>
    set((state) => {
      if (!state.active) return state;
      return {
        active: {
          ...state.active,
          items: state.active.items.map((it) =>
            it.lineId === lineId ? { ...it, status } : it,
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
