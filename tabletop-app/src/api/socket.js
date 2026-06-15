/**
 * Socket.io connection to the device-api. Joins `table:{tableId}` and
 * `venue:{venueId}` rooms automatically (server-side, based on the token).
 *
 * Live events consumed by the Order App:
 *   order:line:bumped { orderId, lineId, allDelivered }  → item READY
 *   order:served      { orderId }                        → whole order DELIVERED
 */

import { io } from 'socket.io-client';
import { API_URL, DEVICE_TOKEN } from './config';
import { useOrderStore } from '../store/orderStore';
import { ORDER_STATUS } from '../constants/tokens';

let socket = null;

export const connectDeviceSocket = () => {
  if (socket) return socket;

  socket = io(API_URL, {
    auth: { token: DEVICE_TOKEN },
    transports: ['websocket'],
    reconnection: true,
    reconnectionDelayMax: 10_000,
  });

  socket.on('connect', () => console.log('[socket] connected'));
  socket.on('connect_error', (err) => console.log('[socket] error:', err.message));

  socket.on('order:line:bumped', ({ orderId, lineId, allDelivered }) => {
    const { active, updateItemStatusByLineId, updateStatus } = useOrderStore.getState();
    if (!active || active.orderId !== orderId) return;
    updateItemStatusByLineId(lineId, ORDER_STATUS.READY);
    if (!allDelivered) updateStatus(ORDER_STATUS.PREPARING);
  });

  socket.on('order:served', ({ orderId }) => {
    const { active, updateStatus } = useOrderStore.getState();
    if (!active || active.orderId !== orderId) return;
    updateStatus(ORDER_STATUS.DELIVERED);
  });

  return socket;
};

export const disconnectDeviceSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
