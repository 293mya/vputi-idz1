const PHOTON_URL = 'https://photon.komoot.io/api/'
const searchCache = new Map()

function searchText(transport, query, place) {
  const kind = transport === 'plane' ? 'airport' : transport === 'train' ? 'station' : 'bus station'
  return [place, kind, query].filter(Boolean).join(' ')
}

function addressFrom(properties) {
  return [properties.street, properties.housenumber, properties.district, properties.state, properties.country]
    .filter(Boolean)
    .join(', ')
}

function isExpectedPlace(transport, properties) {
  const value = String(properties.osm_value ?? '').toLowerCase()
  if (transport === 'plane') return ['aerodrome', 'airport', 'terminal'].includes(value)
  if (transport === 'train') return ['station', 'halt', 'train_station'].includes(value)
  return true
}

export async function searchGlobalPlaces({ transport, city, place = '', signal }) {
  const cacheKey = `${transport}:${city.trim().toLocaleLowerCase('ru-RU')}:${place.trim().toLocaleLowerCase('ru-RU')}`
  if (searchCache.has(cacheKey)) return searchCache.get(cacheKey)

  const params = new URLSearchParams({ q: searchText(transport, city, place), limit: '12' })
  const response = await fetch(`${PHOTON_URL}?${params}`, { signal })
  if (!response.ok) throw new Error('PLACE_SEARCH_FAILED')

  const payload = await response.json()
  const suggestions = (payload.features ?? [])
    .filter(({ properties }) => isExpectedPlace(transport, properties ?? {}))
    .map(({ properties = {}, geometry }) => ({
      city: properties.city || properties.locality || city,
      name: properties.name || properties.locality || place,
      address: addressFrom(properties) || properties.country || 'Адрес не указан',
      latitude: geometry?.coordinates?.[1] ?? null,
      longitude: geometry?.coordinates?.[0] ?? null,
    }))
    .filter(({ name }) => Boolean(name))

  const limitedSuggestions = suggestions.slice(0, 5)
  searchCache.set(cacheKey, limitedSuggestions)
  return limitedSuggestions
}
