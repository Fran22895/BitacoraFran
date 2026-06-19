import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import EventAvailableIcon from '@mui/icons-material/EventAvailable'
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff'
import SearchIcon from '@mui/icons-material/Search'
import {
  Box,
  Button,
  Card,
  CardActionArea,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  IconButton,
  InputAdornment,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AppShell } from '../../components/AppShell'
import { StatTile } from '../../components/StatTile'
import { TripFormDialog } from '../../components/TripFormDialog'
import { findMissingData, calculateTripTotals, formatMoney, getTripDateRangeLabel, sortTripsByRecent } from '../../domain/calculations'
import { tripStatusLabels } from '../../domain/constants'
import { getPermissionsForTrip } from '../../domain/permissions'
import type { Trip, TripStatus } from '../../domain/types'
import { useTravelLog } from '../../store/TravelLogContext'

const allStatuses = 'all'

export function DashboardPage() {
  const navigate = useNavigate()
  const { profile, trips, createTrip, updateTrip, deleteTrip } = useTravelLog()
  const [tripDialogOpen, setTripDialogOpen] = useState(false)
  const [editingTrip, setEditingTrip] = useState<Trip | undefined>()
  const [statusFilter, setStatusFilter] = useState<TripStatus | typeof allStatuses>(allStatuses)
  const [search, setSearch] = useState('')
  const [tagFilter, setTagFilter] = useState('')

  const allTags = useMemo(() => Array.from(new Set(trips.flatMap((trip) => trip.tags))).sort(), [trips])
  const visibleTrips = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase()

    return sortTripsByRecent(trips).filter((trip) => {
      const matchesStatus = statusFilter === allStatuses || trip.status === statusFilter
      const matchesTag = !tagFilter || trip.tags.includes(tagFilter)
      const matchesSearch =
        !normalizedSearch ||
        [trip.title, trip.destinations.join(' '), trip.tags.join(' ')]
          .join(' ')
          .toLowerCase()
          .includes(normalizedSearch)

      return matchesStatus && matchesTag && matchesSearch
    })
  }, [search, statusFilter, tagFilter, trips])

  const globalStats = useMemo(() => {
    const totals = trips.map(calculateTripTotals)
    const totalBudget = trips.reduce((sum, trip) => sum + trip.budgetAmount, 0)
    const totalSpent = totals.reduce((sum, total) => sum + total.total, 0)
    const upcoming = trips.filter((trip) => new Date(trip.endDate) >= new Date() && trip.status !== 'cancelled').length
    const missing = trips.reduce((count, trip) => count + findMissingData(trip).length, 0)

    return { totalBudget, totalSpent, upcoming, missing }
  }, [trips])

  const handleSaveTrip = (draft: Parameters<typeof createTrip>[0]) => {
    if (editingTrip) {
      updateTrip(editingTrip.id, draft)
    } else {
      createTrip(draft)
    }
  }

  const openCreate = () => {
    setEditingTrip(undefined)
    setTripDialogOpen(true)
  }

  const openEdit = (trip: Trip) => {
    setEditingTrip(trip)
    setTripDialogOpen(true)
  }

  return (
    <AppShell onCreateTrip={openCreate}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4">Dashboard de viajes</Typography>
          <Typography color="text.secondary">
            Viajes ordenados por fecha mas reciente, con filtros para encontrar rapido planes pasados y futuros.
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' },
            gap: 2,
          }}
        >
          <StatTile icon={FlightTakeoffIcon} label="Viajes" value={trips.length} />
          <StatTile icon={EventAvailableIcon} label="Proximos/en curso" value={globalStats.upcoming} tone="success" />
          <StatTile
            icon={AccountBalanceWalletIcon}
            label="Gastado / presupuesto"
            value={`${formatMoney(globalStats.totalSpent)} / ${formatMoney(globalStats.totalBudget)}`}
            tone="secondary"
          />
          <StatTile icon={ReportProblemIcon} label="Datos incompletos" value={globalStats.missing} tone="warning" />
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: '2fr 1fr 1fr' },
            gap: 2,
          }}
        >
          <TextField
            label="Buscar por viaje, destino o etiqueta"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              },
            }}
          />
          <TextField select label="Estado" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as TripStatus | typeof allStatuses)}>
            <MenuItem value={allStatuses}>Todos</MenuItem>
            {Object.entries(tripStatusLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField select label="Etiqueta" value={tagFilter} onChange={(event) => setTagFilter(event.target.value)}>
            <MenuItem value="">Todas</MenuItem>
            {allTags.map((tag) => (
              <MenuItem key={tag} value={tag}>
                {tag}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', xl: 'repeat(3, 1fr)' },
            gap: 2,
          }}
        >
          {visibleTrips.map((trip) => {
            const permissions = getPermissionsForTrip(trip, profile)
            const totals = calculateTripTotals(trip)
            const issues = findMissingData(trip)

            return (
              <Card key={trip.id} variant="outlined" sx={{ display: 'flex', flexDirection: 'column' }}>
                <CardActionArea onClick={() => navigate(`/trips/${trip.id}`)}>
                  {trip.coverImageUrl && (
                    <CardMedia component="img" image={trip.coverImageUrl} alt={trip.title} sx={{ height: 170 }} />
                  )}
                  <CardContent>
                    <Stack spacing={1.25}>
                      <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="h6" sx={{ overflowWrap: 'anywhere' }}>
                            {trip.title}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {getTripDateRangeLabel(trip.startDate, trip.endDate)}
                          </Typography>
                        </Box>
                        <Chip label={tripStatusLabels[trip.status]} size="small" color={trip.status === 'active' ? 'success' : 'default'} />
                      </Stack>
                      <Typography variant="body2">{trip.destinations.join(' -> ')}</Typography>
                      <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                        {trip.tags.map((tag) => (
                          <Chip key={tag} label={tag} size="small" variant="outlined" />
                        ))}
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Total previsto: {formatMoney(totals.total, totals.currency)} de {formatMoney(trip.budgetAmount, trip.baseCurrency)}
                      </Typography>
                      {issues.length > 0 && (
                        <Chip size="small" color="warning" label={`${issues.length} datos incompletos`} sx={{ alignSelf: 'flex-start' }} />
                      )}
                    </Stack>
                  </CardContent>
                </CardActionArea>
                <CardActions sx={{ mt: 'auto', justifyContent: 'space-between' }}>
                  <Button onClick={() => navigate(`/trips/${trip.id}`)}>Abrir</Button>
                  <Stack direction="row">
                    {permissions.canEdit && (
                      <Tooltip title="Editar viaje">
                        <IconButton onClick={() => openEdit(trip)} aria-label="Editar viaje">
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                    {permissions.canDeleteTrip && (
                      <Tooltip title="Eliminar viaje">
                        <IconButton color="error" onClick={() => deleteTrip(trip.id)} aria-label="Eliminar viaje">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Stack>
                </CardActions>
              </Card>
            )
          })}
        </Box>

        {visibleTrips.length === 0 && (
          <Stack spacing={2} sx={{ alignItems: 'flex-start' }}>
            <Typography color="text.secondary">No hay viajes que coincidan con los filtros.</Typography>
            <Button variant="contained" onClick={openCreate}>
              Crear viaje
            </Button>
          </Stack>
        )}
      </Stack>

      <TripFormDialog
        open={tripDialogOpen}
        trip={editingTrip}
        onClose={() => setTripDialogOpen(false)}
        onSave={handleSaveTrip}
      />
    </AppShell>
  )
}
