/**
 * Device API connection config.
 *
 * DEV (Android emulator): 10.0.2.2 maps to the host machine's localhost.
 * DEV (physical tablet on same Wi-Fi): use your PC's LAN IP, e.g. http://192.168.1.50:3020
 * PROD: point at the VPS once device-api is deployed there.
 *
 * DEVICE_TOKEN identifies this physical tablet. The dev token below is created
 * by `pnpm db:seed` (bound to Table 7 of the seeded venue). In production each
 * tablet gets its own row in the `devices` table with a random token.
 */

export const API_URL = 'http://10.0.2.2:3020';
export const DEVICE_TOKEN = 'dev-order-table7';
