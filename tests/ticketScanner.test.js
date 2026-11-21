import { describe, expect, it } from 'vitest'
import { parseTicketText } from '../src/ticketScanner.js'

describe('распознавание текстового PDF', () => {
  it('предлагает маршрут, дату и время из демонстрационного билета', () => {
    const result = parseTicketText(`
      МАРШРУТ BCN → STN Барселона, Эль-Прат Лондон, Станстед
      ДАТА 1 декабря 2026 ВЫЛЕТ 06:20 РЕЙС UX 2601
    `)

    expect(result.hasUsefulData).toBe(true)
    expect(result.fields).toMatchObject({
      transport: 'plane',
      originCity: 'Барселона',
      destinationCity: 'Лондон',
      date: '2026-12-01',
      time: '06:20',
    })
  })

  it('возвращает ручной сценарий для PDF без известных данных', () => {
    expect(parseTicketText('Квитанция без маршрута и времени')).toEqual({
      fields: {},
      detected: [],
      hasUsefulData: false,
    })
  })
})
