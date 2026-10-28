import { openDB, IDBPDatabase } from "idb";
import { OfflineScanRecord } from "@/types";

export type { OfflineScanRecord };

const DB_NAME = "messmate-offline-db";
const STORE_NAME = "offline-scans";

let dbPromise: Promise<IDBPDatabase> | null = null;

// Initialize the browser's IndexedDB with an index on user and meal slot
export async function getOfflineDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, 2, {
      upgrade(db, _oldVersion, _newVersion, transaction) {
        let store: any;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          store = db.createObjectStore(STORE_NAME, {
            keyPath: "id",
            autoIncrement: true,
          });
        } else {
          store = transaction.objectStore(STORE_NAME);
        }

        if (!store.indexNames.contains("user_slot")) {
          store.createIndex("user_slot", ["userId", "mealSlotId"], {
            unique: false,
          });
        }
      },
    });
  }
  return dbPromise;
}

/**
 * Checks if a pass has already been scanned locally while in offline mode
 * Blocks local double-dipping without needing internet connection
 */
export async function checkLocalDoubleScan(
  userId: string,
  mealSlotId: string,
): Promise<OfflineScanRecord | null> {
  const db = await getOfflineDB();
  const tx = db.transaction(STORE_NAME, "readonly");
  const index = tx.store.index("user_slot");
  const existing = await index.get([userId, mealSlotId]);
  return existing || null;
}

/**
 * Save a scan locally when offline, enforcing local single-redemption
 */
export async function queueOfflineScan(scanPayload: {
  userId: string;
  mealSlotId: string;
  qrToken?: string;
  timestamp?: string;
}): Promise<{ success: boolean; duplicate?: boolean; record?: OfflineScanRecord }> {
  const db = await getOfflineDB();

  // 1. Enforce local anti-double-dipping check
  const existing = await checkLocalDoubleScan(
    scanPayload.userId,
    scanPayload.mealSlotId,
  );

  if (existing) {
    return {
      success: false,
      duplicate: true,
      record: existing,
    };
  }

  // 2. Generate unique deterministic queue ID
  const queueId =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `q_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

  // 3. Insert into IndexedDB queue
  const newRecord: OfflineScanRecord = {
    queueId,
    userId: scanPayload.userId,
    mealSlotId: scanPayload.mealSlotId,
    qrToken: scanPayload.qrToken,
    timestamp: scanPayload.timestamp || new Date().toISOString(),
    synced: false,
    createdAt: new Date().toISOString(),
  };

  const id = await db.add(STORE_NAME, newRecord);
  return {
    success: true,
    duplicate: false,
    record: { ...newRecord, id: Number(id) },
  };
}

/**
 * Get all offline queued scans awaiting cloud synchronization
 */
export async function getOfflineScans(): Promise<OfflineScanRecord[]> {
  const db = await getOfflineDB();
  return db.getAll(STORE_NAME);
}

/**
 * Get count of pending offline scans
 */
export async function getPendingScanCount(): Promise<number> {
  const db = await getOfflineDB();
  return db.count(STORE_NAME);
}

/**
 * Item-level reconciliation deletion:
 * Deletes only the specific reconciled scans by their numeric id or queueId.
 * Never wipes the entire queue on partial failures.
 */
export async function removeOfflineScans(
  identifiers: Array<number | string>
): Promise<void> {
  if (!identifiers || identifiers.length === 0) return;

  const db = await getOfflineDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  const store = tx.objectStore(STORE_NAME);

  const allRecords = await store.getAll();
  const idSet = new Set(identifiers.map((i) => String(i)));

  for (const record of allRecords) {
    if (
      (record.id && idSet.has(String(record.id))) ||
      (record.queueId && idSet.has(String(record.queueId)))
    ) {
      if (record.id !== undefined) {
        await store.delete(record.id);
      }
    }
  }

  await tx.done;
}

/**
 * Full queue reset (maintenance only)
 */
export async function clearOfflineScans(): Promise<void> {
  const db = await getOfflineDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await tx.objectStore(STORE_NAME).clear();
  await tx.done;
}
