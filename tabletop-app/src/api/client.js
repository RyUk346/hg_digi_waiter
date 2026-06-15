/**
 * REST client for the device-api (admin/apps/device-api).
 * All requests carry the device token; prices are computed server-side.
 */

import axios from 'axios';
import { API_URL, DEVICE_TOKEN } from './config';

const http = axios.create({
  baseURL: API_URL,
  timeout: 10_000,
  headers: { Authorization: `Bearer ${DEVICE_TOKEN}` },
});

/** Venue + table identity for this device. */
export const fetchBootstrap = async () => {
  const { data } = await http.get('/v1/bootstrap');
  return data; // { device, venue, table }
};

/** Full menu: { categories: [...], items: [...] } in DB shape. */
export const fetchMenu = async () => {
  const { data } = await http.get('/v1/menu');
  return data;
};

/**
 * Place an order. Lines reference DB ids only — the server prices everything.
 * @param {Array<{menuItemId: string, quantity: number, selectedOptionIds: string[]}>} lines
 */
export const postOrder = async ({ lines, coverCount = 2 }) => {
  const { data } = await http.post('/v1/orders', { lines, coverCount });
  return data; // { orderId, status, totalPence, lines: [{id, menuItemId, ...}] }
};

export const fetchOrder = async (orderId) => {
  const { data } = await http.get(`/v1/orders/${orderId}`);
  return data;
};

export const postCallServer = async () => {
  const { data } = await http.post('/v1/call-server');
  return data;
};
