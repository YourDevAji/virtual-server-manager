export type ActivityType =
  | 'create'
  | 'clone'
  | 'start'
  | 'stop'
  | 'delete'
  | 'install_service'
  | 'add_user'
  | 'snapshot_create'
  | 'snapshot_restore'

export interface ActivityLogEntry {
  id: number
  instanceId: string
  type: ActivityType
  title: string
  description?: string
  status: 'success' | 'error'
  createdAt: string
}

const DB_NAME = 'vsm-activity-db'
const DB_VERSION = 1
const STORE_NAME = 'logs'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' })
        store.createIndex('instanceId', 'instanceId', { unique: false })
        store.createIndex('createdAt', 'createdAt', { unique: false })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'))
  })
}

export async function addActivityLog(entry: ActivityLogEntry): Promise<void> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    store.put(entry)
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error || new Error('Failed to write activity log'))
  })
}

export async function getActivityLogsForInstance(instanceId: string): Promise<ActivityLogEntry[]> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const index = store.index('instanceId')
    const request = index.getAll(IDBKeyRange.only(instanceId))

    request.onsuccess = () => {
      const results = (request.result as ActivityLogEntry[]) || []
      results.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
      resolve(results)
    }
    request.onerror = () => reject(request.error || new Error('Failed to read activity logs'))
  })
}
