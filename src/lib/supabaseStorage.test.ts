import { describe, expect, it } from 'vitest'
import { buildTripStoragePath, isStorageFileUrl, parseStorageFileUrl, toStorageFileUrl } from './supabaseStorage'

describe('supabase storage helpers', () => {
  it('crea rutas por viaje y categoria', () => {
    const path = buildTripStoragePath('trip-1', 'reserva', 'Hotel Fran.pdf')

    expect(path).toContain('trip-1/reserva/')
    expect(path).toContain('hotel-fran.pdf')
  })

  it('serializa y parsea URLs privadas de storage', () => {
    const fileUrl = toStorageFileUrl('trip-1/reserva/hotel.pdf')

    expect(isStorageFileUrl(fileUrl)).toBe(true)
    expect(parseStorageFileUrl(fileUrl)).toBe('trip-1/reserva/hotel.pdf')
    expect(parseStorageFileUrl('https://example.com/hotel.pdf')).toBeNull()
  })
})
