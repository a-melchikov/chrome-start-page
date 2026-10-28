export interface StorageChange {
  oldValue?: unknown;
  newValue?: unknown;
}

type Changes = Record<string, StorageChange>;
type Area = 'local' | 'session';
type Listener = (changes: Changes) => void;
type StorageKeys = string | string[] | Record<string, unknown> | null;

export function createWebStorage(
  databaseName = 'chrome-start-page-web',
  factory: IDBFactory = indexedDB,
) {
  let connection: Promise<IDBDatabase> | null = null;
  const listeners = {
    local: new Set<Listener>(),
    session: new Set<Listener>(),
  };
  const channel = new BroadcastChannel(databaseName);

  const emit = (area: Area, changes: Changes) => {
    for (const listener of listeners[area]) {
      try {
        listener(structuredClone(changes));
      } catch (error) {
        console.error('Web storage listener failed:', error);
      }
    }
  };
  channel.onmessage = (event: MessageEvent<unknown>) => {
    const data = event.data;
    if (
      data &&
      typeof data === 'object' &&
      'area' in data &&
      (data.area === 'local' || data.area === 'session') &&
      'changes' in data &&
      data.changes &&
      typeof data.changes === 'object'
    ) {
      emit(data.area, data.changes as Changes);
    }
  };

  const open = () => {
    connection ??= new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open(databaseName, 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore('local');
        request.result.createObjectStore('session');
      };
      request.onerror = () => {
        connection = null;
        reject(request.error);
      };
      request.onsuccess = () => {
        const db = request.result;
        db.onversionchange = () => {
          db.close();
          connection = null;
        };
        resolve(db);
      };
    });
    return connection;
  };

  const makeArea = (area: Area) => ({
    onChanged: {
      addListener: (listener: Listener) => listeners[area].add(listener),
      removeListener: (listener: Listener) => listeners[area].delete(listener),
    },
    async get(keys?: StorageKeys): Promise<Record<string, unknown>> {
      const db = await open();
      return new Promise((resolve, reject) => {
        const tx = db.transaction(area, 'readonly');
        const store = tx.objectStore(area);
        const result: Record<string, unknown> = Object.create(null);
        tx.oncomplete = () => resolve(result);
        tx.onabort = tx.onerror = () => reject(tx.error);
        if (keys === undefined || keys === null) {
          const request = store.openCursor();
          request.onsuccess = () => {
            const cursor = request.result;
            if (!cursor) return;
            result[String(cursor.key)] = cursor.value;
            cursor.continue();
          };
        } else {
          const selected =
            typeof keys === 'string'
              ? [keys]
              : Array.isArray(keys)
                ? keys
                : Object.keys(keys);
          for (const key of selected) {
            const request = store.get(key);
            request.onsuccess = () => {
              if (request.result !== undefined) result[key] = request.result;
              else if (typeof keys === 'object' && !Array.isArray(keys)) {
                result[key] = keys[key];
              }
            };
          }
        }
      });
    },
    set: (values: Record<string, unknown>) => mutate(area, 'set', values),
    remove: (keys: string | string[]) =>
      mutate(area, 'remove', typeof keys === 'string' ? [keys] : keys),
    clear: () => mutate(area, 'clear'),
  });

  async function mutate(
    area: Area,
    action: 'set' | 'remove' | 'clear',
    values?: Record<string, unknown> | string[],
  ): Promise<void> {
    // Clone before opening a transaction so unsupported values reject cleanly
    // and callers cannot mutate an in-flight write.
    values = structuredClone(values);
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(area, 'readwrite');
      const store = tx.objectStore(area);
      const changes: Changes = Object.create(null);
      tx.onabort = tx.onerror = () => reject(tx.error);
      tx.oncomplete = () => {
        if (Object.keys(changes).length) {
          emit(area, changes);
          channel.postMessage({ area, changes });
        }
        resolve();
      };
      if (action === 'clear') {
        const request = store.openCursor();
        request.onsuccess = () => {
          const cursor = request.result;
          if (!cursor) return;
          changes[String(cursor.key)] = { oldValue: cursor.value };
          cursor.delete();
          cursor.continue();
        };
        return;
      }
      const keys = Array.isArray(values) ? values : Object.keys(values ?? {});
      for (const key of keys) {
        const request = store.get(key);
        request.onsuccess = () => {
          const oldValue: unknown = request.result;
          if (action === 'set' && values && !Array.isArray(values)) {
            changes[key] = { oldValue, newValue: values[key] };
            store.put(values[key], key);
          } else if (oldValue !== undefined) {
            changes[key] = { oldValue };
            store.delete(key);
          }
        };
      }
    });
  }

  return {
    local: makeArea('local'),
    session: makeArea('session'),
    async close() {
      channel.close();
      if (connection) (await connection).close();
      connection = null;
    },
  };
}
