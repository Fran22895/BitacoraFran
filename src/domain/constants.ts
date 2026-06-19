import type { ContactCategory, DocumentCategory, FlightLegType, PaymentStatus, TripRole, TripStatus } from './types'

export const tripStatusLabels: Record<TripStatus, string> = {
  planned: 'Planificado',
  active: 'En curso',
  completed: 'Finalizado',
  cancelled: 'Cancelado',
}

export const tripRoleLabels: Record<TripRole, string> = {
  owner: 'Propietario',
  admin: 'Admin',
  editor: 'Editor',
  reader: 'Lector',
}

export const flightLegLabels: Record<FlightLegType, string> = {
  ida: 'Ida',
  vuelta: 'Vuelta',
  conexion: 'Conexion',
}

export const paymentStatusLabels: Record<PaymentStatus, string> = {
  pendiente: 'Pendiente',
  reservado: 'Reservado',
  pagado: 'Pagado',
}

export const contactCategoryLabels: Record<ContactCategory, string> = {
  emergencia: 'Emergencia',
  embajada: 'Embajada',
  hotel: 'Hotel',
  alquiler: 'Alquiler',
  seguro: 'Seguro',
  aerolinea: 'Aerolinea',
  personal: 'Personal',
  otro: 'Otro',
}

export const documentCategoryLabels: Record<DocumentCategory, string> = {
  billete: 'Billete',
  reserva: 'Reserva',
  seguro: 'Seguro',
  voucher: 'Voucher',
  'dni-pasaporte': 'DNI/Pasaporte',
  otro: 'Otro',
}

export const commonCurrencies = ['EUR', 'USD', 'GBP', 'JPY', 'CHF', 'MXN', 'ARS', 'COP', 'MAD']

export const defaultExchangeRates: Record<string, number> = {
  EUR: 1,
  USD: 0.92,
  GBP: 1.17,
  JPY: 0.006,
  CHF: 1.05,
  MXN: 0.05,
  ARS: 0.001,
  COP: 0.00022,
  MAD: 0.092,
}
