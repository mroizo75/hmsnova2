"use client";

const DB_NAME = "hmsnova_offline";
const DB_VERSION = 1;
const STORE_NAME = "pending_submissions";

export type OfflineEntryType = "incident" | "ruh" | "inspection_finding";

export interface OfflineQueueEntry {
  id: string;
  type: OfflineEntryType;
  createdAt: string;
  endpoint: string;
  /** For incident/ruh: FormData fields. For inspection_finding: JSON body fields. */
  payload: Record<string, unknown>;
  /** Raw file blobs to send. For inspection: uploaded before main request. */
  files: Array<{ fieldName: string; name: string; type: string; blob: Blob }>;
  /** Extra metadata for multi-step syncs (e.g. inspectionId for finding upload). */
  meta?: Record<string, string>;
}

/**
 * Sjekker om en feil skyldes nettverk/tilkobling (ikke en HTTP-feil fra serveren).
 * TypeError kastes av fetch() når nettverket er utilgjengelig.
 */
export function isNetworkError(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (!navigator.onLine) return true;
  if (error instanceof DOMException && error.name === "AbortError") return false;
  return false;
}

/** Returnerer false hvis IndexedDB ikke er tilgjengelig (f.eks. privat modus i noen nettlesere). */
export function isAvailable(): boolean {
  try {
    return typeof indexedDB !== "undefined" && indexedDB !== null;
  } catch {
    return false;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function enqueue(entry: OfflineQueueEntry): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(entry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

const MAX_QUEUE_ENTRIES = 50;
const MAX_TOTAL_BLOB_BYTES = 80 * 1024 * 1024; // 80 MB

export interface EnqueueResult {
  stored: boolean;
  reason?: "quota_entries" | "quota_size" | "indexeddb_error";
}

/**
 * Forsøker å lagre en post i offline-køen med kvote-sjekk.
 * Returnerer { stored: false, reason } hvis køen er full eller for stor.
 */
export async function enqueueSafe(entry: OfflineQueueEntry): Promise<EnqueueResult> {
  try {
    const pending = await listPending();

    if (pending.length >= MAX_QUEUE_ENTRIES) {
      return { stored: false, reason: "quota_entries" };
    }

    let totalBytes = 0;
    for (const e of pending) {
      for (const f of e.files) {
        totalBytes += f.blob.size;
      }
    }
    for (const f of entry.files) {
      totalBytes += f.blob.size;
    }

    if (totalBytes > MAX_TOTAL_BLOB_BYTES) {
      return { stored: false, reason: "quota_size" };
    }

    await enqueue(entry);
    return { stored: true };
  } catch {
    return { stored: false, reason: "indexeddb_error" };
  }
}

export async function listPending(): Promise<OfflineQueueEntry[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).getAll();
    request.onsuccess = () => resolve(request.result as OfflineQueueEntry[]);
    request.onerror = () => reject(request.error);
  });
}

export async function remove(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function count(): Promise<number> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).count();
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function clear(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function formDataToOfflinePayload(
  formData: FormData,
): { payload: Record<string, unknown>; files: OfflineQueueEntry["files"] } {
  const payload: Record<string, unknown> = {};
  const files: OfflineQueueEntry["files"] = [];

  formData.forEach((value, key) => {
    if (value instanceof File && value.size > 0) {
      files.push({ fieldName: key, name: value.name, type: value.type, blob: value });
    } else if (typeof value === "string") {
      const existing = payload[key];
      if (existing !== undefined) {
        payload[key] = Array.isArray(existing)
          ? [...existing, value]
          : [existing, value];
      } else {
        payload[key] = value;
      }
    }
  });

  return { payload, files };
}

export function offlinePayloadToFormData(
  entry: OfflineQueueEntry,
): FormData {
  const formData = new FormData();

  for (const [key, value] of Object.entries(entry.payload)) {
    if (Array.isArray(value)) {
      value.forEach((v) => formData.append(key, String(v)));
    } else if (value !== null && value !== undefined) {
      formData.append(key, String(value));
    }
  }

  for (const file of entry.files) {
    formData.append(file.fieldName, new File([file.blob], file.name, { type: file.type }));
  }

  return formData;
}
