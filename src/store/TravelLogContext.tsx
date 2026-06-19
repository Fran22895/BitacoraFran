/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { createId } from '../domain/ids'
import { demoProfile, seedTrips } from '../domain/seed'
import type { Trip, TripCollectionItem, TripCollectionKey, TripMember, TripStatus, UserProfile } from '../domain/types'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import {
  addRemoteTripItem,
  createRemoteTrip,
  deleteRemoteTrip,
  deleteRemoteTripItem,
  fetchRemoteTrips,
  reorderRemoteItineraryItems,
  updateRemoteTrip,
  updateRemoteTripItem,
  upsertProfileFromUser,
} from '../lib/supabaseTrips'

const tripsStorageKey = 'bitacorafran-trips'
const profileStorageKey = 'bitacorafran-profile'
const authModeStorageKey = 'bitacorafran-auth-mode'

type AuthMode = 'demo' | 'remote' | null

export interface TripDraft {
  title: string
  status: TripStatus
  destinations: string[]
  startDate: string
  endDate: string
  coverImageUrl?: string
  companions: string[]
  budgetAmount: number
  baseCurrency: string
  tags: string[]
  notes?: string
}

interface TravelLogContextValue {
  profile: UserProfile | null
  trips: Trip[]
  authMode: AuthMode
  isLoading: boolean
  lastError: string | null
  isRemoteMode: boolean
  loginAsDemo: () => void
  logout: () => Promise<void>
  createTrip: (draft: TripDraft) => Trip
  updateTrip: (tripId: string, patch: Partial<TripDraft>) => void
  deleteTrip: (tripId: string) => void
  addTripItem: <K extends TripCollectionKey>(tripId: string, collection: K, item: Omit<TripCollectionItem<K>, 'id' | 'tripId'>) => void
  updateTripItem: <K extends TripCollectionKey>(
    tripId: string,
    collection: K,
    itemId: string,
    patch: Partial<Omit<TripCollectionItem<K>, 'id' | 'tripId'>>,
  ) => void
  deleteTripItem: <K extends TripCollectionKey>(tripId: string, collection: K, itemId: string) => void
  reorderItineraryItems: (tripId: string, orderedItemIds: string[]) => void
}

const TravelLogContext = createContext<TravelLogContextValue | undefined>(undefined)

function readStoredTrips() {
  const storedTrips = localStorage.getItem(tripsStorageKey)
  if (!storedTrips) return seedTrips

  try {
    return JSON.parse(storedTrips) as Trip[]
  } catch {
    return seedTrips
  }
}

function readStoredProfile() {
  const storedProfile = localStorage.getItem(profileStorageKey)
  if (!storedProfile) return null

  try {
    return JSON.parse(storedProfile) as UserProfile
  } catch {
    return null
  }
}

function readStoredAuthMode(): AuthMode {
  const storedAuthMode = localStorage.getItem(authModeStorageKey)
  return storedAuthMode === 'demo' || storedAuthMode === 'remote' ? storedAuthMode : null
}

function touchTrip<T extends Trip>(trip: T): T {
  return { ...trip, updatedAt: new Date().toISOString() }
}

function createEmptyTrip(draft: TripDraft, owner: UserProfile, id = createId('trip')): Trip {
  const ownerMember: TripMember = {
    id: createId('member'),
    tripId: id,
    userId: owner.id,
    name: owner.name,
    email: owner.email,
    role: 'owner',
  }
  const now = new Date().toISOString()

  return {
    id,
    ...draft,
    ownerId: owner.id,
    createdAt: now,
    updatedAt: now,
    members: [ownerMember],
    flights: [],
    vehicleRentals: [],
    accommodations: [],
    itineraryDays: [],
    itineraryItems: [],
    activities: [],
    contacts: [],
    insurances: [],
    documents: [],
    journalEntries: [],
    expenses: [],
  }
}

export function TravelLogProvider({ children }: PropsWithChildren) {
  const [profile, setProfile] = useState<UserProfile | null>(() => readStoredProfile())
  const [trips, setTrips] = useState<Trip[]>(() => readStoredTrips())
  const [authMode, setAuthMode] = useState<AuthMode>(() => readStoredAuthMode())
  const [isLoading, setIsLoading] = useState(false)
  const [lastError, setLastError] = useState<string | null>(null)

  const isRemoteMode = Boolean(isSupabaseConfigured && supabase && authMode === 'remote' && profile)

  const reportError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Ha ocurrido un error inesperado.'
    setLastError(message)
  }, [])

  useEffect(() => {
    if (authMode === 'demo') {
      localStorage.setItem(tripsStorageKey, JSON.stringify(trips))
    }
  }, [authMode, trips])

  useEffect(() => {
    if (profile) {
      localStorage.setItem(profileStorageKey, JSON.stringify(profile))
    } else {
      localStorage.removeItem(profileStorageKey)
    }
  }, [profile])

  useEffect(() => {
    if (authMode) {
      localStorage.setItem(authModeStorageKey, authMode)
    } else {
      localStorage.removeItem(authModeStorageKey)
    }
  }, [authMode])

  useEffect(() => {
    if (!supabase) return undefined
    const client = supabase

    const loadRemoteSession = async () => {
      setIsLoading(true)
      const { data, error } = await client.auth.getSession()
      if (error) {
        reportError(error)
        setIsLoading(false)
        return
      }

      const user = data.session?.user
      if (!user) {
        if (readStoredAuthMode() === 'remote') {
          setProfile(null)
          setAuthMode(null)
          setTrips([])
        }
        setIsLoading(false)
        return
      }

      try {
        const nextProfile = await upsertProfileFromUser(client, user)
        const remoteTrips = await fetchRemoteTrips(client)
        setProfile(nextProfile)
        setAuthMode('remote')
        setTrips(remoteTrips)
        setLastError(null)
      } catch (remoteError) {
        reportError(remoteError)
      } finally {
        setIsLoading(false)
      }
    }

    void loadRemoteSession()

    const { data } = client.auth.onAuthStateChange((_event, session) => {
      const user = session?.user
      if (!user) {
        if (readStoredAuthMode() === 'remote') {
          setProfile(null)
          setAuthMode(null)
          setTrips([])
        }
        return
      }

      void (async () => {
        setIsLoading(true)
        try {
          const nextProfile = await upsertProfileFromUser(client, user)
          const remoteTrips = await fetchRemoteTrips(client)
          setProfile(nextProfile)
          setAuthMode('remote')
          setTrips(remoteTrips)
          setLastError(null)
        } catch (remoteError) {
          reportError(remoteError)
        } finally {
          setIsLoading(false)
        }
      })()
    })

    return () => data.subscription.unsubscribe()
  }, [reportError])

  const loginAsDemo = useCallback(() => {
    setAuthMode('demo')
    setProfile(demoProfile)
    setTrips(readStoredTrips())
    setLastError(null)
  }, [])

  const logout = useCallback(async () => {
    if (supabase) {
      await supabase.auth.signOut()
    }
    setProfile(null)
    setAuthMode(null)
    setTrips([])
    setLastError(null)
  }, [])

  const createTrip = useCallback(
    (draft: TripDraft) => {
      const owner = profile ?? demoProfile
      const trip = createEmptyTrip(draft, owner)

      setTrips((currentTrips) => [trip, ...currentTrips])
      setLastError(null)

      if (isRemoteMode && supabase && profile) {
        void createRemoteTrip(supabase, draft, profile)
          .then((remoteTrip) => {
            setTrips((currentTrips) =>
              currentTrips.map((candidate) => (candidate.id === trip.id ? remoteTrip : candidate)),
            )
          })
          .catch((error) => {
            reportError(error)
            setTrips((currentTrips) => currentTrips.filter((candidate) => candidate.id !== trip.id))
          })
      }

      return trip
    },
    [isRemoteMode, profile, reportError],
  )

  const updateTrip = useCallback((tripId: string, patch: Partial<TripDraft>) => {
    setTrips((currentTrips) =>
      currentTrips.map((trip) => (trip.id === tripId ? touchTrip({ ...trip, ...patch }) : trip)),
    )

    if (isRemoteMode && supabase) {
      void updateRemoteTrip(supabase, tripId, patch).catch(reportError)
    }
  }, [isRemoteMode, reportError])

  const deleteTrip = useCallback((tripId: string) => {
    setTrips((currentTrips) => currentTrips.filter((trip) => trip.id !== tripId))

    if (isRemoteMode && supabase) {
      void deleteRemoteTrip(supabase, tripId).catch(reportError)
    }
  }, [isRemoteMode, reportError])

  const addTripItem = useCallback(
    <K extends TripCollectionKey>(tripId: string, collection: K, item: Omit<TripCollectionItem<K>, 'id' | 'tripId'>) => {
      const optimisticId = createId(collection)
      setTrips((currentTrips) =>
        currentTrips.map((trip) => {
          if (trip.id !== tripId) return trip

          const existing = trip[collection] as unknown as Array<TripCollectionItem<K> & { id: string }>
          const nextItem = { ...item, id: optimisticId, tripId } as TripCollectionItem<K>

          return touchTrip({
            ...trip,
            [collection]: [...existing, nextItem],
          } as Trip)
        }),
      )

      if (isRemoteMode && supabase) {
        void addRemoteTripItem(supabase, tripId, collection, item)
          .then((remoteItem) => {
            setTrips((currentTrips) =>
              currentTrips.map((trip) => {
                if (trip.id !== tripId) return trip

                const existing = trip[collection] as unknown as Array<TripCollectionItem<K> & { id: string }>
                return touchTrip({
                  ...trip,
                  [collection]: existing.map((candidate) =>
                    candidate.id === optimisticId ? remoteItem : candidate,
                  ),
                } as Trip)
              }),
            )
          })
          .catch((error) => {
            reportError(error)
            setTrips((currentTrips) =>
              currentTrips.map((trip) => {
                if (trip.id !== tripId) return trip
                const existing = trip[collection] as unknown as Array<TripCollectionItem<K> & { id: string }>
                return touchTrip({
                  ...trip,
                  [collection]: existing.filter((candidate) => candidate.id !== optimisticId),
                } as Trip)
              }),
            )
          })
      }
    },
    [isRemoteMode, reportError],
  )

  const updateTripItem = useCallback(
    <K extends TripCollectionKey>(
      tripId: string,
      collection: K,
      itemId: string,
      patch: Partial<Omit<TripCollectionItem<K>, 'id' | 'tripId'>>,
    ) => {
      setTrips((currentTrips) =>
        currentTrips.map((trip) => {
          if (trip.id !== tripId) return trip

          const existing = trip[collection] as unknown as Array<TripCollectionItem<K> & { id: string }>
          const nextItems = existing.map((item) => (item.id === itemId ? { ...item, ...patch } : item))

          return touchTrip({
            ...trip,
            [collection]: nextItems,
          } as Trip)
        }),
      )

      if (isRemoteMode && supabase) {
        void updateRemoteTripItem(supabase, tripId, collection, itemId, patch).catch(reportError)
      }
    },
    [isRemoteMode, reportError],
  )

  const deleteTripItem = useCallback(<K extends TripCollectionKey>(tripId: string, collection: K, itemId: string) => {
    setTrips((currentTrips) =>
      currentTrips.map((trip) => {
        if (trip.id !== tripId) return trip

        const existing = trip[collection] as unknown as Array<TripCollectionItem<K> & { id: string }>

        return touchTrip({
          ...trip,
          [collection]: existing.filter((item) => item.id !== itemId),
        } as Trip)
      }),
    )

    if (isRemoteMode && supabase) {
      void deleteRemoteTripItem(supabase, tripId, collection, itemId).catch(reportError)
    }
  }, [isRemoteMode, reportError])

  const reorderItineraryItems = useCallback((tripId: string, orderedItemIds: string[]) => {
    setTrips((currentTrips) =>
      currentTrips.map((trip) => {
        if (trip.id !== tripId) return trip

        const rank = new Map(orderedItemIds.map((id, index) => [id, index + 1]))
        const itineraryItems = trip.itineraryItems
          .map((item) => ({ ...item, order: rank.get(item.id) ?? item.order }))
          .sort((a, b) => a.order - b.order)

        return touchTrip({ ...trip, itineraryItems })
      }),
    )

    if (isRemoteMode && supabase) {
      void reorderRemoteItineraryItems(supabase, tripId, orderedItemIds).catch(reportError)
    }
  }, [isRemoteMode, reportError])

  const value = useMemo(
    () => ({
      profile,
      trips,
      authMode,
      isLoading,
      lastError,
      isRemoteMode,
      loginAsDemo,
      logout,
      createTrip,
      updateTrip,
      deleteTrip,
      addTripItem,
      updateTripItem,
      deleteTripItem,
      reorderItineraryItems,
    }),
    [
      profile,
      trips,
      authMode,
      isLoading,
      lastError,
      isRemoteMode,
      loginAsDemo,
      logout,
      createTrip,
      updateTrip,
      deleteTrip,
      addTripItem,
      updateTripItem,
      deleteTripItem,
      reorderItineraryItems,
    ],
  )

  return <TravelLogContext.Provider value={value}>{children}</TravelLogContext.Provider>
}

export function useTravelLog() {
  const context = useContext(TravelLogContext)
  if (!context) {
    throw new Error('useTravelLog debe usarse dentro de TravelLogProvider')
  }
  return context
}
