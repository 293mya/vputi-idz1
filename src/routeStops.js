const TRANSITLAND_URL = 'https://transit.land/api/v2/routing/otp/plan'

export async function findRailStops({ originLatitude, originLongitude, destinationLatitude, destinationLongitude, date, time, signal }) {
  const apiKey = import.meta.env.VITE_TRANSITLAND_API_KEY

  const query = new URLSearchParams({
    fromPlace: `${originLatitude},${originLongitude}`,
    toPlace: `${destinationLatitude},${destinationLongitude}`,
    date,
    time,
    mode: 'RAIL',
    maxItineraries: '1',
  })
  const response = await fetch(`${TRANSITLAND_URL}?${query}`, {
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
    signal,
  })
  if (response.status === 401 || response.status === 403) return { status: 'not-configured', count: null }
  if (!response.ok) throw new Error('ROUTE_LOOKUP_FAILED')

  const legs = payloadItinerary(await response.json())?.legs ?? []
  const railLegs = legs.filter((leg) => leg.mode === 'RAIL' || leg.routeType === 2)
  if (!railLegs.length) return { status: 'not-found', count: null }

  return {
    status: 'ready',
    count: railLegs.reduce((total, leg) => total + (leg.intermediateStops?.length ?? 0), 0),
  }
}

function payloadItinerary(payload) {
  return payload?.plan?.itineraries?.[0] ?? null
}
