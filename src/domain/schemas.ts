import { z } from 'zod'

const optionalText = z.string().optional().or(z.literal(''))

export const moneySchema = z.object({
  amount: z.coerce.number().min(0, 'El importe no puede ser negativo'),
  currency: z.string().min(3, 'Indica la moneda').max(3, 'Usa codigo ISO de 3 letras').transform((value) => value.toUpperCase()),
  conversionRate: z.coerce.number().positive('La tasa debe ser mayor que cero'),
})

export const tripFormSchema = z.object({
  title: z.string().min(2, 'El viaje necesita un nombre'),
  status: z.enum(['planned', 'active', 'completed', 'cancelled']),
  destinationsText: z.string().min(2, 'Anade al menos un destino'),
  startDate: z.string().min(1, 'Indica fecha de inicio'),
  endDate: z.string().min(1, 'Indica fecha de fin'),
  coverImageUrl: optionalText,
  companionsText: optionalText,
  budgetAmount: z.coerce.number().min(0, 'El presupuesto no puede ser negativo'),
  baseCurrency: z.string().min(3).max(3).transform((value) => value.toUpperCase()),
  tagsText: optionalText,
  notes: optionalText,
})

export const flightSchema = z.object({
  legType: z.enum(['ida', 'vuelta', 'conexion']),
  isInternational: z.coerce.boolean(),
  company: z.string().min(2, 'Indica la compania'),
  flightNumber: z.string().min(2, 'Indica el numero de vuelo'),
  originAirport: z.string().min(2, 'Indica aeropuerto de origen'),
  destinationAirport: z.string().min(2, 'Indica aeropuerto de destino'),
  departureAt: z.string().min(1, 'Indica salida'),
  arrivalAt: z.string().min(1, 'Indica llegada'),
  terminal: optionalText,
  seat: optionalText,
  bookingReference: optionalText,
  cost: moneySchema,
  baggage: z.object({
    cabin: z.coerce.boolean(),
    checked: z.coerce.boolean(),
    weightKg: z.coerce.number().optional(),
    cost: moneySchema.optional(),
  }),
  priorityBoarding: z.coerce.boolean(),
  extras: z.array(z.string()).default([]),
  notes: optionalText,
})

export const activitySchema = z.object({
  dayId: optionalText,
  name: z.string().min(2, 'Indica la actividad'),
  provider: optionalText,
  startsAt: optionalText,
  location: optionalText,
  googleMapsUrl: optionalText,
  cost: moneySchema,
  bookingReference: optionalText,
  paymentStatus: z.enum(['pendiente', 'reservado', 'pagado']),
  notes: optionalText,
})

export const accommodationSchema = z.object({
  type: z.enum(['hotel', 'apartamento', 'hostal', 'casa-rural', 'otro']),
  name: z.string().min(2, 'Indica alojamiento'),
  address: z.string().min(2, 'Indica direccion'),
  googleMapsUrl: optionalText,
  bookingReference: optionalText,
  boardBasis: optionalText,
  checkInAt: z.string().min(1, 'Indica check-in'),
  checkOutAt: z.string().min(1, 'Indica check-out'),
  cost: moneySchema,
  touristTax: moneySchema.optional(),
  deposit: moneySchema.optional(),
  contactName: optionalText,
  contactPhone: optionalText,
  services: optionalText,
  hotelActivities: optionalText,
  guests: optionalText,
  room: optionalText,
  cancellationPolicy: optionalText,
  notes: optionalText,
})

export const expenseSchema = z.object({
  category: z.string().min(2, 'Indica categoria'),
  description: z.string().min(2, 'Describe el gasto'),
  date: optionalText,
  cost: moneySchema,
  paid: z.coerce.boolean(),
})

export const tripInvitationSchema = z.object({
  email: z.string().trim().toLowerCase().email('Indica un email valido'),
  role: z.enum(['admin', 'editor', 'reader']),
})
