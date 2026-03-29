/**
 * Redis Pub/Sub for Real-time Notifications
 * 
 * Bruker ioredis for pub/sub-støtte med Upstash Redis.
 * Dette gir ekte real-time notifikasjoner uten polling.
 */

import Redis from "ioredis";

const UPSTASH_REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

let publisherClient: Redis | null = null;
let redisDisabledUntilMs = 0;
const REDIS_RETRY_COOLDOWN_MS = 60_000;

function isPublisherUsable(client: Redis | null): client is Redis {
  if (!client) {
    return false;
  }
  const status = client.status;
  return status === "ready" || status === "connect" || status === "connecting" || status === "reconnecting";
}

function disableRedisTemporarily(reason: string): void {
  redisDisabledUntilMs = Date.now() + REDIS_RETRY_COOLDOWN_MS;
  console.warn(`⚠️ [Redis Pub/Sub] Midlertidig deaktivert i ${REDIS_RETRY_COOLDOWN_MS / 1000}s: ${reason}`);
}

/**
 * Hent Redis publisher-klient (for å publisere events)
 * Returnerer null hvis Upstash ikke er konfigurert
 */
export function getRedisPublisher(): Redis | null {
  if (!UPSTASH_REDIS_URL || !UPSTASH_REDIS_TOKEN) {
    console.warn('⚠️ [Redis Pub/Sub] Upstash Redis ikke konfigurert - notifikasjoner lagres kun i database');
    return null;
  }

  if (Date.now() < redisDisabledUntilMs) {
    return null;
  }

  if (publisherClient && !isPublisherUsable(publisherClient)) {
    publisherClient = null;
  }

  if (!publisherClient) {
    try {
      // Parse Upstash REST URL til ioredis format
      // Upstash format: https://example.upstash.io:6379
      // ioredis format: rediss://default:token@example.upstash.io:6379
      const url = new URL(UPSTASH_REDIS_URL);
      const port = url.port || '6379';
      const redisUrl = `rediss://default:${UPSTASH_REDIS_TOKEN}@${url.hostname}:${port}`;

      console.log(`🔧 [Redis Pub/Sub] Connecting to Upstash Redis: ${url.hostname}:${port}`);

      publisherClient = new Redis(redisUrl, {
        family: 0, // Auto-detect IPv4/IPv6
        tls: {
          rejectUnauthorized: true, // Sikker TLS for Upstash
        },
        retryStrategy(times) {
          if (times > 10) {
            console.error('❌ [Redis Pub/Sub] Max retries reached, giving up');
            disableRedisTemporarily("max retries reached");
            if (publisherClient) {
              publisherClient.disconnect();
              publisherClient = null;
            }
            return null; // Stop retrying
          }
          const delay = Math.min(times * 100, 3000);
          console.log(`🔄 [Redis Pub/Sub] Retry ${times} in ${delay}ms`);
          return delay;
        },
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
        lazyConnect: false,
      });

      publisherClient.on('connect', () => {
        console.log('✅ [Redis Pub/Sub] Publisher connected to Upstash');
      });

      publisherClient.on('ready', () => {
        console.log('✅ [Redis Pub/Sub] Publisher ready to publish');
      });

      publisherClient.on('error', (err) => {
        console.error('❌ [Redis Pub/Sub] Publisher error:', err.message);
        if (err.message.includes("ETIMEDOUT") || err.message.includes("ECONNREFUSED")) {
          disableRedisTemporarily(err.message);
        }
      });

      publisherClient.on('close', () => {
        console.warn('⚠️ [Redis Pub/Sub] Publisher connection closed');
        publisherClient = null;
      });
    } catch (error) {
      console.error('❌ [Redis Pub/Sub] Failed to create publisher:', error);
      disableRedisTemporarily("failed to create publisher");
      publisherClient = null;
    }
  }

  return publisherClient;
}

/**
 * Opprett en ny subscriber-klient (for SSE-streaming)
 * Hver SSE-connection trenger sin egen subscriber
 */
export function createRedisSubscriber(): Redis | null {
  if (!UPSTASH_REDIS_URL || !UPSTASH_REDIS_TOKEN) {
    return null;
  }

  try {
    const url = new URL(UPSTASH_REDIS_URL);
    const port = url.port || '6379';
    const redisUrl = `rediss://default:${UPSTASH_REDIS_TOKEN}@${url.hostname}:${port}`;

    const subscriber = new Redis(redisUrl, {
      family: 0, // Auto-detect IPv4/IPv6
      tls: {
        rejectUnauthorized: true,
      },
      retryStrategy(times) {
        if (times > 10) return null;
        const delay = Math.min(times * 100, 3000);
        return delay;
      },
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: false,
    });

    subscriber.on('connect', () => {
      console.log('🔔 [Redis Pub/Sub] Subscriber connected');
    });

    subscriber.on('error', (err) => {
      console.error('❌ [Redis Pub/Sub] Subscriber error:', err.message);
    });

    return subscriber;
  } catch (error) {
    console.error('❌ [Redis Pub/Sub] Failed to create subscriber:', error);
    return null;
  }
}

/**
 * Publiser en notifikasjon til en brukers channel
 */
export async function publishNotification(
  userId: string,
  notification: any,
  tenantId?: string
): Promise<boolean> {
  const publisher = getRedisPublisher();
  
  if (!publisher) {
    // Redis ikke tilgjengelig - notifikasjonen er allerede lagret i database
    return false;
  }

  try {
    if (publisher.status !== "ready") {
      return false;
    }
    const channel = tenantId
      ? `notifications:${tenantId}:${userId}`
      : `notifications:${userId}`;
    await publisher.publish(channel, JSON.stringify(notification));
    console.log(`📢 [Redis Pub/Sub] Published notification to ${channel}`);
    return true;
  } catch (error) {
    console.error('❌ [Redis Pub/Sub] Failed to publish:', error);
    disableRedisTemporarily("publish failed");
    publisher.disconnect();
    publisherClient = null;
    return false;
  }
}

/**
 * Subscribe til en brukers notification channel
 */
export async function subscribeToNotifications(
  subscriber: Redis,
  userId: string,
  onNotification: (notification: any) => void,
  tenantId?: string
): Promise<() => void> {
  const channel = tenantId
    ? `notifications:${tenantId}:${userId}`
    : `notifications:${userId}`;

  subscriber.on('message', (ch, message) => {
    if (ch === channel) {
      try {
        const notification = JSON.parse(message);
        onNotification(notification);
      } catch (error) {
        console.error('❌ [Redis Pub/Sub] Failed to parse notification:', error);
      }
    }
  });

  await subscriber.subscribe(channel);
  console.log(`🔔 [Redis Pub/Sub] Subscribed to ${channel}`);

  // Returner cleanup-funksjon
  return () => {
    subscriber.unsubscribe(channel);
    subscriber.disconnect();
  };
}
