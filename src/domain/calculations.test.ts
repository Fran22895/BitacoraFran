import { describe, expect, it } from 'vitest'
import { calculateTripTotals, convertMoney, findMissingData, sortTripsByRecent } from './calculations'
import { seedTrips } from './seed'
import type { Trip } from './types'

describe('calculos de viaje', () => {
  it('convierte importes con tasa manual', () => {
    expect(convertMoney({ amount: 100, currency: 'USD', conversionRate: 0.92 })).toBe(92)
  })

  it('suma costes del viaje por categoria y calcula restante', () => {
    const trip = seedTrips[0]
    const totals = calculateTripTotals(trip)

    expect(totals.flights).toBeGreaterThan(0)
    expect(totals.accommodations).toBeGreaterThan(0)
    expect(totals.total).toBeGreaterThan(totals.flights)
    expect(totals.remainingBudget).toBe(Number((trip.budgetAmount - totals.total).toFixed(2)))
  })

  it('detecta datos incompletos accionables', () => {
    const trip: Trip = {
      ...seedTrips[0],
      flights: [{ ...seedTrips[0].flights[0], flightNumber: '', bookingReference: '' }],
    }

    expect(findMissingData(trip).map((issue) => issue.section)).toContain('Vuelos')
  })

  it('ordena viajes por fecha mas reciente', () => {
    const sorted = sortTripsByRecent(seedTrips)

    expect(sorted[0].startDate >= sorted[1].startDate).toBe(true)
  })
})
