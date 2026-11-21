export function tripDateTime(trip) {
  return new Date(`${trip.date}T${trip.time}`)
}

function tripArrivalDateTime(trip) {
  if (!trip.arrivalDate || !trip.arrivalTime) return null
  return new Date(`${trip.arrivalDate}T${trip.arrivalTime}`)
}

export function isTripPast(trip, now = new Date()) {
  return (tripArrivalDateTime(trip) ?? tripDateTime(trip)) < now
}

export function formatDuration(trip) {
  const arrival = tripArrivalDateTime(trip)
  if (!arrival) return null

  const minutes = Math.round((arrival - tripDateTime(trip)) / 60000)
  if (minutes <= 0) return null

  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  if (!hours) return `${rest} мин`
  if (!rest) return `${hours} ч`
  return `${hours} ч ${rest} мин`
}

export function formatStopsCount(count) {
  if (count === null || count === undefined || count === '') return null

  const value = Number(count)
  if (!Number.isInteger(value) || value < 0) return null
  const lastTwoDigits = value % 100
  const lastDigit = value % 10
  const noun = lastTwoDigits >= 11 && lastTwoDigits <= 14
    ? 'остановок'
    : lastDigit === 1
      ? 'остановка'
      : lastDigit >= 2 && lastDigit <= 4
        ? 'остановки'
        : 'остановок'

  return `${value} ${noun}`
}

export function sortTrips(trips) {
  return [...trips].sort((a, b) => tripDateTime(a) - tripDateTime(b))
}

export function sortTripsForDisplay(trips, now = new Date()) {
  const upcoming = trips
    .filter((trip) => tripDateTime(trip) >= now)
    .sort((a, b) => tripDateTime(a) - tripDateTime(b))
  const current = trips
    .filter((trip) => tripDateTime(trip) < now && !isTripPast(trip, now))
    .sort((a, b) => tripDateTime(b) - tripDateTime(a))
  const past = trips
    .filter((trip) => isTripPast(trip, now))
    .sort((a, b) => tripDateTime(b) - tripDateTime(a))

  return [...upcoming, ...current, ...past]
}

export function splitTripsByStatus(trips, now = new Date()) {
  const sortedTrips = sortTripsForDisplay(trips, now)
  return {
    upcoming: sortedTrips.filter((trip) => !isTripPast(trip, now)),
    past: sortedTrips.filter((trip) => isTripPast(trip, now)),
  }
}

export function groupTrips(trips) {
  return trips.reduce((groups, trip) => {
    const currentGroup = groups.at(-1)

    if (currentGroup?.date === trip.date) {
      currentGroup.trips.push(trip)
    } else {
      groups.push({ date: trip.date, trips: [trip] })
    }

    return groups
  }, [])
}

export function findNearestTripId(trips, now = new Date()) {
  return sortTrips(trips).find((trip) => tripDateTime(trip) >= now)?.id ?? null
}
