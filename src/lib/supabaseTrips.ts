import type { SupabaseClient, User } from '@supabase/supabase-js'
import type { TripDraft } from '../store/TravelLogContext'
import type {
  Accommodation,
  Activity,
  Contact,
  Expense,
  Flight,
  Insurance,
  ItineraryDay,
  ItineraryItem,
  JournalEntry,
  MoneyAmount,
  Restaurant,
  TravelDocument,
  Trip,
  TripCollectionItem,
  TripCollectionKey,
  TripInvitation,
  TripMember,
  TripRole,
  UserProfile,
  VehicleRental,
} from '../domain/types'

type DbRecord = Record<string, unknown>

interface CollectionMapper<T extends { id: string; tripId: string }> {
  table: string
  defaultOrder?: { column: string; ascending: boolean }
  toDb: (item: Partial<T>) => DbRecord
  fromDb: (row: DbRecord) => T
}

function remoteId() {
  return crypto.randomUUID()
}

function asRecord(value: unknown): DbRecord {
  return value && typeof value === 'object' ? (value as DbRecord) : {}
}

function text(value: unknown, fallback = '') {
  return typeof value === 'string' ? value : fallback
}

function optionalText(value: unknown) {
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function numberValue(value: unknown, fallback = 0) {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }
  return fallback
}

function optionalNumber(value: unknown) {
  if (typeof value === 'number') return value
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function booleanValue(value: unknown, fallback = false) {
  return typeof value === 'boolean' ? value : fallback
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []
}

function money(value: unknown, fallbackCurrency = 'EUR'): MoneyAmount {
  const record = asRecord(value)
  return {
    amount: numberValue(record.amount),
    currency: text(record.currency, fallbackCurrency),
    conversionRate: numberValue(record.conversionRate, 1),
  }
}

function optionalMoney(value: unknown): MoneyAmount | undefined {
  if (!value) return undefined
  return money(value)
}

function addIfPresent(row: DbRecord, column: string, value: unknown) {
  if (value !== undefined) {
    row[column] = value
  }
}

function baseItemDb(item: Partial<{ id: string; tripId: string }>) {
  const row: DbRecord = {}
  addIfPresent(row, 'id', item.id)
  addIfPresent(row, 'trip_id', item.tripId)
  return row
}

function profileFromUser(user: User): UserProfile {
  return {
    id: user.id,
    name: text(user.user_metadata.full_name, user.email ?? 'Viajero'),
    email: user.email ?? 'sin-email@example.com',
    avatarUrl: optionalText(user.user_metadata.avatar_url),
  }
}

export async function upsertProfileFromUser(client: SupabaseClient, user: User) {
  const profile = profileFromUser(user)
  const { error } = await client.from('profiles').upsert(
    {
      id: profile.id,
      name: profile.name,
      email: profile.email,
      avatar_url: profile.avatarUrl,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )

  if (error) throw error
  return profile
}

function tripToDb(draft: Partial<TripDraft> & { id?: string; ownerId?: string }) {
  const row: DbRecord = {}
  addIfPresent(row, 'id', draft.id)
  addIfPresent(row, 'owner_id', draft.ownerId)
  addIfPresent(row, 'title', draft.title)
  addIfPresent(row, 'status', draft.status)
  addIfPresent(row, 'destinations', draft.destinations)
  addIfPresent(row, 'start_date', draft.startDate)
  addIfPresent(row, 'end_date', draft.endDate)
  addIfPresent(row, 'cover_image_url', draft.coverImageUrl)
  addIfPresent(row, 'companions', draft.companions)
  addIfPresent(row, 'budget_amount', draft.budgetAmount)
  addIfPresent(row, 'base_currency', draft.baseCurrency)
  addIfPresent(row, 'tags', draft.tags)
  addIfPresent(row, 'notes', draft.notes)
  row.updated_at = new Date().toISOString()
  return row
}

function tripFromDb(row: DbRecord): Omit<
  Trip,
  | 'members'
  | 'invitations'
  | 'flights'
  | 'vehicleRentals'
  | 'accommodations'
  | 'itineraryDays'
  | 'itineraryItems'
  | 'activities'
  | 'restaurants'
  | 'contacts'
  | 'insurances'
  | 'documents'
  | 'journalEntries'
  | 'expenses'
> {
  return {
    id: text(row.id),
    ownerId: text(row.owner_id),
    title: text(row.title),
    status: text(row.status, 'planned') as Trip['status'],
    destinations: stringArray(row.destinations),
    startDate: text(row.start_date),
    endDate: text(row.end_date),
    coverImageUrl: optionalText(row.cover_image_url),
    companions: stringArray(row.companions),
    budgetAmount: numberValue(row.budget_amount),
    baseCurrency: text(row.base_currency, 'EUR'),
    tags: stringArray(row.tags),
    notes: optionalText(row.notes),
    createdAt: text(row.created_at, new Date().toISOString()),
    updatedAt: text(row.updated_at, new Date().toISOString()),
  }
}

const collectionMappers = {
  members: {
    table: 'trip_members',
    toDb: (item: Partial<TripMember>) => ({
      ...baseItemDb(item),
      ...(item.userId !== undefined ? { user_id: item.userId } : {}),
      ...(item.name !== undefined ? { name: item.name } : {}),
      ...(item.email !== undefined ? { email: item.email } : {}),
      ...(item.role !== undefined ? { role: item.role } : {}),
    }),
    fromDb: (row) => ({
      id: text(row.id),
      tripId: text(row.trip_id),
      userId: text(row.user_id),
      name: text(row.name),
      email: text(row.email),
      role: text(row.role, 'reader') as TripMember['role'],
    }),
  } satisfies CollectionMapper<TripMember>,
  invitations: {
    table: 'trip_invitations',
    defaultOrder: { column: 'created_at', ascending: false },
    toDb: (item: Partial<TripInvitation>) => ({
      ...baseItemDb(item),
      ...(item.email !== undefined ? { email: item.email.trim().toLowerCase() } : {}),
      ...(item.role !== undefined ? { role: item.role } : {}),
      ...(item.status !== undefined ? { status: item.status } : {}),
      ...(item.invitedBy !== undefined ? { invited_by: item.invitedBy } : {}),
      ...(item.acceptedBy !== undefined ? { accepted_by: item.acceptedBy } : {}),
      ...(item.acceptedAt !== undefined ? { accepted_at: item.acceptedAt } : {}),
    }),
    fromDb: (row) => ({
      id: text(row.id),
      tripId: text(row.trip_id),
      email: text(row.email),
      role: text(row.role, 'reader') as TripInvitation['role'],
      status: text(row.status, 'pending') as TripInvitation['status'],
      invitedBy: optionalText(row.invited_by),
      acceptedBy: optionalText(row.accepted_by),
      createdAt: text(row.created_at, new Date().toISOString()),
      acceptedAt: optionalText(row.accepted_at),
    }),
  } satisfies CollectionMapper<TripInvitation>,
  flights: {
    table: 'flights',
    toDb: (item: Partial<Flight>) => ({
      ...baseItemDb(item),
      ...(item.legType !== undefined ? { leg_type: item.legType } : {}),
      ...(item.isInternational !== undefined ? { is_international: item.isInternational } : {}),
      ...(item.company !== undefined ? { company: item.company } : {}),
      ...(item.flightNumber !== undefined ? { flight_number: item.flightNumber } : {}),
      ...(item.originAirport !== undefined ? { origin_airport: item.originAirport } : {}),
      ...(item.destinationAirport !== undefined ? { destination_airport: item.destinationAirport } : {}),
      ...(item.departureAt !== undefined ? { departure_at: item.departureAt } : {}),
      ...(item.arrivalAt !== undefined ? { arrival_at: item.arrivalAt } : {}),
      ...(item.terminal !== undefined ? { terminal: item.terminal } : {}),
      ...(item.seat !== undefined ? { seat: item.seat } : {}),
      ...(item.bookingReference !== undefined ? { booking_reference: item.bookingReference } : {}),
      ...(item.cost !== undefined ? { cost: item.cost } : {}),
      ...(item.baggage !== undefined ? { baggage: item.baggage } : {}),
      ...(item.priorityBoarding !== undefined ? { priority_boarding: item.priorityBoarding } : {}),
      ...(item.extras !== undefined ? { extras: item.extras } : {}),
      ...(item.notes !== undefined ? { notes: item.notes } : {}),
    }),
    fromDb: (row) => ({
      id: text(row.id),
      tripId: text(row.trip_id),
      legType: text(row.leg_type, 'ida') as Flight['legType'],
      isInternational: booleanValue(row.is_international),
      company: text(row.company),
      flightNumber: text(row.flight_number),
      originAirport: text(row.origin_airport),
      destinationAirport: text(row.destination_airport),
      departureAt: text(row.departure_at),
      arrivalAt: text(row.arrival_at),
      terminal: optionalText(row.terminal),
      seat: optionalText(row.seat),
      bookingReference: optionalText(row.booking_reference),
      cost: money(row.cost),
      baggage: asRecord(row.baggage) as unknown as Flight['baggage'],
      priorityBoarding: booleanValue(row.priority_boarding),
      extras: stringArray(row.extras),
      notes: optionalText(row.notes),
    }),
  } satisfies CollectionMapper<Flight>,
  vehicleRentals: {
    table: 'vehicle_rentals',
    toDb: (item: Partial<VehicleRental>) => ({
      ...baseItemDb(item),
      ...(item.company !== undefined ? { company: item.company } : {}),
      ...(item.brand !== undefined ? { brand: item.brand } : {}),
      ...(item.model !== undefined ? { model: item.model } : {}),
      ...(item.licensePlate !== undefined ? { license_plate: item.licensePlate } : {}),
      ...(item.fuelPolicy !== undefined ? { fuel_policy: item.fuelPolicy } : {}),
      ...(item.insurance !== undefined ? { insurance: item.insurance } : {}),
      ...(item.deductible !== undefined ? { deductible: item.deductible } : {}),
      ...(item.includedMileage !== undefined ? { included_mileage: item.includedMileage } : {}),
      ...(item.deposit !== undefined ? { deposit: item.deposit } : {}),
      ...(item.mainDriver !== undefined ? { main_driver: item.mainDriver } : {}),
      ...(item.price !== undefined ? { price: item.price } : {}),
      ...(item.pickupPoint !== undefined ? { pickup_point: item.pickupPoint } : {}),
      ...(item.dropoffPoint !== undefined ? { dropoff_point: item.dropoffPoint } : {}),
      ...(item.pickupAt !== undefined ? { pickup_at: item.pickupAt } : {}),
      ...(item.dropoffAt !== undefined ? { dropoff_at: item.dropoffAt } : {}),
      ...(item.pickupLatitude !== undefined ? { pickup_latitude: item.pickupLatitude } : {}),
      ...(item.pickupLongitude !== undefined ? { pickup_longitude: item.pickupLongitude } : {}),
      ...(item.dropoffLatitude !== undefined ? { dropoff_latitude: item.dropoffLatitude } : {}),
      ...(item.dropoffLongitude !== undefined ? { dropoff_longitude: item.dropoffLongitude } : {}),
      ...(item.pickupGoogleMapsUrl !== undefined ? { pickup_google_maps_url: item.pickupGoogleMapsUrl } : {}),
      ...(item.dropoffGoogleMapsUrl !== undefined ? { dropoff_google_maps_url: item.dropoffGoogleMapsUrl } : {}),
      ...(item.conditionPhotoUrls !== undefined ? { condition_photo_urls: item.conditionPhotoUrls } : {}),
      ...(item.notes !== undefined ? { notes: item.notes } : {}),
    }),
    fromDb: (row) => ({
      id: text(row.id),
      tripId: text(row.trip_id),
      company: text(row.company),
      brand: text(row.brand),
      model: text(row.model),
      licensePlate: optionalText(row.license_plate),
      fuelPolicy: optionalText(row.fuel_policy),
      insurance: optionalText(row.insurance),
      deductible: optionalMoney(row.deductible),
      includedMileage: optionalText(row.included_mileage),
      deposit: optionalMoney(row.deposit),
      mainDriver: optionalText(row.main_driver),
      price: money(row.price),
      pickupPoint: text(row.pickup_point),
      dropoffPoint: text(row.dropoff_point),
      pickupAt: text(row.pickup_at),
      dropoffAt: text(row.dropoff_at),
      pickupLatitude: optionalNumber(row.pickup_latitude),
      pickupLongitude: optionalNumber(row.pickup_longitude),
      dropoffLatitude: optionalNumber(row.dropoff_latitude),
      dropoffLongitude: optionalNumber(row.dropoff_longitude),
      pickupGoogleMapsUrl: optionalText(row.pickup_google_maps_url),
      dropoffGoogleMapsUrl: optionalText(row.dropoff_google_maps_url),
      conditionPhotoUrls: stringArray(row.condition_photo_urls),
      notes: optionalText(row.notes),
    }),
  } satisfies CollectionMapper<VehicleRental>,
  accommodations: {
    table: 'accommodations',
    defaultOrder: { column: 'check_in_at', ascending: true },
    toDb: (item: Partial<Accommodation>) => ({
      ...baseItemDb(item),
      ...(item.type !== undefined ? { type: item.type } : {}),
      ...(item.name !== undefined ? { name: item.name } : {}),
      ...(item.address !== undefined ? { address: item.address } : {}),
      ...(item.googleMapsUrl !== undefined ? { google_maps_url: item.googleMapsUrl } : {}),
      ...(item.bookingReference !== undefined ? { booking_reference: item.bookingReference } : {}),
      ...(item.boardBasis !== undefined ? { board_basis: item.boardBasis } : {}),
      ...(item.checkInAt !== undefined ? { check_in_at: item.checkInAt } : {}),
      ...(item.checkOutAt !== undefined ? { check_out_at: item.checkOutAt } : {}),
      ...(item.cost !== undefined ? { cost: item.cost } : {}),
      ...(item.touristTax !== undefined ? { tourist_tax: item.touristTax } : {}),
      ...(item.deposit !== undefined ? { deposit: item.deposit } : {}),
      ...(item.contactName !== undefined ? { contact_name: item.contactName } : {}),
      ...(item.contactPhone !== undefined ? { contact_phone: item.contactPhone } : {}),
      ...(item.services !== undefined ? { services: item.services } : {}),
      ...(item.hotelActivities !== undefined ? { hotel_activities: item.hotelActivities } : {}),
      ...(item.guests !== undefined ? { guests: item.guests } : {}),
      ...(item.room !== undefined ? { room: item.room } : {}),
      ...(item.cancellationPolicy !== undefined ? { cancellation_policy: item.cancellationPolicy } : {}),
      ...(item.notes !== undefined ? { notes: item.notes } : {}),
    }),
    fromDb: (row) => ({
      id: text(row.id),
      tripId: text(row.trip_id),
      type: text(row.type, 'hotel') as Accommodation['type'],
      name: text(row.name),
      address: text(row.address),
      googleMapsUrl: optionalText(row.google_maps_url),
      bookingReference: optionalText(row.booking_reference),
      boardBasis: optionalText(row.board_basis),
      checkInAt: text(row.check_in_at),
      checkOutAt: text(row.check_out_at),
      cost: money(row.cost),
      touristTax: optionalMoney(row.tourist_tax),
      deposit: optionalMoney(row.deposit),
      contactName: optionalText(row.contact_name),
      contactPhone: optionalText(row.contact_phone),
      services: optionalText(row.services),
      hotelActivities: optionalText(row.hotel_activities),
      guests: optionalText(row.guests),
      room: optionalText(row.room),
      cancellationPolicy: optionalText(row.cancellation_policy),
      notes: optionalText(row.notes),
    }),
  } satisfies CollectionMapper<Accommodation>,
  itineraryDays: {
    table: 'itinerary_days',
    defaultOrder: { column: 'date', ascending: true },
    toDb: (item: Partial<ItineraryDay>) => ({
      ...baseItemDb(item),
      ...(item.date !== undefined ? { date: item.date } : {}),
      ...(item.title !== undefined ? { title: item.title } : {}),
      ...(item.notes !== undefined ? { notes: item.notes } : {}),
    }),
    fromDb: (row) => ({
      id: text(row.id),
      tripId: text(row.trip_id),
      date: text(row.date),
      title: text(row.title),
      notes: optionalText(row.notes),
    }),
  } satisfies CollectionMapper<ItineraryDay>,
  itineraryItems: {
    table: 'itinerary_items',
    defaultOrder: { column: 'sort_order', ascending: true },
    toDb: (item: Partial<ItineraryItem>) => ({
      ...baseItemDb(item),
      ...(item.dayId !== undefined ? { day_id: item.dayId } : {}),
      ...(item.title !== undefined ? { title: item.title } : {}),
      ...(item.description !== undefined ? { description: item.description } : {}),
      ...(item.imageUrl !== undefined ? { image_url: item.imageUrl } : {}),
      ...(item.googleMapsUrl !== undefined ? { google_maps_url: item.googleMapsUrl } : {}),
      ...(item.cost !== undefined ? { cost: item.cost } : {}),
      ...(item.latitude !== undefined ? { latitude: item.latitude } : {}),
      ...(item.longitude !== undefined ? { longitude: item.longitude } : {}),
      ...(item.recommendations !== undefined ? { recommendations: item.recommendations } : {}),
      ...(item.visited !== undefined ? { visited: item.visited } : {}),
      ...(item.order !== undefined ? { sort_order: item.order } : {}),
    }),
    fromDb: (row) => ({
      id: text(row.id),
      tripId: text(row.trip_id),
      dayId: text(row.day_id),
      title: text(row.title),
      description: text(row.description),
      imageUrl: optionalText(row.image_url),
      googleMapsUrl: optionalText(row.google_maps_url),
      cost: optionalMoney(row.cost),
      latitude: optionalNumber(row.latitude),
      longitude: optionalNumber(row.longitude),
      recommendations: asRecord(row.recommendations) as ItineraryItem['recommendations'],
      visited: booleanValue(row.visited),
      order: numberValue(row.sort_order, 1),
    }),
  } satisfies CollectionMapper<ItineraryItem>,
  activities: {
    table: 'activities',
    defaultOrder: { column: 'starts_at', ascending: true },
    toDb: (item: Partial<Activity>) => ({
      ...baseItemDb(item),
      ...(item.dayId !== undefined ? { day_id: item.dayId || null } : {}),
      ...(item.name !== undefined ? { name: item.name } : {}),
      ...(item.provider !== undefined ? { provider: item.provider } : {}),
      ...(item.startsAt !== undefined ? { starts_at: item.startsAt } : {}),
      ...(item.location !== undefined ? { location: item.location } : {}),
      ...(item.googleMapsUrl !== undefined ? { google_maps_url: item.googleMapsUrl } : {}),
      ...(item.reservationUrl !== undefined ? { reservation_url: item.reservationUrl } : {}),
      ...(item.cost !== undefined ? { cost: item.cost } : {}),
      ...(item.bookingReference !== undefined ? { booking_reference: item.bookingReference } : {}),
      ...(item.paymentStatus !== undefined ? { payment_status: item.paymentStatus } : {}),
      ...(item.notes !== undefined ? { notes: item.notes } : {}),
    }),
    fromDb: (row) => ({
      id: text(row.id),
      tripId: text(row.trip_id),
      dayId: optionalText(row.day_id),
      name: text(row.name),
      provider: optionalText(row.provider),
      startsAt: optionalText(row.starts_at),
      location: optionalText(row.location),
      googleMapsUrl: optionalText(row.google_maps_url),
      reservationUrl: optionalText(row.reservation_url),
      cost: money(row.cost),
      bookingReference: optionalText(row.booking_reference),
      paymentStatus: text(row.payment_status, 'pendiente') as Activity['paymentStatus'],
      notes: optionalText(row.notes),
    }),
  } satisfies CollectionMapper<Activity>,
  restaurants: {
    table: 'restaurants',
    defaultOrder: { column: 'reservation_at', ascending: true },
    toDb: (item: Partial<Restaurant>) => ({
      ...baseItemDb(item),
      ...(item.dayId !== undefined ? { day_id: item.dayId } : {}),
      ...(item.name !== undefined ? { name: item.name } : {}),
      ...(item.cuisine !== undefined ? { cuisine: item.cuisine } : {}),
      ...(item.location !== undefined ? { location: item.location } : {}),
      ...(item.googleMapsUrl !== undefined ? { google_maps_url: item.googleMapsUrl } : {}),
      ...(item.averagePrice !== undefined ? { average_price: item.averagePrice } : {}),
      ...(item.hasReservation !== undefined ? { has_reservation: item.hasReservation } : {}),
      ...(item.reservationAt !== undefined ? { reservation_at: item.reservationAt || null } : {}),
      ...(item.bookingReference !== undefined ? { booking_reference: item.bookingReference } : {}),
      ...(item.notes !== undefined ? { notes: item.notes } : {}),
    }),
    fromDb: (row) => ({
      id: text(row.id),
      tripId: text(row.trip_id),
      dayId: text(row.day_id),
      name: text(row.name),
      cuisine: optionalText(row.cuisine),
      location: text(row.location),
      googleMapsUrl: optionalText(row.google_maps_url),
      averagePrice: money(row.average_price),
      hasReservation: booleanValue(row.has_reservation),
      reservationAt: optionalText(row.reservation_at),
      bookingReference: optionalText(row.booking_reference),
      notes: optionalText(row.notes),
    }),
  } satisfies CollectionMapper<Restaurant>,
  contacts: {
    table: 'contacts',
    toDb: (item: Partial<Contact>) => ({
      ...baseItemDb(item),
      ...(item.category !== undefined ? { category: item.category } : {}),
      ...(item.name !== undefined ? { name: item.name } : {}),
      ...(item.phone !== undefined ? { phone: item.phone } : {}),
      ...(item.email !== undefined ? { email: item.email } : {}),
      ...(item.address !== undefined ? { address: item.address } : {}),
      ...(item.googleMapsUrl !== undefined ? { google_maps_url: item.googleMapsUrl } : {}),
      ...(item.notes !== undefined ? { notes: item.notes } : {}),
    }),
    fromDb: (row) => ({
      id: text(row.id),
      tripId: text(row.trip_id),
      category: text(row.category, 'otro') as Contact['category'],
      name: text(row.name),
      phone: text(row.phone),
      email: optionalText(row.email),
      address: optionalText(row.address),
      googleMapsUrl: optionalText(row.google_maps_url),
      notes: optionalText(row.notes),
    }),
  } satisfies CollectionMapper<Contact>,
  insurances: {
    table: 'insurances',
    toDb: (item: Partial<Insurance>) => ({
      ...baseItemDb(item),
      ...(item.provider !== undefined ? { provider: item.provider } : {}),
      ...(item.policyNumber !== undefined ? { policy_number: item.policyNumber } : {}),
      ...(item.contactPhone !== undefined ? { contact_phone: item.contactPhone } : {}),
      ...(item.contactEmail !== undefined ? { contact_email: item.contactEmail } : {}),
      ...(item.cost !== undefined ? { cost: item.cost } : {}),
      ...(item.coverageSummary !== undefined ? { coverage_summary: item.coverageSummary } : {}),
      ...(item.documentUrl !== undefined ? { document_url: item.documentUrl } : {}),
      ...(item.notes !== undefined ? { notes: item.notes } : {}),
    }),
    fromDb: (row) => ({
      id: text(row.id),
      tripId: text(row.trip_id),
      provider: text(row.provider),
      policyNumber: text(row.policy_number),
      contactPhone: optionalText(row.contact_phone),
      contactEmail: optionalText(row.contact_email),
      cost: money(row.cost),
      coverageSummary: optionalText(row.coverage_summary),
      documentUrl: optionalText(row.document_url),
      notes: optionalText(row.notes),
    }),
  } satisfies CollectionMapper<Insurance>,
  documents: {
    table: 'documents',
    toDb: (item: Partial<TravelDocument>) => ({
      ...baseItemDb(item),
      ...(item.category !== undefined ? { category: item.category } : {}),
      ...(item.title !== undefined ? { title: item.title } : {}),
      ...(item.fileUrl !== undefined ? { file_url: item.fileUrl } : {}),
      ...(item.relatedTo !== undefined ? { related_to: item.relatedTo } : {}),
      ...(item.notes !== undefined ? { notes: item.notes } : {}),
    }),
    fromDb: (row) => ({
      id: text(row.id),
      tripId: text(row.trip_id),
      category: text(row.category, 'otro') as TravelDocument['category'],
      title: text(row.title),
      fileUrl: text(row.file_url),
      relatedTo: optionalText(row.related_to),
      notes: optionalText(row.notes),
    }),
  } satisfies CollectionMapper<TravelDocument>,
  journalEntries: {
    table: 'journal_entries',
    defaultOrder: { column: 'date', ascending: true },
    toDb: (item: Partial<JournalEntry>) => ({
      ...baseItemDb(item),
      ...(item.date !== undefined ? { date: item.date } : {}),
      ...(item.title !== undefined ? { title: item.title } : {}),
      ...(item.body !== undefined ? { body: item.body } : {}),
      ...(item.photoUrls !== undefined ? { photo_urls: item.photoUrls } : {}),
      ...(item.mood !== undefined ? { mood: item.mood } : {}),
    }),
    fromDb: (row) => ({
      id: text(row.id),
      tripId: text(row.trip_id),
      date: text(row.date),
      title: text(row.title),
      body: text(row.body),
      photoUrls: stringArray(row.photo_urls),
      mood: optionalText(row.mood),
    }),
  } satisfies CollectionMapper<JournalEntry>,
  expenses: {
    table: 'expenses',
    defaultOrder: { column: 'date', ascending: true },
    toDb: (item: Partial<Expense>) => ({
      ...baseItemDb(item),
      ...(item.category !== undefined ? { category: item.category } : {}),
      ...(item.description !== undefined ? { description: item.description } : {}),
      ...(item.date !== undefined ? { date: item.date } : {}),
      ...(item.cost !== undefined ? { cost: item.cost } : {}),
      ...(item.paid !== undefined ? { paid: item.paid } : {}),
    }),
    fromDb: (row) => ({
      id: text(row.id),
      tripId: text(row.trip_id),
      category: text(row.category),
      description: text(row.description),
      date: optionalText(row.date),
      cost: money(row.cost),
      paid: booleanValue(row.paid),
    }),
  } satisfies CollectionMapper<Expense>,
}

function mapperFor<K extends TripCollectionKey>(collection: K) {
  return collectionMappers[collection] as unknown as CollectionMapper<
    TripCollectionItem<K> & { id: string; tripId: string }
  >
}

async function selectCollection<K extends TripCollectionKey>(
  client: SupabaseClient,
  collection: K,
  tripId: string,
): Promise<TripCollectionItem<K>[]> {
  const mapper = mapperFor(collection)
  let query = client.from(mapper.table).select('*').eq('trip_id', tripId)
  if (mapper.defaultOrder) {
    query = query.order(mapper.defaultOrder.column, { ascending: mapper.defaultOrder.ascending })
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []).map((row) => mapper.fromDb(row as DbRecord)) as TripCollectionItem<K>[]
}

async function touchRemoteTrip(client: SupabaseClient, tripId: string) {
  const { error } = await client.from('trips').update({ updated_at: new Date().toISOString() }).eq('id', tripId)
  if (error) throw error
}

async function hydrateTrip(client: SupabaseClient, row: DbRecord): Promise<Trip> {
  const baseTrip = tripFromDb(row)
  const [
    members,
    invitations,
    flights,
    vehicleRentals,
    accommodations,
    itineraryDays,
    itineraryItems,
    activities,
    restaurants,
    contacts,
    insurances,
    documents,
    journalEntries,
    expenses,
  ] = await Promise.all([
    selectCollection(client, 'members', baseTrip.id),
    selectCollection(client, 'invitations', baseTrip.id),
    selectCollection(client, 'flights', baseTrip.id),
    selectCollection(client, 'vehicleRentals', baseTrip.id),
    selectCollection(client, 'accommodations', baseTrip.id),
    selectCollection(client, 'itineraryDays', baseTrip.id),
    selectCollection(client, 'itineraryItems', baseTrip.id),
    selectCollection(client, 'activities', baseTrip.id),
    selectCollection(client, 'restaurants', baseTrip.id),
    selectCollection(client, 'contacts', baseTrip.id),
    selectCollection(client, 'insurances', baseTrip.id),
    selectCollection(client, 'documents', baseTrip.id),
    selectCollection(client, 'journalEntries', baseTrip.id),
    selectCollection(client, 'expenses', baseTrip.id),
  ])

  return {
    ...baseTrip,
    members,
    invitations,
    flights,
    vehicleRentals,
    accommodations,
    itineraryDays,
    itineraryItems,
    activities,
    restaurants,
    contacts,
    insurances,
    documents,
    journalEntries,
    expenses,
  }
}

export async function fetchRemoteTrips(client: SupabaseClient) {
  const { data, error } = await client.from('trips').select('*').order('start_date', { ascending: false })
  if (error) throw error

  return Promise.all((data ?? []).map((row) => hydrateTrip(client, row as DbRecord)))
}

export async function fetchRemoteTrip(client: SupabaseClient, tripId: string) {
  const { data, error } = await client.from('trips').select('*').eq('id', tripId).single()
  if (error) throw error
  return hydrateTrip(client, data as DbRecord)
}

export async function claimRemoteTripInvitations(client: SupabaseClient) {
  const { error } = await client.rpc('claim_trip_invitations')
  if (error) throw error
}

export async function inviteRemoteTripMember(
  client: SupabaseClient,
  tripId: string,
  email: string,
  role: Exclude<TripRole, 'owner'>,
) {
  const { error } = await client.rpc('invite_trip_member', {
    target_trip_id: tripId,
    invite_email: email.trim().toLowerCase(),
    invite_role: role,
  })
  if (error) throw error
  return fetchRemoteTrip(client, tripId)
}

export async function createRemoteTrip(client: SupabaseClient, draft: TripDraft, owner: UserProfile) {
  const tripId = remoteId()
  const memberId = remoteId()
  const { error: tripError } = await client.from('trips').insert(tripToDb({ ...draft, id: tripId, ownerId: owner.id }))
  if (tripError) throw tripError

  const ownerMember: TripMember = {
    id: memberId,
    tripId,
    userId: owner.id,
    name: owner.name,
    email: owner.email,
    role: 'owner',
  }
  const { error: memberError } = await client.from('trip_members').insert(mapperFor('members').toDb(ownerMember))
  if (memberError) throw memberError

  const { data, error } = await client.from('trips').select('*').eq('id', tripId).single()
  if (error) throw error
  return hydrateTrip(client, data as DbRecord)
}

export async function updateRemoteTrip(client: SupabaseClient, tripId: string, patch: Partial<TripDraft>) {
  const { error } = await client.from('trips').update(tripToDb(patch)).eq('id', tripId)
  if (error) throw error
}

export async function deleteRemoteTrip(client: SupabaseClient, tripId: string) {
  const { error } = await client.from('trips').delete().eq('id', tripId)
  if (error) throw error
}

export async function duplicateRemoteTrip(client: SupabaseClient, tripId: string, title?: string) {
  const { data, error } = await client.rpc('duplicate_trip', {
    source_trip_id: tripId,
    duplicate_title: title ?? null,
  })
  if (error) throw error

  return fetchRemoteTrip(client, String(data))
}

export async function addRemoteTripItem<K extends TripCollectionKey>(
  client: SupabaseClient,
  tripId: string,
  collection: K,
  item: Omit<TripCollectionItem<K>, 'id' | 'tripId'>,
) {
  const mapper = mapperFor(collection)
  const itemWithIds = { ...item, id: remoteId(), tripId } as TripCollectionItem<K> & { id: string; tripId: string }
  const { data, error } = await client.from(mapper.table).insert(mapper.toDb(itemWithIds)).select('*').single()
  if (error) throw error

  await touchRemoteTrip(client, tripId)
  return mapper.fromDb(data as DbRecord) as TripCollectionItem<K>
}

export async function updateRemoteTripItem<K extends TripCollectionKey>(
  client: SupabaseClient,
  tripId: string,
  collection: K,
  itemId: string,
  patch: Partial<Omit<TripCollectionItem<K>, 'id' | 'tripId'>>,
) {
  const mapper = mapperFor(collection)
  const { error } = await client
    .from(mapper.table)
    .update(mapper.toDb(patch as unknown as Partial<TripCollectionItem<K> & { id: string; tripId: string }>))
    .eq('id', itemId)
  if (error) throw error
  await touchRemoteTrip(client, tripId)
}

export async function deleteRemoteTripItem<K extends TripCollectionKey>(
  client: SupabaseClient,
  tripId: string,
  collection: K,
  itemId: string,
) {
  const mapper = mapperFor(collection)
  const { error } = await client.from(mapper.table).delete().eq('id', itemId)
  if (error) throw error
  await touchRemoteTrip(client, tripId)
}

export async function reorderRemoteItineraryItems(client: SupabaseClient, tripId: string, orderedItemIds: string[]) {
  const results = await Promise.all(
    orderedItemIds.map((id, index) =>
      client
        .from('itinerary_items')
        .update({ sort_order: index + 1 })
        .eq('id', id),
    ),
  )
  const firstError = results.find((result) => result.error)?.error
  if (firstError) throw firstError
  await touchRemoteTrip(client, tripId)
}
