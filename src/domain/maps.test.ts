import { describe, expect, it } from 'vitest'
import { parseGoogleMapsCoordinates, resolveCoordinates } from './maps'

describe('google maps helpers', () => {
  it('extrae coordenadas de URLs con segmento @lat,lng', () => {
    expect(parseGoogleMapsCoordinates('https://www.google.com/maps/place/Madrid/@40.4168,-3.7038,15z')).toEqual({
      latitude: 40.4168,
      longitude: -3.7038,
    })
  })

  it('extrae coordenadas de query q=lat,lng', () => {
    expect(parseGoogleMapsCoordinates('https://www.google.com/maps/search/?api=1&query=35.7148,139.7967')).toEqual({
      latitude: 35.7148,
      longitude: 139.7967,
    })
  })

  it('prioriza coordenadas manuales sobre el enlace', () => {
    expect(resolveCoordinates(38.7122, -9.1296, 'https://www.google.com/maps/@40.4168,-3.7038,15z')).toEqual({
      latitude: 38.7122,
      longitude: -9.1296,
    })
  })
})
