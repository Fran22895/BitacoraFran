import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import ContactsIcon from '@mui/icons-material/Contacts'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import DeleteIcon from '@mui/icons-material/Delete'
import DescriptionIcon from '@mui/icons-material/Description'
import DirectionsCarIcon from '@mui/icons-material/DirectionsCar'
import EditIcon from '@mui/icons-material/Edit'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff'
import HotelIcon from '@mui/icons-material/Hotel'
import LocalActivityIcon from '@mui/icons-material/LocalActivity'
import LockIcon from '@mui/icons-material/Lock'
import MapIcon from '@mui/icons-material/Map'
import NoteAltIcon from '@mui/icons-material/NoteAlt'
import PeopleIcon from '@mui/icons-material/People'
import PhoneIcon from '@mui/icons-material/Phone'
import PublicIcon from '@mui/icons-material/Public'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import ShieldIcon from '@mui/icons-material/Shield'
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material'
import { Suspense, lazy, useState } from 'react'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { ConfirmDeleteDialog } from '../../components/ConfirmDeleteDialog'
import { EntitySection, type FieldConfig } from '../../components/EntitySection'
import { StatTile } from '../../components/StatTile'
import { TripFormDialog } from '../../components/TripFormDialog'
import { calculateTripTotals, findMissingData, formatMoney, getTripDateRangeLabel } from '../../domain/calculations'
import {
  contactCategoryLabels,
  documentCategoryLabels,
  flightLegLabels,
  paymentStatusLabels,
  tripRoleLabels,
  tripStatusLabels,
} from '../../domain/constants'
import { resolveCoordinates } from '../../domain/maps'
import { canAssignRole, getAssignableRoles, getPermissionsForTrip } from '../../domain/permissions'
import { accommodationSchema, activitySchema, expenseSchema, flightSchema, restaurantSchema, tripInvitationSchema } from '../../domain/schemas'
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
  Restaurant,
  TravelDocument,
  TripInvitation,
  TripMember,
  TripRole,
  VehicleRental,
} from '../../domain/types'
import { useTravelLog, type TripDraft } from '../../store/TravelLogContext'
import { supabase } from '../../lib/supabase'
import { resolveTripFileUrl } from '../../lib/supabaseStorage'
import { StorageUploadPanel } from './StorageUploadPanel'

const TripCalendar = lazy(() => import('./TripCalendar').then((module) => ({ default: module.TripCalendar })))
const TripMap = lazy(() => import('./TripMap').then((module) => ({ default: module.TripMap })))

const moneyFields = (prefix: string, label = 'Coste'): FieldConfig[] => [
  { name: `${prefix}.amount`, label: `${label} importe`, type: 'number', gridSpan: 4, step: '0.01' },
  { name: `${prefix}.currency`, label: 'Moneda', gridSpan: 4 },
  { name: `${prefix}.conversionRate`, label: 'Cambio a moneda base', type: 'number', gridSpan: 4, step: '0.000001' },
]

const flightFields: FieldConfig[] = [
  {
    name: 'legType',
    label: 'Tramo',
    type: 'select',
    options: Object.entries(flightLegLabels).map(([value, label]) => ({ value, label })),
  },
  { name: 'isInternational', label: 'Vuelo internacional', type: 'boolean' },
  { name: 'company', label: 'Compania' },
  { name: 'flightNumber', label: 'Numero de vuelo' },
  { name: 'originAirport', label: 'Aeropuerto origen' },
  { name: 'destinationAirport', label: 'Aeropuerto destino' },
  { name: 'departureAt', label: 'Salida', type: 'datetime-local' },
  { name: 'arrivalAt', label: 'Llegada', type: 'datetime-local' },
  { name: 'terminal', label: 'Terminal' },
  { name: 'seat', label: 'Asiento' },
  { name: 'bookingReference', label: 'Localizador' },
  ...moneyFields('cost'),
  { name: 'baggage.cabin', label: 'Equipaje de cabina', type: 'boolean' },
  { name: 'baggage.checked', label: 'Equipaje facturado', type: 'boolean' },
  { name: 'baggage.weightKg', label: 'Peso equipaje kg', type: 'number' },
  ...moneyFields('baggage.cost', 'Coste equipaje'),
  { name: 'priorityBoarding', label: 'Embarque prioritario', type: 'boolean' },
  { name: 'extras', label: 'Extras', type: 'tags', gridSpan: 12 },
  { name: 'notes', label: 'Notas', type: 'multiline', gridSpan: 12 },
]

const vehicleFields: FieldConfig[] = [
  { name: 'company', label: 'Compania' },
  { name: 'brand', label: 'Marca' },
  { name: 'model', label: 'Modelo' },
  { name: 'licensePlate', label: 'Matricula' },
  { name: 'fuelPolicy', label: 'Politica combustible' },
  { name: 'insurance', label: 'Seguro' },
  ...moneyFields('deductible', 'Franquicia'),
  { name: 'includedMileage', label: 'Kilometraje incluido' },
  ...moneyFields('deposit', 'Deposito'),
  { name: 'mainDriver', label: 'Conductor principal' },
  ...moneyFields('price', 'Precio'),
  { name: 'pickupPoint', label: 'Punto recogida' },
  { name: 'dropoffPoint', label: 'Punto devolucion' },
  { name: 'pickupAt', label: 'Hora recogida', type: 'datetime-local' },
  { name: 'dropoffAt', label: 'Hora devolucion', type: 'datetime-local' },
  { name: 'pickupLatitude', label: 'Latitud recogida', type: 'number' },
  { name: 'pickupLongitude', label: 'Longitud recogida', type: 'number' },
  { name: 'pickupGoogleMapsUrl', label: 'Google Maps recogida', type: 'url', gridSpan: 12 },
  { name: 'dropoffLatitude', label: 'Latitud devolucion', type: 'number' },
  { name: 'dropoffLongitude', label: 'Longitud devolucion', type: 'number' },
  { name: 'dropoffGoogleMapsUrl', label: 'Google Maps devolucion', type: 'url', gridSpan: 12 },
  { name: 'conditionPhotoUrls', label: 'Fotos estado del vehiculo', type: 'tags', gridSpan: 12 },
  { name: 'notes', label: 'Notas', type: 'multiline', gridSpan: 12 },
]

const accommodationFields: FieldConfig[] = [
  {
    name: 'type',
    label: 'Tipo',
    type: 'select',
    options: [
      { value: 'hotel', label: 'Hotel' },
      { value: 'apartamento', label: 'Apartamento' },
      { value: 'hostal', label: 'Hostal' },
      { value: 'casa-rural', label: 'Casa rural' },
      { value: 'otro', label: 'Otro' },
    ],
  },
  { name: 'name', label: 'Nombre' },
  { name: 'address', label: 'Direccion', gridSpan: 12 },
  { name: 'googleMapsUrl', label: 'Google Maps', type: 'url', gridSpan: 12 },
  { name: 'bookingReference', label: 'Numero de reserva' },
  { name: 'boardBasis', label: 'Regimen' },
  { name: 'checkInAt', label: 'Check-in', type: 'datetime-local' },
  { name: 'checkOutAt', label: 'Check-out', type: 'datetime-local' },
  ...moneyFields('cost'),
  ...moneyFields('touristTax', 'Tasa turistica'),
  ...moneyFields('deposit', 'Deposito'),
  { name: 'contactName', label: 'Contacto' },
  { name: 'contactPhone', label: 'Telefono contacto' },
  { name: 'services', label: 'Servicios', type: 'multiline', gridSpan: 12 },
  { name: 'hotelActivities', label: 'Actividades del hotel', type: 'multiline', gridSpan: 12 },
  { name: 'guests', label: 'Huespedes' },
  { name: 'room', label: 'Habitacion' },
  { name: 'cancellationPolicy', label: 'Cancelacion', type: 'multiline', gridSpan: 12 },
  { name: 'notes', label: 'Notas', type: 'multiline', gridSpan: 12 },
]

const dayFields: FieldConfig[] = [
  { name: 'date', label: 'Fecha', type: 'date' },
  { name: 'title', label: 'Titulo' },
  { name: 'notes', label: 'Notas', type: 'multiline', gridSpan: 12 },
]

const contactFields: FieldConfig[] = [
  {
    name: 'category',
    label: 'Categoria',
    type: 'select',
    options: Object.entries(contactCategoryLabels).map(([value, label]) => ({ value, label })),
  },
  { name: 'name', label: 'Nombre' },
  { name: 'phone', label: 'Telefono' },
  { name: 'email', label: 'Email' },
  { name: 'address', label: 'Direccion', gridSpan: 12 },
  { name: 'googleMapsUrl', label: 'Google Maps', type: 'url', gridSpan: 12 },
  { name: 'notes', label: 'Notas', type: 'multiline', gridSpan: 12 },
]

const insuranceFields: FieldConfig[] = [
  { name: 'provider', label: 'Proveedor' },
  { name: 'policyNumber', label: 'Poliza' },
  { name: 'contactPhone', label: 'Telefono asistencia' },
  { name: 'contactEmail', label: 'Email asistencia' },
  ...moneyFields('cost'),
  { name: 'coverageSummary', label: 'Coberturas', type: 'multiline', gridSpan: 12 },
  { name: 'documentUrl', label: 'URL documento', type: 'url', gridSpan: 12 },
  { name: 'notes', label: 'Notas', type: 'multiline', gridSpan: 12 },
]

const documentFields: FieldConfig[] = [
  {
    name: 'category',
    label: 'Categoria',
    type: 'select',
    options: Object.entries(documentCategoryLabels).map(([value, label]) => ({ value, label })),
  },
  { name: 'title', label: 'Titulo' },
  { name: 'fileUrl', label: 'URL archivo', type: 'url', gridSpan: 12 },
  { name: 'relatedTo', label: 'Relacionado con' },
  { name: 'notes', label: 'Notas', type: 'multiline', gridSpan: 12 },
]

const journalFields: FieldConfig[] = [
  { name: 'date', label: 'Fecha', type: 'date' },
  { name: 'title', label: 'Titulo' },
  { name: 'body', label: 'Entrada de diario', type: 'multiline', gridSpan: 12 },
  { name: 'photoUrls', label: 'URLs de fotos', type: 'tags', gridSpan: 12 },
  { name: 'mood', label: 'Estado de animo' },
]

const expenseFields: FieldConfig[] = [
  { name: 'category', label: 'Categoria' },
  { name: 'description', label: 'Descripcion' },
  { name: 'date', label: 'Fecha', type: 'date' },
  ...moneyFields('cost'),
  { name: 'paid', label: 'Pagado', type: 'boolean' },
]

const roleOptions = (roles: TripRole[]) => roles.map((value) => ({ value, label: tripRoleLabels[value] }))

const memberFields = (roles: TripRole[]): FieldConfig[] => [
  { name: 'name', label: 'Nombre' },
  { name: 'email', label: 'Email' },
  {
    name: 'role',
    label: 'Rol',
    type: 'select',
    options: roleOptions(roles),
  },
]

const invitationFields = (roles: TripRole[]): FieldConfig[] => [
  { name: 'email', label: 'Email' },
  {
    name: 'role',
    label: 'Rol',
    type: 'select',
    options: roleOptions(roles),
  },
]

function cleanDateTime(value?: string) {
  if (!value) return 'Sin fecha'
  return value.replace('T', ' ')
}

function MoneyText({ value, currency }: { value?: { amount: number; currency: string; conversionRate: number }; currency?: string }) {
  if (!value) return null
  return <>{formatMoney(value.amount, value.currency)} {value.currency !== currency ? `(x${value.conversionRate})` : ''}</>
}

function GoogleMapsButton({ url, label = 'Abrir en Google Maps' }: { url?: string; label?: string }) {
  if (!url) return null

  return (
    <Button size="small" component="a" href={url} target="_blank" rel="noopener noreferrer" sx={{ alignSelf: 'flex-start' }}>
      {label}
    </Button>
  )
}

function extractReservationUrl(notes?: string) {
  const match = notes?.match(/Ficha (?:Civitatis|oficial):\s*(https?:\/\/\S+)/i)
  return match?.[1]
}

function itemText(primary: string, secondary?: string) {
  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle1" sx={{ overflowWrap: 'anywhere' }}>
        {primary}
      </Typography>
      {secondary && (
        <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
          {secondary}
        </Typography>
      )}
    </Stack>
  )
}

export function TripDetailPage() {
  const { tripId } = useParams()
  const navigate = useNavigate()
  const {
    profile,
    trips,
    updateTrip,
    deleteTrip,
    duplicateTrip,
    inviteTripMember,
    addTripItem,
    updateTripItem,
    deleteTripItem,
    reorderItineraryItems,
    isRemoteMode,
  } = useTravelLog()
  const trip = trips.find((candidate) => candidate.id === tripId)
  const [tab, setTab] = useState(0)
  const [tripDialogOpen, setTripDialogOpen] = useState(false)
  const [deleteTripDialogOpen, setDeleteTripDialogOpen] = useState(false)
  const [showAllIssues, setShowAllIssues] = useState(false)

  const permissions = trip ? getPermissionsForTrip(trip, profile) : undefined
  const totals = trip ? calculateTripTotals(trip) : null
  const issues = trip ? findMissingData(trip) : []

  if (!trip) {
    return <Navigate to="/" replace />
  }

  if (!permissions?.canRead) {
    return (
      <AppShell>
        <Alert severity="warning">No tienes permisos para leer este viaje.</Alert>
      </AppShell>
    )
  }

  const canEdit = permissions.canEdit
  const assignableRoles = getAssignableRoles(permissions.role)
  const canManageMember = (member: TripMember) =>
    Boolean(permissions.role && member.role !== 'owner' && canAssignRole(permissions.role, member.role))
  const dayOptions = trip.itineraryDays.map((day) => ({ value: day.id, label: `${day.date} - ${day.title}` }))
  const itineraryFields: FieldConfig[] = [
    {
      name: 'dayId',
      label: 'Dia',
      type: 'select',
      options: dayOptions,
    },
    { name: 'title', label: 'Punto' },
    { name: 'description', label: 'Descripcion', type: 'multiline', gridSpan: 12 },
    { name: 'imageUrl', label: 'URL imagen', type: 'url', gridSpan: 12 },
    { name: 'googleMapsUrl', label: 'Google Maps', type: 'url', gridSpan: 12 },
    ...moneyFields('cost'),
    { name: 'latitude', label: 'Latitud', type: 'number' },
    { name: 'longitude', label: 'Longitud', type: 'number' },
    { name: 'recommendations.food', label: 'Recomendaciones comida', type: 'multiline', gridSpan: 12 },
    { name: 'recommendations.transport', label: 'Transporte', type: 'multiline', gridSpan: 12 },
    { name: 'recommendations.tips', label: 'Consejos', type: 'multiline', gridSpan: 12 },
    { name: 'recommendations.safety', label: 'Seguridad', type: 'multiline', gridSpan: 12 },
    { name: 'visited', label: 'Visitado', type: 'boolean' },
  ]
  const activityFields: FieldConfig[] = [
    { name: 'dayId', label: 'Dia asociado', type: 'select', options: [{ value: '', label: 'Sin dia' }, ...dayOptions] },
    { name: 'name', label: 'Actividad' },
    { name: 'provider', label: 'Proveedor' },
    { name: 'startsAt', label: 'Fecha y hora', type: 'datetime-local' },
    { name: 'location', label: 'Ubicacion' },
    { name: 'googleMapsUrl', label: 'Google Maps', type: 'url', gridSpan: 12 },
    { name: 'reservationUrl', label: 'Link reserva', type: 'url', gridSpan: 12 },
    ...moneyFields('cost'),
    { name: 'bookingReference', label: 'Reserva' },
    {
      name: 'paymentStatus',
      label: 'Estado pago',
      type: 'select',
      options: Object.entries(paymentStatusLabels).map(([value, label]) => ({ value, label })),
    },
    { name: 'notes', label: 'Notas', type: 'multiline', gridSpan: 12 },
  ]
  const restaurantFields: FieldConfig[] = [
    { name: 'dayId', label: 'Dia del itinerario', type: 'select', options: dayOptions },
    { name: 'name', label: 'Restaurante' },
    { name: 'cuisine', label: 'Tipo de cocina' },
    { name: 'location', label: 'Ubicacion', gridSpan: 12 },
    { name: 'googleMapsUrl', label: 'Google Maps', type: 'url', gridSpan: 12 },
    ...moneyFields('averagePrice', 'Precio medio'),
    { name: 'hasReservation', label: 'Tenemos reserva', type: 'boolean' },
    { name: 'reservationAt', label: 'Fecha y hora de reserva', type: 'datetime-local' },
    { name: 'bookingReference', label: 'Referencia / nombre de reserva', gridSpan: 12 },
    { name: 'notes', label: 'Notas', type: 'multiline', gridSpan: 12 },
  ]

  const saveTrip = (draft: TripDraft) => {
    updateTrip(trip.id, draft)
  }

  const exportPdf = async () => {
    const { downloadTripPdf } = await import('./TripPdf')
    await downloadTripPdf(trip)
  }

  const openDocument = async (fileUrl: string) => {
    const resolvedUrl = supabase ? await resolveTripFileUrl(supabase, fileUrl) : fileUrl
    window.open(resolvedUrl, '_blank', 'noopener,noreferrer')
  }

  const removeTrip = () => {
    setDeleteTripDialogOpen(false)
    deleteTrip(trip.id)
    navigate('/')
  }

  const duplicateAndOpen = () => {
    void duplicateTrip(trip.id)
      .then((duplicatedTrip) => navigate(`/trips/${duplicatedTrip.id}`))
      .catch(() => undefined)
  }

  return (
    <AppShell>
      <Stack spacing={3}>
        <Box
          sx={{
            minHeight: { xs: 300, md: 360 },
            borderRadius: 1,
            overflow: 'hidden',
            backgroundImage: `linear-gradient(90deg, rgba(8, 28, 25, 0.86), rgba(8, 28, 25, 0.32)), url(${trip.coverImageUrl})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            display: 'flex',
            alignItems: 'end',
            p: { xs: 2, md: 4 },
            color: '#fff',
          }}
        >
          <Stack spacing={2} sx={{ maxWidth: 900 }}>
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              <Chip label={tripStatusLabels[trip.status]} color="primary" />
              <Chip
                icon={trip.isPublic ? <PublicIcon /> : <LockIcon />}
                label={trip.isPublic ? 'Publico' : 'Privado'}
                color={trip.isPublic ? 'info' : 'default'}
                variant="filled"
              />
              {permissions.role && <Chip label={tripRoleLabels[permissions.role]} variant="filled" />}
              {trip.tags.map((tag) => (
                <Chip key={tag} label={tag} variant="outlined" sx={{ color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }} />
              ))}
            </Stack>
            <Box>
              <Typography variant="h3" sx={{ overflowWrap: 'anywhere' }}>
                {trip.title}
              </Typography>
              <Typography variant="h6" sx={{ color: 'rgba(255,255,255,0.86)' }}>
                {trip.destinations.join(' -> ')} | {getTripDateRangeLabel(trip.startDate, trip.endDate)}
              </Typography>
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              {canEdit && (
                <Button variant="contained" startIcon={<EditIcon />} onClick={() => setTripDialogOpen(true)}>
                  Editar viaje
                </Button>
              )}
              <Button variant="outlined" color="inherit" startIcon={<DescriptionIcon />} onClick={exportPdf}>
                Exportar PDF
              </Button>
              <Button variant="outlined" color="inherit" startIcon={<ContentCopyIcon />} onClick={duplicateAndOpen}>
                Duplicar
              </Button>
              {permissions.canDeleteTrip && (
                <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteTripDialogOpen(true)}>
                  Eliminar
                </Button>
              )}
            </Stack>
          </Stack>
        </Box>

        {totals && (
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
              gap: 2,
            }}
          >
            <StatTile icon={AccountBalanceWalletIcon} label="Total previsto" value={formatMoney(totals.total, totals.currency)} />
            <StatTile icon={EventAvailableIcon} label="Presupuesto" value={formatMoney(trip.budgetAmount, trip.baseCurrency)} tone="secondary" />
            <StatTile
              icon={ReportProblemIcon}
              label="Restante"
              value={formatMoney(totals.remainingBudget, totals.currency)}
              tone={totals.remainingBudget >= 0 ? 'success' : 'error'}
            />
            <StatTile icon={PeopleIcon} label="Miembros" value={trip.members.length} />
          </Box>
        )}

        <Paper variant="outlined">
          <Tabs value={tab} onChange={(_event, nextTab: number) => setTab(nextTab)} variant="scrollable" scrollButtons="auto">
            <Tab label="Resumen" />
            <Tab label="Vuelos" />
            <Tab label="Vehiculo" />
            <Tab label="Alojamientos" />
            <Tab label="Itinerario" />
            <Tab label="Restaurantes" />
            <Tab label="Actividades" />
            <Tab label="Contactos" />
            <Tab label="Diario" />
          </Tabs>
        </Paper>

        {tab === 0 && (
          <Stack spacing={2}>
            <Paper variant="outlined" sx={{ p: { xs: 1.5, md: 2 } }}>
              <Stack spacing={2}>
                <Typography variant="h6">Resumen</Typography>
                <Typography>{trip.notes || 'Sin notas generales.'}</Typography>
                <Divider />
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  {trip.companions.map((companion) => (
                    <Chip key={companion} icon={<PeopleIcon />} label={companion} />
                  ))}
                  {trip.destinations.map((destination) => (
                    <Chip key={destination} icon={<MapIcon />} label={destination} variant="outlined" />
                  ))}
                </Stack>
              </Stack>
            </Paper>

            {issues.length > 0 && (
              <Alert severity="warning">
                Hay {issues.length} datos incompletos: {(showAllIssues ? issues : issues.slice(0, 4)).map((issue) => issue.label).join('; ')}
                {issues.length > 4 && (
                  <Button size="small" onClick={() => setShowAllIssues((current) => !current)} sx={{ ml: 1 }}>
                    {showAllIssues ? 'Ver menos' : 'Ver mas'}
                  </Button>
                )}
              </Alert>
            )}

            <Suspense fallback={<Alert severity="info">Cargando calendario...</Alert>}>
              <TripCalendar trip={trip} />
            </Suspense>
            <Suspense fallback={<Alert severity="info">Cargando mapa...</Alert>}>
              <TripMap trip={trip} />
            </Suspense>
          </Stack>
        )}

        {tab === 1 && (
          <EntitySection<Flight>
            title="Vuelos"
            description="Ida, vuelta, conexiones e internacionales con equipaje y extras."
            icon={FlightTakeoffIcon}
            items={trip.flights}
            fields={flightFields}
            defaultValues={{
              legType: 'ida',
              isInternational: false,
              company: '',
              flightNumber: '',
              originAirport: '',
              destinationAirport: '',
              departureAt: '',
              arrivalAt: '',
              terminal: '',
              seat: '',
              bookingReference: '',
              cost: { amount: 0, currency: trip.baseCurrency, conversionRate: 1 },
              baggage: {
                cabin: true,
                checked: false,
                weightKg: 0,
                cost: { amount: 0, currency: trip.baseCurrency, conversionRate: 1 },
              },
              priorityBoarding: false,
              extras: [],
              notes: '',
            }}
            canEdit={canEdit}
            schema={flightSchema}
            addLabel="Anadir vuelo"
            onCreate={(values) => addTripItem(trip.id, 'flights', values as Omit<Flight, 'id' | 'tripId'>)}
            onUpdate={(id, values) => updateTripItem(trip.id, 'flights', id, values as Partial<Omit<Flight, 'id' | 'tripId'>>)}
            onDelete={(id) => deleteTripItem(trip.id, 'flights', id)}
            renderItem={(flight) =>
              itemText(
                `${flightLegLabels[flight.legType]} | ${flight.company} ${flight.flightNumber}`,
                `${flight.originAirport} -> ${flight.destinationAirport} | ${cleanDateTime(flight.departureAt)} | ${formatMoney(flight.cost.amount, flight.cost.currency)}`,
              )
            }
          />
        )}

        {tab === 2 && (
          <EntitySection<VehicleRental>
            title="Vehiculos de alquiler"
            description="Normalmente uno por viaje, con seguro, recogida, devolucion y fotos de estado."
            icon={DirectionsCarIcon}
            items={trip.vehicleRentals}
            fields={vehicleFields}
            defaultValues={{
              company: '',
              brand: '',
              model: '',
              licensePlate: '',
              fuelPolicy: '',
              insurance: '',
              deductible: { amount: 0, currency: trip.baseCurrency, conversionRate: 1 },
              includedMileage: '',
              deposit: { amount: 0, currency: trip.baseCurrency, conversionRate: 1 },
              mainDriver: '',
              price: { amount: 0, currency: trip.baseCurrency, conversionRate: 1 },
              pickupPoint: '',
              dropoffPoint: '',
              pickupAt: '',
              dropoffAt: '',
              pickupLatitude: undefined,
              pickupLongitude: undefined,
              dropoffLatitude: undefined,
              dropoffLongitude: undefined,
              pickupGoogleMapsUrl: '',
              dropoffGoogleMapsUrl: '',
              conditionPhotoUrls: [],
              notes: '',
            }}
            canEdit={canEdit}
            addLabel="Anadir vehiculo"
            onCreate={(values) => addTripItem(trip.id, 'vehicleRentals', values as Omit<VehicleRental, 'id' | 'tripId'>)}
            onUpdate={(id, values) =>
              updateTripItem(trip.id, 'vehicleRentals', id, values as Partial<Omit<VehicleRental, 'id' | 'tripId'>>)
            }
            onDelete={(id) => deleteTripItem(trip.id, 'vehicleRentals', id)}
            renderItem={(rental) => (
              <Stack spacing={0.5}>
                {itemText(
                  `${rental.company} | ${rental.brand} ${rental.model}`,
                  `${rental.pickupPoint} -> ${rental.dropoffPoint} | ${formatMoney(rental.price.amount, rental.price.currency)} | Fotos: ${rental.conditionPhotoUrls.length}`,
                )}
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                  <GoogleMapsButton url={rental.pickupGoogleMapsUrl} label="Maps recogida" />
                  <GoogleMapsButton url={rental.dropoffGoogleMapsUrl} label="Maps devolucion" />
                </Stack>
              </Stack>
            )}
          />
        )}

        {tab === 3 && (
          <EntitySection<Accommodation>
            title="Alojamientos"
            description="Hoteles, apartamentos y reservas con regimen, servicios y costes extras."
            icon={HotelIcon}
            items={trip.accommodations}
            fields={accommodationFields}
            defaultValues={{
              type: 'hotel',
              name: '',
              address: '',
              googleMapsUrl: '',
              bookingReference: '',
              boardBasis: '',
              checkInAt: '',
              checkOutAt: '',
              cost: { amount: 0, currency: trip.baseCurrency, conversionRate: 1 },
              touristTax: { amount: 0, currency: trip.baseCurrency, conversionRate: 1 },
              deposit: { amount: 0, currency: trip.baseCurrency, conversionRate: 1 },
              contactName: '',
              contactPhone: '',
              services: '',
              hotelActivities: '',
              guests: '',
              room: '',
              cancellationPolicy: '',
              notes: '',
            }}
            canEdit={canEdit}
            schema={accommodationSchema}
            addLabel="Anadir alojamiento"
            onCreate={(values) => addTripItem(trip.id, 'accommodations', values as Omit<Accommodation, 'id' | 'tripId'>)}
            onUpdate={(id, values) =>
              updateTripItem(trip.id, 'accommodations', id, values as Partial<Omit<Accommodation, 'id' | 'tripId'>>)
            }
            onDelete={(id) => deleteTripItem(trip.id, 'accommodations', id)}
            renderItem={(accommodation) => (
              <Stack spacing={0.5}>
                {itemText(
                  accommodation.name,
                  `${accommodation.address} | ${cleanDateTime(accommodation.checkInAt)} - ${cleanDateTime(accommodation.checkOutAt)} | ${formatMoney(accommodation.cost.amount, accommodation.cost.currency)}`,
                )}
                <GoogleMapsButton url={accommodation.googleMapsUrl} />
              </Stack>
            )}
          />
        )}

        {tab === 4 && (
          <Stack spacing={2}>
            <EntitySection<ItineraryDay>
              title="Dias del itinerario"
              icon={CalendarMonthIcon}
              items={trip.itineraryDays}
              fields={dayFields}
              defaultValues={{ date: trip.startDate, title: '', notes: '' }}
              canEdit={canEdit}
              addLabel="Anadir dia"
              onCreate={(values) => addTripItem(trip.id, 'itineraryDays', values as Omit<ItineraryDay, 'id' | 'tripId'>)}
              onUpdate={(id, values) =>
                updateTripItem(trip.id, 'itineraryDays', id, values as Partial<Omit<ItineraryDay, 'id' | 'tripId'>>)
              }
              onDelete={(id) => deleteTripItem(trip.id, 'itineraryDays', id)}
              renderItem={(day) => itemText(`${day.date} | ${day.title}`, day.notes)}
            />

            <EntitySection<ItineraryItem>
              title="Puntos del itinerario"
              description="Ordena arrastrando, marca visitados y guarda recomendaciones por zona."
              icon={MapIcon}
              items={trip.itineraryItems.slice().sort((a, b) => a.order - b.order)}
              fields={itineraryFields}
              defaultValues={{
                dayId: trip.itineraryDays[0]?.id ?? '',
                title: '',
                description: '',
                imageUrl: '',
                googleMapsUrl: '',
                cost: { amount: 0, currency: trip.baseCurrency, conversionRate: 1 },
                latitude: undefined,
                longitude: undefined,
                recommendations: { food: '', transport: '', tips: '', safety: '' },
                visited: false,
                order: trip.itineraryItems.length + 1,
              }}
              canEdit={canEdit && trip.itineraryDays.length > 0}
              sortable
              addLabel="Anadir punto"
              onReorder={(ids) => reorderItineraryItems(trip.id, ids)}
              onCreate={(values) => addTripItem(trip.id, 'itineraryItems', values as Omit<ItineraryItem, 'id' | 'tripId'>)}
              onUpdate={(id, values) =>
                updateTripItem(trip.id, 'itineraryItems', id, values as Partial<Omit<ItineraryItem, 'id' | 'tripId'>>)
              }
              onDelete={(id) => deleteTripItem(trip.id, 'itineraryItems', id)}
              emptyLabel={trip.itineraryDays.length === 0 ? 'Crea primero un dia del itinerario.' : 'Sin puntos de itinerario.'}
              renderItem={(item) => {
                const coordinates = resolveCoordinates(item.latitude, item.longitude, item.googleMapsUrl)

                return (
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                    {item.imageUrl && (
                      <Box
                        component="img"
                        src={item.imageUrl}
                        alt={item.title}
                        sx={{ width: { xs: '100%', sm: 132 }, height: 92, objectFit: 'cover', borderRadius: 1 }}
                      />
                    )}
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography variant="subtitle1">{item.title}</Typography>
                        <Chip size="small" label={item.visited ? 'Visitado' : 'Pendiente'} color={item.visited ? 'success' : 'default'} />
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        {item.description}
                      </Typography>
                      {coordinates && (
                        <Typography variant="body2" color="text.secondary">
                          {coordinates.latitude.toFixed(5)}, {coordinates.longitude.toFixed(5)}
                        </Typography>
                      )}
                      <Typography variant="body2">
                        Coste: <MoneyText value={item.cost} currency={trip.baseCurrency} />
                      </Typography>
                      <GoogleMapsButton url={item.googleMapsUrl} />
                    </Box>
                  </Stack>
                )
              }}
            />
          </Stack>
        )}

        {tab === 5 && (
          <EntitySection<Restaurant>
            title="Restaurantes"
            description="Reservas, ubicaciones y precio medio asociados al itinerario."
            icon={RestaurantIcon}
            items={trip.restaurants}
            fields={restaurantFields}
            defaultValues={{
              dayId: trip.itineraryDays[0]?.id ?? '',
              name: '',
              cuisine: '',
              location: '',
              googleMapsUrl: '',
              averagePrice: { amount: 0, currency: trip.baseCurrency, conversionRate: 1 },
              hasReservation: false,
              reservationAt: '',
              bookingReference: '',
              notes: '',
            }}
            canEdit={canEdit && trip.itineraryDays.length > 0}
            schema={restaurantSchema}
            addLabel="Anadir restaurante"
            emptyLabel={trip.itineraryDays.length === 0 ? 'Crea primero un dia del itinerario.' : 'Sin restaurantes.'}
            onCreate={(values) => addTripItem(trip.id, 'restaurants', values as Omit<Restaurant, 'id' | 'tripId'>)}
            onUpdate={(id, values) =>
              updateTripItem(trip.id, 'restaurants', id, values as Partial<Omit<Restaurant, 'id' | 'tripId'>>)
            }
            onDelete={(id) => deleteTripItem(trip.id, 'restaurants', id)}
            renderItem={(restaurant) => {
              const day = trip.itineraryDays.find((candidate) => candidate.id === restaurant.dayId)

              return (
                <Stack spacing={0.75}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="subtitle1" sx={{ overflowWrap: 'anywhere' }}>
                      {restaurant.name}
                    </Typography>
                    {restaurant.cuisine && <Chip size="small" label={restaurant.cuisine} />}
                    <Chip
                      size="small"
                      label={restaurant.hasReservation ? 'Reservado' : 'Sin reserva'}
                      color={restaurant.hasReservation ? 'success' : 'default'}
                    />
                  </Stack>
                  <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                    {(day ? `${day.date} | ${day.title}` : 'Sin dia')} | {restaurant.location} | Precio medio:{' '}
                    <MoneyText value={restaurant.averagePrice} currency={trip.baseCurrency} />
                  </Typography>
                  {restaurant.reservationAt && (
                    <Typography variant="body2" color="text.secondary">
                      Reserva: {cleanDateTime(restaurant.reservationAt)}
                      {restaurant.bookingReference ? ` | ${restaurant.bookingReference}` : ''}
                    </Typography>
                  )}
                  {restaurant.notes && (
                    <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>
                      {restaurant.notes}
                    </Typography>
                  )}
                  <GoogleMapsButton url={restaurant.googleMapsUrl} />
                </Stack>
              )
            }}
          />
        )}

        {tab === 6 && (
          <Stack spacing={2}>
            <EntitySection<Activity>
              title="Actividades extra"
              description="Opcionales con sobrecoste: museos, escuelas, tours y reservas."
              icon={LocalActivityIcon}
              items={trip.activities}
              fields={activityFields}
              defaultValues={{
                dayId: '',
                name: '',
                provider: '',
                startsAt: '',
                location: '',
                googleMapsUrl: '',
                reservationUrl: '',
                cost: { amount: 0, currency: trip.baseCurrency, conversionRate: 1 },
                bookingReference: '',
                paymentStatus: 'pendiente',
                notes: '',
              }}
              canEdit={canEdit}
              schema={activitySchema}
              addLabel="Anadir actividad"
              onCreate={(values) => addTripItem(trip.id, 'activities', values as Omit<Activity, 'id' | 'tripId'>)}
              onUpdate={(id, values) =>
                updateTripItem(trip.id, 'activities', id, values as Partial<Omit<Activity, 'id' | 'tripId'>>)
              }
              onDelete={(id) => deleteTripItem(trip.id, 'activities', id)}
              renderItem={(activity) => {
                const reservationUrl = activity.reservationUrl ?? extractReservationUrl(activity.notes)

                return (
                  <Stack spacing={0.5}>
                    {itemText(
                      activity.name,
                      `${activity.provider || 'Sin proveedor'} | ${cleanDateTime(activity.startsAt)} | ${formatMoney(activity.cost.amount, activity.cost.currency)} | ${paymentStatusLabels[activity.paymentStatus]}`,
                    )}
                    <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                      <GoogleMapsButton url={activity.googleMapsUrl} />
                      <GoogleMapsButton url={reservationUrl} label="Reserva" />
                    </Stack>
                  </Stack>
                )
              }}
            />

            <EntitySection<Expense>
              title="Gastos generales"
              description="Gastos que no encajan en vuelo, alojamiento, coche, seguro o actividad."
              icon={AccountBalanceWalletIcon}
              items={trip.expenses}
              fields={expenseFields}
              defaultValues={{
                category: '',
                description: '',
                date: '',
                cost: { amount: 0, currency: trip.baseCurrency, conversionRate: 1 },
                paid: false,
              }}
              canEdit={canEdit}
              schema={expenseSchema}
              addLabel="Anadir gasto"
              onCreate={(values) => addTripItem(trip.id, 'expenses', values as Omit<Expense, 'id' | 'tripId'>)}
              onUpdate={(id, values) => updateTripItem(trip.id, 'expenses', id, values as Partial<Omit<Expense, 'id' | 'tripId'>>)}
              onDelete={(id) => deleteTripItem(trip.id, 'expenses', id)}
              renderItem={(expense) =>
                itemText(
                  `${expense.category} | ${expense.description}`,
                  `${expense.date || 'Sin fecha'} | ${formatMoney(expense.cost.amount, expense.cost.currency)} | ${expense.paid ? 'Pagado' : 'Pendiente'}`,
                )
              }
            />
          </Stack>
        )}

        {tab === 7 && (
          <Stack spacing={2}>
            <EntitySection<Contact>
              title="Telefonos de interes"
              description="Emergencias, embajada, hotel, alquiler, seguro, aerolinea y contactos personales."
              icon={PhoneIcon}
              items={trip.contacts}
              fields={contactFields}
              defaultValues={{ category: 'emergencia', name: '', phone: '', email: '', address: '', googleMapsUrl: '', notes: '' }}
              canEdit={canEdit}
              addLabel="Anadir telefono"
              onCreate={(values) => addTripItem(trip.id, 'contacts', values as Omit<Contact, 'id' | 'tripId'>)}
              onUpdate={(id, values) => updateTripItem(trip.id, 'contacts', id, values as Partial<Omit<Contact, 'id' | 'tripId'>>)}
              onDelete={(id) => deleteTripItem(trip.id, 'contacts', id)}
              renderItem={(contact) => (
                <Stack spacing={0.75}>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Typography variant="subtitle1">{contact.name}</Typography>
                    <Chip size="small" label={contactCategoryLabels[contact.category]} />
                  </Stack>
                  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                    <Button size="small" component="a" href={`tel:${contact.phone}`}>
                      Llamar
                    </Button>
                    <Button size="small" onClick={() => navigator.clipboard?.writeText(contact.phone)}>
                      Copiar
                    </Button>
                    <Typography variant="body2" color="text.secondary">
                      {contact.phone}
                    </Typography>
                  </Stack>
                  <GoogleMapsButton url={contact.googleMapsUrl} />
                </Stack>
              )}
            />

            <EntitySection<Insurance>
              title="Seguros"
              icon={ShieldIcon}
              items={trip.insurances}
              fields={insuranceFields}
              defaultValues={{
                provider: '',
                policyNumber: '',
                contactPhone: '',
                contactEmail: '',
                cost: { amount: 0, currency: trip.baseCurrency, conversionRate: 1 },
                coverageSummary: '',
                documentUrl: '',
                notes: '',
              }}
              canEdit={canEdit}
              addLabel="Anadir seguro"
              onCreate={(values) => addTripItem(trip.id, 'insurances', values as Omit<Insurance, 'id' | 'tripId'>)}
              onUpdate={(id, values) =>
                updateTripItem(trip.id, 'insurances', id, values as Partial<Omit<Insurance, 'id' | 'tripId'>>)
              }
              onDelete={(id) => deleteTripItem(trip.id, 'insurances', id)}
              renderItem={(insurance) =>
                itemText(
                  `${insurance.provider} | ${insurance.policyNumber}`,
                  `${insurance.contactPhone || 'Sin telefono'} | ${formatMoney(insurance.cost.amount, insurance.cost.currency)}`,
                )
              }
            />

            <StorageUploadPanel
              tripId={trip.id}
              canEdit={canEdit}
              isRemoteMode={isRemoteMode}
              onDocumentCreated={(document) => addTripItem(trip.id, 'documents', document)}
            />

            <EntitySection<TravelDocument>
              title="Documentos"
              icon={DescriptionIcon}
              items={trip.documents}
              fields={documentFields}
              defaultValues={{ category: 'reserva', title: '', fileUrl: '', relatedTo: '', notes: '' }}
              canEdit={canEdit}
              addLabel="Anadir documento"
              onCreate={(values) => addTripItem(trip.id, 'documents', values as Omit<TravelDocument, 'id' | 'tripId'>)}
              onUpdate={(id, values) =>
                updateTripItem(trip.id, 'documents', id, values as Partial<Omit<TravelDocument, 'id' | 'tripId'>>)
              }
              onDelete={(id) => deleteTripItem(trip.id, 'documents', id)}
              renderItem={(document) => (
                <Stack spacing={0.5}>
                  <Typography variant="subtitle1">{document.title}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {documentCategoryLabels[document.category]} | {document.relatedTo || 'General'}
                  </Typography>
                  <Button size="small" sx={{ alignSelf: 'flex-start' }} onClick={() => void openDocument(document.fileUrl)}>
                    Abrir documento
                  </Button>
                </Stack>
              )}
            />
          </Stack>
        )}

        {tab === 8 && (
          <Stack spacing={2}>
            <EntitySection<JournalEntry>
              title="Diario de bitacora"
              description="Entradas por dia, notas personales y fotos por URL."
              icon={NoteAltIcon}
              items={trip.journalEntries}
              fields={journalFields}
              defaultValues={{ date: trip.startDate, title: '', body: '', photoUrls: [], mood: '' }}
              canEdit={canEdit}
              addLabel="Anadir entrada"
              onCreate={(values) => addTripItem(trip.id, 'journalEntries', values as Omit<JournalEntry, 'id' | 'tripId'>)}
              onUpdate={(id, values) =>
                updateTripItem(trip.id, 'journalEntries', id, values as Partial<Omit<JournalEntry, 'id' | 'tripId'>>)
              }
              onDelete={(id) => deleteTripItem(trip.id, 'journalEntries', id)}
              renderItem={(entry) => (
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                  {entry.photoUrls[0] && (
                    <Box
                      component="img"
                      src={entry.photoUrls[0]}
                      alt={entry.title}
                      sx={{ width: { xs: '100%', sm: 132 }, height: 92, objectFit: 'cover', borderRadius: 1 }}
                    />
                  )}
                  {itemText(`${entry.date} | ${entry.title}`, `${entry.mood || 'Sin estado'} | ${entry.body}`)}
                </Stack>
              )}
            />

            <EntitySection<TripMember>
              title="Miembros y permisos"
              description="Usuarios con acceso efectivo a este viaje."
              icon={ContactsIcon}
              items={trip.members}
              fields={memberFields(assignableRoles)}
              defaultValues={{ name: '', email: '', role: 'reader' }}
              canEdit={permissions.canManageMembers}
              canCreate={false}
              canEditItem={canManageMember}
              canDeleteItem={canManageMember}
              addLabel="Anadir miembro"
              onCreate={() => undefined}
              onUpdate={(id, values) =>
                updateTripItem(trip.id, 'members', id, values as Partial<Omit<TripMember, 'id' | 'tripId'>>)
              }
              onDelete={(id) => deleteTripItem(trip.id, 'members', id)}
              renderItem={(member) => itemText(member.name, `${member.email} | ${tripRoleLabels[member.role]}`)}
            />

            <EntitySection<TripInvitation>
              title="Invitaciones pendientes"
              description="Comparte el viaje por email. Si la persona no existe aun, se activara al iniciar sesion con Google."
              icon={PeopleIcon}
              items={trip.invitations.filter((invitation) => invitation.status === 'pending')}
              fields={invitationFields(assignableRoles)}
              defaultValues={{ email: '', role: assignableRoles[0] ?? 'reader' }}
              canEdit={permissions.canManageMembers && assignableRoles.length > 0}
              schema={tripInvitationSchema}
              addLabel="Invitar por email"
              onCreate={(values) => void inviteTripMember(trip.id, values as Pick<TripInvitation, 'email' | 'role'>)}
              onUpdate={(id, values) =>
                updateTripItem(trip.id, 'invitations', id, values as Partial<Omit<TripInvitation, 'id' | 'tripId'>>)
              }
              onDelete={(id) => deleteTripItem(trip.id, 'invitations', id)}
              renderItem={(invitation) =>
                itemText(
                  invitation.email,
                  `${tripRoleLabels[invitation.role]} | Pendiente desde ${new Date(invitation.createdAt).toLocaleDateString('es-ES')}`,
                )
              }
            />
          </Stack>
        )}
      </Stack>

      <TripFormDialog
        open={tripDialogOpen}
        trip={trip}
        onClose={() => setTripDialogOpen(false)}
        onSave={saveTrip}
      />
      <ConfirmDeleteDialog
        open={deleteTripDialogOpen}
        title="Eliminar viaje"
        description={`Vas a eliminar "${trip.title}". Esta accion no se puede deshacer.`}
        confirmLabel="Eliminar viaje"
        onCancel={() => setDeleteTripDialogOpen(false)}
        onConfirm={removeTrip}
      />
    </AppShell>
  )
}
