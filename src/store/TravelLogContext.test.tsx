import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Trip } from '../domain/types'
import { demoProfile, seedTrips } from '../domain/seed'
import { TravelLogProvider, useTravelLog } from './TravelLogContext'

function DuplicateHarness({ onDuplicated }: { onDuplicated: (trip: Trip) => void }) {
  const { duplicateTrip } = useTravelLog()

  return (
    <button
      type="button"
      onClick={() => {
        void duplicateTrip('trip_japon_2027').then(onDuplicated)
      }}
    >
      Duplicar
    </button>
  )
}

describe('TravelLogProvider', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('duplica restaurantes de viajes publicos sin copiar informacion sensible', async () => {
    const user = userEvent.setup()
    const onDuplicated = vi.fn()
    const sourceTrip = seedTrips.find((trip) => trip.id === 'trip_japon_2027')
    expect(sourceTrip).toBeDefined()
    const publicTrips = seedTrips.map((trip) => (trip.id === 'trip_japon_2027' ? { ...trip, isPublic: true } : trip))

    localStorage.setItem('bitacorafran-auth-mode', 'demo')
    localStorage.setItem('bitacorafran-profile', JSON.stringify({ ...demoProfile, id: 'user_visitante' }))
    localStorage.setItem('bitacorafran-trips', JSON.stringify(publicTrips))

    render(
      <TravelLogProvider>
        <DuplicateHarness onDuplicated={onDuplicated} />
      </TravelLogProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'Duplicar' }))

    expect(onDuplicated).toHaveBeenCalledOnce()
    const duplicatedTrip = onDuplicated.mock.calls[0][0] as Trip
    expect(duplicatedTrip.restaurants).toHaveLength(sourceTrip!.restaurants.length)
    expect(duplicatedTrip.flights).toHaveLength(0)
    expect(duplicatedTrip.accommodations).toHaveLength(0)
    expect(duplicatedTrip.vehicleRentals).toHaveLength(0)
    expect(duplicatedTrip.insurances).toHaveLength(0)
    expect(duplicatedTrip.documents).toHaveLength(0)
  })
})
