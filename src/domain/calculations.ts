import type { MissingDataIssue, MoneyAmount, Trip, TripTotals } from './types'

export function convertMoney(value?: MoneyAmount): number {
  if (!value || !Number.isFinite(value.amount) || !Number.isFinite(value.conversionRate)) {
    return 0
  }

  return Number((value.amount * value.conversionRate).toFixed(2))
}

export function sumMoney(values: Array<MoneyAmount | undefined>): number {
  return Number(values.reduce((total, value) => total + convertMoney(value), 0).toFixed(2))
}

export function calculateTripTotals(trip: Trip): TripTotals {
  const flights = sumMoney([
    ...trip.flights.map((flight) => flight.cost),
    ...trip.flights.map((flight) => flight.baggage.cost),
  ])
  const vehicleRentals = sumMoney([
    ...trip.vehicleRentals.map((rental) => rental.price),
    ...trip.vehicleRentals.map((rental) => rental.deposit),
    ...trip.vehicleRentals.map((rental) => rental.deductible),
  ])
  const accommodations = sumMoney([
    ...trip.accommodations.map((accommodation) => accommodation.cost),
    ...trip.accommodations.map((accommodation) => accommodation.touristTax),
    ...trip.accommodations.map((accommodation) => accommodation.deposit),
  ])
  const itinerary = sumMoney(trip.itineraryItems.map((item) => item.cost))
  const activities = sumMoney(trip.activities.map((activity) => activity.cost))
  const insurances = sumMoney(trip.insurances.map((insurance) => insurance.cost))
  const expenses = sumMoney(trip.expenses.map((expense) => expense.cost))
  const total = Number(
    (flights + vehicleRentals + accommodations + itinerary + activities + insurances + expenses).toFixed(2),
  )

  return {
    flights,
    vehicleRentals,
    accommodations,
    itinerary,
    activities,
    insurances,
    expenses,
    total,
    remainingBudget: Number((trip.budgetAmount - total).toFixed(2)),
    currency: trip.baseCurrency,
  }
}

export function formatMoney(amount: number, currency = 'EUR') {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function findMissingData(trip: Trip): MissingDataIssue[] {
  const issues: MissingDataIssue[] = []

  trip.flights.forEach((flight) => {
    if (!flight.flightNumber) {
      issues.push({ id: `${flight.id}-number`, section: 'Vuelos', label: `Falta numero en ${flight.company}` })
    }
    if (!flight.departureAt || !flight.arrivalAt) {
      issues.push({ id: `${flight.id}-time`, section: 'Vuelos', label: `Faltan horarios en ${flight.flightNumber}` })
    }
    if (!flight.bookingReference) {
      issues.push({ id: `${flight.id}-locator`, section: 'Vuelos', label: `Falta localizador en ${flight.flightNumber}` })
    }
  })

  trip.accommodations.forEach((accommodation) => {
    if (!accommodation.bookingReference) {
      issues.push({ id: `${accommodation.id}-booking`, section: 'Alojamientos', label: `Falta reserva en ${accommodation.name}` })
    }
    if (!accommodation.checkInAt || !accommodation.checkOutAt) {
      issues.push({ id: `${accommodation.id}-check`, section: 'Alojamientos', label: `Faltan horarios en ${accommodation.name}` })
    }
  })

  trip.vehicleRentals.forEach((rental) => {
    if (!rental.licensePlate) {
      issues.push({ id: `${rental.id}-plate`, section: 'Vehiculo', label: `Falta matricula en ${rental.company}` })
    }
    if (rental.conditionPhotoUrls.length === 0) {
      issues.push({ id: `${rental.id}-photos`, section: 'Vehiculo', label: `Faltan fotos de estado en ${rental.company}` })
    }
  })

  trip.itineraryItems.forEach((item) => {
    if (!item.latitude || !item.longitude) {
      issues.push({ id: `${item.id}-map`, section: 'Itinerario', label: `Falta ubicacion en ${item.title}` })
    }
  })

  return issues
}

export function getTripDateRangeLabel(startDate: string, endDate: string) {
  const formatter = new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })
  return `${formatter.format(new Date(startDate))} - ${formatter.format(new Date(endDate))}`
}

export function sortTripsByRecent<T extends { startDate: string; updatedAt: string }>(trips: T[]) {
  return [...trips].sort((a, b) => {
    const byStart = new Date(b.startDate).getTime() - new Date(a.startDate).getTime()
    if (byStart !== 0) return byStart
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  })
}
