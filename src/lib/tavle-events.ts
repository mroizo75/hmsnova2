import { EventEmitter } from "events";

/**
 * Global singleton EventEmitter for HMS Tavle real-time updates.
 *
 * Brukes til SSE (Server-Sent Events) — ingen polling, ingen WebSocket.
 * Fungerer i persistent Node.js-prosess (lokalt + Docker/Railway/etc.).
 * På Vercel serverless vil dette fungere per-instans; for multi-instans
 * deploy, bytt ut med Redis Pub/Sub.
 */
declare global {
  // eslint-disable-next-line no-var
  var _tavleEmitter: EventEmitter | undefined;
}

if (!global._tavleEmitter) {
  global._tavleEmitter = new EventEmitter();
  global._tavleEmitter.setMaxListeners(1000);
}

export const tavleEmitter: EventEmitter = global._tavleEmitter;

/** Kaller dette etter enhver lagring som skal vises live på tavlen. */
export function emitTavleUpdate(publicToken: string): void {
  tavleEmitter.emit(`tavle:${publicToken}`);
}
