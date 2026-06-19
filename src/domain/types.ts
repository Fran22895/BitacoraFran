export type TripStatus = 'planned' | 'active' | 'completed' | 'cancelled'

export type TripRole = 'owner' | 'admin' | 'editor' | 'reader'

export type FlightLegType = 'ida' | 'vuelta' | 'conexion'

export type PaymentStatus = 'pendiente' | 'reservado' | 'pagado'

export type AccommodationType = 'hotel' | 'apartamento' | 'hostal' | 'casa-rural' | 'otro'

export type ContactCategory =
  | 'emergencia'
  | 'embajada'
  | 'hotel'
  | 'alquiler'
  | 'seguro'
  | 'aerolinea'
  | 'personal'
  | 'otro'

export type DocumentCategory =
  | 'billete'
  | 'reserva'
  | 'seguro'
  | 'voucher'
  | 'dni-pasaporte'
  | 'otro'

export interface UserProfile {
  id: string
  name: string
  email: string
  avatarUrl?: string
}

export interface MoneyAmount {
  amount: number
  currency: string
  conversionRate: number
}

export interface TripMember {
  id: string
  tripId: string
  userId: string
  name: string
  email: string
  role: TripRole
}

export interface FlightBaggage {
  cabin: boolean
  checked: boolean
  weightKg?: number
  cost?: MoneyAmount
}

export interface Flight {
  id: string
  tripId: string
  legType: FlightLegType
  isInternational: boolean
  company: string
  flightNumber: string
  originAirport: string
  destinationAirport: string
  departureAt: string
  arrivalAt: string
  terminal?: string
  seat?: string
  bookingReference?: string
  cost: MoneyAmount
  baggage: FlightBaggage
  priorityBoarding: boolean
  extras: string[]
  notes?: string
}

export interface VehicleRental {
  id: string
  tripId: string
  company: string
  brand: string
  model: string
  licensePlate?: string
  fuelPolicy?: string
  insurance?: string
  deductible?: MoneyAmount
  includedMileage?: string
  deposit?: MoneyAmount
  mainDriver?: string
  price: MoneyAmount
  pickupPoint: string
  dropoffPoint: string
  pickupAt: string
  dropoffAt: string
  pickupLatitude?: number
  pickupLongitude?: number
  dropoffLatitude?: number
  dropoffLongitude?: number
  conditionPhotoUrls: string[]
  notes?: string
}

export interface Accommodation {
  id: string
  tripId: string
  type: AccommodationType
  name: string
  address: string
  bookingReference?: string
  boardBasis?: string
  checkInAt: string
  checkOutAt: string
  cost: MoneyAmount
  touristTax?: MoneyAmount
  deposit?: MoneyAmount
  contactName?: string
  contactPhone?: string
  services?: string
  hotelActivities?: string
  guests?: string
  room?: string
  cancellationPolicy?: string
  notes?: string
}

export interface ItineraryDay {
  id: string
  tripId: string
  date: string
  title: string
  notes?: string
}

export interface RecommendationSet {
  food?: string
  transport?: string
  tips?: string
  safety?: string
}

export interface ItineraryItem {
  id: string
  tripId: string
  dayId: string
  title: string
  description: string
  imageUrl?: string
  cost?: MoneyAmount
  latitude?: number
  longitude?: number
  recommendations: RecommendationSet
  visited: boolean
  order: number
}

export interface Activity {
  id: string
  tripId: string
  dayId?: string
  name: string
  provider?: string
  startsAt?: string
  location?: string
  cost: MoneyAmount
  bookingReference?: string
  paymentStatus: PaymentStatus
  notes?: string
}

export interface Contact {
  id: string
  tripId: string
  category: ContactCategory
  name: string
  phone: string
  email?: string
  address?: string
  notes?: string
}

export interface Insurance {
  id: string
  tripId: string
  provider: string
  policyNumber: string
  contactPhone?: string
  contactEmail?: string
  cost: MoneyAmount
  coverageSummary?: string
  documentUrl?: string
  notes?: string
}

export interface TravelDocument {
  id: string
  tripId: string
  category: DocumentCategory
  title: string
  fileUrl: string
  relatedTo?: string
  notes?: string
}

export interface JournalEntry {
  id: string
  tripId: string
  date: string
  title: string
  body: string
  photoUrls: string[]
  mood?: string
}

export interface Expense {
  id: string
  tripId: string
  category: string
  description: string
  date?: string
  cost: MoneyAmount
  paid: boolean
}

export interface Trip {
  id: string
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
  ownerId: string
  createdAt: string
  updatedAt: string
  members: TripMember[]
  flights: Flight[]
  vehicleRentals: VehicleRental[]
  accommodations: Accommodation[]
  itineraryDays: ItineraryDay[]
  itineraryItems: ItineraryItem[]
  activities: Activity[]
  contacts: Contact[]
  insurances: Insurance[]
  documents: TravelDocument[]
  journalEntries: JournalEntry[]
  expenses: Expense[]
}

export type TripCollectionKey =
  | 'members'
  | 'flights'
  | 'vehicleRentals'
  | 'accommodations'
  | 'itineraryDays'
  | 'itineraryItems'
  | 'activities'
  | 'contacts'
  | 'insurances'
  | 'documents'
  | 'journalEntries'
  | 'expenses'

export type TripCollectionItem<K extends TripCollectionKey> = Trip[K] extends Array<infer Item>
  ? Item
  : never

export interface TripTotals {
  flights: number
  vehicleRentals: number
  accommodations: number
  itinerary: number
  activities: number
  insurances: number
  expenses: number
  total: number
  remainingBudget: number
  currency: string
}

export interface MissingDataIssue {
  id: string
  section: string
  label: string
}
