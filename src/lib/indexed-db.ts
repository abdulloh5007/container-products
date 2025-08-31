
import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'app-data-store';
const STORE_NAME = 'keyval';
const DB_VERSION = 1;

interface AppDBSchema extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: any;
  };
}

let dbPromise: Promise<IDBPDatabase<AppDBSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<AppDBSchema>> {
  if (typeof window === 'undefined') {
    // Return a mock implementation for SSR
    return {
      get: () => Promise.resolve(undefined),
      set: () => Promise.resolve(),
      del: () => Promise.resolve(),
      clear: () => Promise.resolve(),
    } as any;
  }
  
  if (!dbPromise) {
    dbPromise = openDB<AppDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      },
    });
  }
  return dbPromise;
}

export async function get<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  return db.get(STORE_NAME, key);
}

export async function set(key: string, value: any): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, value, key);
}

export async function del(key: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, key);
}

export async function clear(): Promise<void> {
    const db = await getDb();
    await db.clear(STORE_NAME);
}
