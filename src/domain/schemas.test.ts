import { describe, expect, it } from 'vitest'
import { accommodationSchema, activitySchema, expenseSchema, flightSchema, tripFormSchema } from './schemas'

const money = { amount: 10, currency: 'EUR', conversionRate: 1 }

describe('validaciones zod', () => {
  it('valida el formulario base de viaje', () => {
    const parsed = tripFormSchema.safeParse({
      title: 'Islandia',
      status: 'planned',
      destinationsText: 'Reykjavik',
      startDate: '2027-01-01',
      endDate: '2027-01-10',
      coverImageUrl: '',
      companionsText: '',
      budgetAmount: 2500,
      baseCurrency: 'eur',
      tagsText: 'naturaleza',
      notes: '',
    })

    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.data.baseCurrency).toBe('EUR')
    }
  })

  it('rechaza vuelos sin numero', () => {
    const parsed = flightSchema.safeParse({
      legType: 'ida',
      isInternational: true,
      company: 'Iberia',
      flightNumber: '',
      originAirport: 'MAD',
      destinationAirport: 'KEF',
      departureAt: '2027-01-01T09:00',
      arrivalAt: '2027-01-01T13:00',
      cost: money,
      baggage: { cabin: true, checked: false, weightKg: 0, cost: money },
      priorityBoarding: false,
      extras: [],
      notes: '',
    })

    expect(parsed.success).toBe(false)
  })

  it('valida alojamiento, actividad y gasto', () => {
    expect(
      accommodationSchema.safeParse({
        type: 'hotel',
        name: 'Hotel Norte',
        address: 'Calle 1',
        checkInAt: '2027-01-01T15:00',
        checkOutAt: '2027-01-02T11:00',
        cost: money,
      }).success,
    ).toBe(true)

    expect(
      activitySchema.safeParse({
        name: 'Museo',
        cost: money,
        paymentStatus: 'pagado',
      }).success,
    ).toBe(true)

    expect(
      expenseSchema.safeParse({
        category: 'Comida',
        description: 'Cena',
        cost: money,
        paid: true,
      }).success,
    ).toBe(true)
  })
})
