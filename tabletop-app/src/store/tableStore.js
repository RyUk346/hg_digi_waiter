/**
 * Table store — identifies this physical device.
 * In production this will be set during device pairing (admin pair flow).
 * For now hard-coded to Table 7 for prototyping.
 */

import { create } from 'zustand';

export const useTableStore = create((set) => ({
  tableNumber: 7,
  deviceId: 'TBL-07-DEV',
  cafeName: 'Hyperglow Café',

  setTable: (n) => set({ tableNumber: n }),
}));
