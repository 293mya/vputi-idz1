import 'fake-indexeddb/auto'
import { afterEach, describe, expect, it } from 'vitest'
import { clearAuth, loadAuth, loadTrips, removeTrip, saveAuth, saveTrip } from '../src/storage.js'

function deleteDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase('vputi')
    request.addEventListener('success', resolve)
    request.addEventListener('error', () => reject(request.error))
    request.addEventListener('blocked', () => reject(new Error('База данных занята')))
  })
}

function createLegacyDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('vputi', 8)
    request.addEventListener('upgradeneeded', () => {
      const database = request.result
      database.createObjectStore('trips', { keyPath: 'id' })
      database.createObjectStore('settings', { keyPath: 'key' })
    })
    request.addEventListener('success', () => {
      request.result.close()
      resolve()
    })
    request.addEventListener('error', () => reject(request.error))
  })
}

afterEach(async () => {
  await deleteDatabase()
})

describe('хранилище поездок', () => {
  it('сохраняет данные поездки и содержимое PDF', async () => {
    const ticketBlob = new Blob(['demo ticket'], { type: 'application/pdf' })
    const trip = {
      id: 'trip-1',
      transport: 'train',
      originCity: 'Барселона',
      originPlace: 'Barcelona Sants',
      originAddress: '',
      destinationCity: 'Мадрид',
      destinationPlace: 'Madrid Atocha',
      destinationAddress: '',
      date: '2026-11-19',
      time: '09:00',
      arrivalDate: '2026-11-19',
      arrivalTime: '11:45',
      ticketName: 'ticket.pdf',
      ticketBlob,
      ticketUrl: 'blob:temporary-url',
    }

    await saveTrip(trip)
    const [storedTrip] = await loadTrips()

    expect(storedTrip).toMatchObject({
      id: 'trip-1',
      ticketName: 'ticket.pdf',
      originCity: 'Барселона',
      destinationCity: 'Мадрид',
    })
    expect(storedTrip.ticketUrl).toBeUndefined()
    expect(storedTrip.ticketBlob).toBeInstanceOf(Blob)
    expect(await storedTrip.ticketBlob.text()).toBe('demo ticket')
  })

  it('обновляет и удаляет запись по одному id', async () => {
    const baseTrip = {
      id: 'trip-2',
      originCity: 'Тестоград',
      destinationCity: 'Проверск',
      ticketName: 'first.pdf',
      ticketBlob: new Blob(['first'], { type: 'application/pdf' }),
    }

    await saveTrip(baseTrip)
    await saveTrip({
      ...baseTrip,
      destinationCity: 'Проверск-2',
      ticketName: 'replacement.pdf',
      ticketBlob: new Blob(['replacement'], { type: 'application/pdf' }),
    })

    const [updatedTrip] = await loadTrips()
    expect(updatedTrip.destinationCity).toBe('Проверск-2')
    expect(updatedTrip.ticketName).toBe('replacement.pdf')
    expect(await updatedTrip.ticketBlob.text()).toBe('replacement')

    await removeTrip('trip-2')
    expect(await loadTrips()).toEqual([])
  })
})

describe('демонстрационная сессия', () => {
  it('хранит только булев признак входа и удаляет его при выходе', async () => {
    expect(await loadAuth()).toBe(false)

    await saveAuth()
    expect(await loadAuth()).toBe(true)

    await clearAuth()
    expect(await loadAuth()).toBe(false)
  })

  it('работает с таблицей настроек из старой версии приложения', async () => {
    await createLegacyDatabase()

    await saveAuth()
    expect(await loadAuth()).toBe(true)

    await clearAuth()
    expect(await loadAuth()).toBe(false)
  })
})
