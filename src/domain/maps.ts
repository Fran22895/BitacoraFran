export interface Coordinates {
  latitude: number
  longitude: number
}

function toCoordinates(latitude: number, longitude: number): Coordinates | undefined {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return undefined
  return { latitude, longitude }
}

export function parseGoogleMapsCoordinates(url?: string): Coordinates | undefined {
  if (!url) return undefined

  const decoded = decodeURIComponent(url)
  const patterns = [
    /@(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
    /[?&](?:q|query|ll|center)=(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)/,
  ]

  for (const pattern of patterns) {
    const match = decoded.match(pattern)
    if (!match) continue
    const coordinates = toCoordinates(Number(match[1]), Number(match[2]))
    if (coordinates) return coordinates
  }

  return undefined
}

export function resolveCoordinates(latitude?: number, longitude?: number, googleMapsUrl?: string) {
  if (typeof latitude === 'number' && typeof longitude === 'number') {
    return toCoordinates(latitude, longitude)
  }

  return parseGoogleMapsCoordinates(googleMapsUrl)
}
