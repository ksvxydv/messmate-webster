import { openDB, IDBPDatabase } from "idb";

const DB_NAME = "messmate-offline-db";
const STORE_NAME = "offline-scans";

export interface OfflineScanRecord {
  id?: number;
  userId: string;
  mealSlotId: string;
  qrToken?: string;
  timestamp: string;
  synced: boolean;
  createdAt: string;
}

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

  // 2. Insert into IndexedDB queue
  const newRecord: OfflineScanRecord = {
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
 * Clear or mark scans as synced once reconnected
 */
export async function clearOfflineScans(): Promise<void> {
  const db = await getOfflineDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await tx.objectStore(STORE_NAME).clear();
  await tx.done;
}
