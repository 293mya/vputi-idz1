const DATABASE_NAME = 'vputi'
const TRIPS_STORE = 'trips'
const SETTINGS_STORE = 'settings'
const AUTH_KEY = 'authenticated'

function createMissingStores(database) {
  if (!database.objectStoreNames.contains(TRIPS_STORE)) {
    database.createObjectStore(TRIPS_STORE, { keyPath: 'id' })
  }
  if (!database.objectStoreNames.contains(SETTINGS_STORE)) {
    database.createObjectStore(SETTINGS_STORE)
  }
}

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => reject(request.error))
  })
}

function isDatabaseRequest(value) {
  return value
    && typeof value === 'object'
    && 'result' in value
    && typeof value.addEventListener === 'function'
}

function transactionDone(transaction) {
  return new Promise((resolve, reject) => {
    transaction.addEventListener('complete', resolve)
    transaction.addEventListener('abort', () => reject(transaction.error))
    transaction.addEventListener('error', () => reject(transaction.error))
  })
}

function openDatabaseAtCurrentVersion() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME)

    request.addEventListener('upgradeneeded', () => {
      createMissingStores(request.result)
    })
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => reject(request.error))
  })
}

function upgradeDatabase(version) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, version)

    request.addEventListener('upgradeneeded', () => createMissingStores(request.result))
    request.addEventListener('success', () => resolve(request.result))
    request.addEventListener('error', () => reject(request.error))
    request.addEventListener('blocked', () => reject(new Error('Не удалось обновить локальную базу')))
  })
}

async function openDatabase() {
  const database = await openDatabaseAtCurrentVersion()
  const hasRequiredStores = database.objectStoreNames.contains(TRIPS_STORE)
    && database.objectStoreNames.contains(SETTINGS_STORE)

  if (hasRequiredStores) return database

  const nextVersion = database.version + 1
  database.close()
  return upgradeDatabase(nextVersion)
}

async function runTransaction(storeName, mode, operation) {
  const database = await openDatabase()
  try {
    const transaction = database.transaction(storeName, mode)
    const done = transactionDone(transaction)
    const result = operation(transaction.objectStore(storeName))
    const resultPromise = isDatabaseRequest(result) ? requestToPromise(result) : Promise.resolve(result)
    const [resolvedResult] = await Promise.all([resultPromise, done])
    return resolvedResult
  } finally {
    database.close()
  }
}

export function loadTrips() {
  return runTransaction(TRIPS_STORE, 'readonly', (store) => store.getAll())
}

export function saveTrip(trip) {
  const { ticketUrl: _temporaryUrl, ...storedTrip } = trip
  return runTransaction(TRIPS_STORE, 'readwrite', (store) => store.put(storedTrip))
}

export function removeTrip(tripId) {
  return runTransaction(TRIPS_STORE, 'readwrite', (store) => store.delete(tripId))
}

export async function loadAuth() {
  const storedValue = await runTransaction(SETTINGS_STORE, 'readonly', (store) => store.get(AUTH_KEY))
  return storedValue === true || storedValue?.value === true
}

export function saveAuth() {
  return runTransaction(SETTINGS_STORE, 'readwrite', (store) => {
    if (store.keyPath === null) return store.put(true, AUTH_KEY)
    if (typeof store.keyPath === 'string') {
      return store.put({ [store.keyPath]: AUTH_KEY, value: true })
    }
    throw new Error('Неподдерживаемая схема хранилища настроек')
  })
}

export function clearAuth() {
  return runTransaction(SETTINGS_STORE, 'readwrite', (store) => store.delete(AUTH_KEY))
}
