
import { openDB, DBSchema, IDBPDatabase } from 'idb';

const DB_NAME = 'app-session-store';
const STORE_NAME = 'sessions';
const DB_VERSION = 1;

interface AppDBSchema extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: {
        key: string;
        value: any;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<AppDBSchema>> | null = null;

function getDb(): Promise<IDBPDatabase<AppDBSchema>> {
  if (!dbPromise) {
    dbPromise = openDB<AppDBSchema>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

export async function get<T>(key: string): Promise<T | undefined> {
  const db = await getDb();
  const result = await db.get(STORE_NAME, key);
  return result?.value;
}

export async function set(key: string, value: any): Promise<void> {
  const db = await getDb();
  await db.put(STORE_NAME, { key, value });
}

export async function del(key: string): Promise<void> {
  const db = await getDb();
  await db.delete(STORE_NAME, key);
}

export async function clear(): Promise<void> {
    const db = await getDb();
    await db.clear(STORE_NAME);
}
