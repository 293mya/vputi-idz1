import { describe, expect, it } from 'vitest'
import { findNearestTripId, formatDuration, formatStopsCount, getArrivalValidationError, groupTrips, isTripPast, sortTrips, sortTripsForDisplay, splitTripsByStatus } from '../src/tripUtils.js'

function trip(id, date, time, arrivalDate = '', arrivalTime = '') {
  return { id, date, time, arrivalDate, arrivalTime }
}

describe('логика поездок', () => {
  it('сортирует поездки и объединяет одинаковые даты', () => {
    const sorted = sortTrips([
      trip('late', '2027-04-02', '18:00'),
      trip('first', '2027-04-01', '09:00'),
      trip('second', '2027-04-01', '12:00'),
    ])

    expect(sorted.map(({ id }) => id)).toEqual(['first', 'second', 'late'])
    expect(groupTrips(sorted).map((group) => [group.date, group.trips.length])).toEqual([
      ['2027-04-01', 2],
      ['2027-04-02', 1],
    ])
  })

  it('выбирает только ближайшую будущую поездку', () => {
    const trips = [
      trip('future-late', '2027-04-02', '18:00'),
      trip('past', '2027-04-01', '08:00'),
      trip('future-first', '2027-04-01', '12:00'),
    ]

    expect(findNearestTripId(trips, new Date('2027-04-01T10:00'))).toBe('future-first')
    expect(findNearestTripId(trips, new Date('2027-04-03T10:00'))).toBeNull()
  })

  it('считает длительность и отвергает неполное или раннее прибытие', () => {
    expect(formatDuration(trip('valid', '2027-04-01', '14:30', '2027-04-01', '17:00'))).toBe('2 ч 30 мин')
    expect(formatDuration(trip('overnight', '2027-04-01', '23:30', '2027-04-02', '00:15'))).toBe('45 мин')
    expect(formatDuration(trip('missing', '2027-04-01', '14:30'))).toBeNull()
    expect(formatDuration(trip('early', '2027-04-01', '14:30', '2027-04-01', '14:00'))).toBeNull()
  })

  it('показывает ошибку у даты или времени прибытия по причине ошибки', () => {
    expect(getArrivalValidationError({
      date: '2027-04-02', time: '09:00', arrivalDate: '2027-04-01', arrivalTime: '18:00',
    })).toEqual({
      field: 'arrivalDate', message: 'Дата прибытия должна быть не раньше даты отправления',
    })

    expect(getArrivalValidationError({
      date: '2027-04-02', time: '09:00', arrivalDate: '2027-04-02', arrivalTime: '08:30',
    })).toEqual({
      field: 'arrivalTime', message: 'Время прибытия должно быть позже времени отправления',
    })

    expect(getArrivalValidationError({
      date: '2027-04-02', time: '09:00', arrivalDate: '2027-04-03', arrivalTime: '08:30',
    })).toBeNull()
  })

  it('склоняет число остановок', () => {
    expect(formatStopsCount(null)).toBeNull()
    expect(formatStopsCount(undefined)).toBeNull()
    expect(formatStopsCount('')).toBeNull()
    expect(formatStopsCount(0)).toBe('0 остановок')
    expect(formatStopsCount(1)).toBe('1 остановка')
    expect(formatStopsCount(4)).toBe('4 остановки')
    expect(formatStopsCount(8)).toBe('8 остановок')
    expect(formatStopsCount(14)).toBe('14 остановок')
  })

  it('показывает сначала ближайшие будущие, затем прошедшие в обратном порядке', () => {
    const now = new Date('2027-04-01T12:00:00')
    const trips = [
      trip('oldest', '2027-03-20', '10:00', '2027-03-20', '11:00'),
      trip('later', '2027-04-03', '10:00', '2027-04-03', '11:00'),
      trip('latest-past', '2027-03-31', '10:00', '2027-03-31', '11:00'),
      trip('nearest', '2027-04-01', '15:00', '2027-04-01', '16:00'),
    ]

    expect(sortTripsForDisplay(trips, now).map(({ id }) => id)).toEqual([
      'nearest',
      'later',
      'latest-past',
      'oldest',
    ])
    expect(isTripPast(trips[0], now)).toBe(true)
    expect(isTripPast(trips[1], now)).toBe(false)
  })

  it('не смешивает завершённую и продолжающуюся поездки одного дня', () => {
    const now = new Date('2027-04-01T12:00:00')
    const trips = [
      trip('done', '2027-04-01', '09:00', '2027-04-01', '10:00'),
      trip('in-progress', '2027-04-01', '11:00', '2027-04-01', '13:00'),
    ]

    const { upcoming, past } = splitTripsByStatus(trips, now)
    expect(upcoming.map(({ id }) => id)).toEqual(['in-progress'])
    expect(past.map(({ id }) => id)).toEqual(['done'])
  })
})
