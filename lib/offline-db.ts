import { openDB } from "idb";

const DB_NAME = "messmate-offline-db";
const STORE_NAME = "offline-scans";

// Initialize the browser's IndexedDB
export async function initOfflineDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, {
          keyPath: "id",
          autoIncrement: true,
        });
      }
    },
  });
}

// Save a scan locally when offline
export async function queueOfflineScan(scanPayload: {
  userId: string;
  mealSlotId: string;
  timestamp: string;
}) {
  const db = await initOfflineDB();
  await db.add(STORE_NAME, {
    ...scanPayload,
    synced: false,
    createdAt: new Date().toISOString(),
  });
  console.log("💾 Scan saved locally to IndexedDB (Offline Mode)");
}

// Get all offline queued scans
export async function getOfflineScans() {
  const db = await initOfflineDB();
  return db.getAll(STORE_NAME);
}

// Clear or mark scans as synced once reconnected
export async function clearOfflineScans() {
  const db = await initOfflineDB();
  const tx = db.transaction(STORE_NAME, "readwrite");
  await tx.objectStore(STORE_NAME).clear();
  await tx.done;
  console.log("🔄 Offline scan queue successfully synced and cleared.");
}
