import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import type { EventClickArg, EventHoveringArg } from '@fullcalendar/core'
import { Box, Chip, Paper, Popover, Stack, Typography } from '@mui/material'
import { useMemo, useState } from 'react'
import type { Trip } from '../../domain/types'

interface TripCalendarProps {
  trip: Trip
}

interface ActiveDayPopup {
  dayId: string
  anchorEl: HTMLElement
  mode: 'hover' | 'click'
}

function supportsHover() {
  return window.matchMedia('(hover: hover) and (pointer: fine)').matches
}

export function TripCalendar({ trip }: TripCalendarProps) {
  const [activePopup, setActivePopup] = useState<ActiveDayPopup | null>(null)
  const itineraryItemsByDay = useMemo(() => {
    const grouped = new Map<string, typeof trip.itineraryItems>()

    trip.itineraryItems
      .slice()
      .sort((a, b) => a.order - b.order)
      .forEach((item) => {
        grouped.set(item.dayId, [...(grouped.get(item.dayId) ?? []), item])
      })

    return grouped
  }, [trip])
  const activeDay = activePopup ? trip.itineraryDays.find((day) => day.id === activePopup.dayId) : undefined
  const activeItems = activeDay ? itineraryItemsByDay.get(activeDay.id) ?? [] : []
  const events = useMemo(
    () =>
      [
        ...trip.itineraryDays.map((day) => ({
          id: day.id,
          title: day.title,
          start: day.date,
          allDay: true,
          color: '#0f766e',
          extendedProps: { kind: 'itinerary-day' },
        })),
        ...trip.flights.map((flight) => ({
          id: flight.id,
          title: `${flight.company} ${flight.flightNumber}`,
          start: flight.departureAt,
          end: flight.arrivalAt,
          color: '#2563eb',
          extendedProps: { kind: 'flight' },
        })),
        ...trip.activities.map((activity) => ({
          id: activity.id,
          title: activity.name,
          start: activity.startsAt,
          color: '#b45309',
          extendedProps: { kind: 'activity' },
        })),
        ...trip.restaurants.map((restaurant) => {
          const day = trip.itineraryDays.find((candidate) => candidate.id === restaurant.dayId)
          return {
            id: restaurant.id,
            title: restaurant.name,
            start: restaurant.reservationAt || day?.date,
            allDay: !restaurant.reservationAt,
            color: '#be123c',
            extendedProps: { kind: 'restaurant' },
          }
        }),
        ...trip.accommodations.map((accommodation) => ({
          id: accommodation.id,
          title: accommodation.name,
          start: accommodation.checkInAt,
          end: accommodation.checkOutAt,
          color: '#7c3aed',
          extendedProps: { kind: 'accommodation' },
        })),
      ].filter((event) => event.start),
    [trip],
  )

  const openDayPopup = (dayId: string, anchorEl: HTMLElement, mode: ActiveDayPopup['mode']) => {
    setActivePopup({ dayId, anchorEl, mode })
  }

  const closeDayPopup = () => {
    setActivePopup(null)
  }

  const handleEventMouseEnter = (info: EventHoveringArg) => {
    if (info.event.extendedProps.kind !== 'itinerary-day' || !supportsHover()) return
    openDayPopup(info.event.id, info.el, 'hover')
  }

  const handleEventMouseLeave = (info: EventHoveringArg) => {
    if (info.event.extendedProps.kind !== 'itinerary-day' || !supportsHover()) return
    closeDayPopup()
  }

  const handleEventClick = (info: EventClickArg) => {
    if (info.event.extendedProps.kind !== 'itinerary-day' || supportsHover()) return

    info.jsEvent.preventDefault()
    setActivePopup((current) =>
      current?.dayId === info.event.id ? null : { dayId: info.event.id, anchorEl: info.el, mode: 'click' },
    )
  }

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1, md: 2 } }}>
      <Stack spacing={2}>
        <Typography variant="h6">Calendario del viaje</Typography>
        <FullCalendar
          plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          initialDate={trip.startDate}
          locale="es"
          height="auto"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay',
          }}
          buttonText={{
            today: 'hoy',
            month: 'mes',
            week: 'semana',
            day: 'dia',
          }}
          events={events}
          eventMouseEnter={handleEventMouseEnter}
          eventMouseLeave={handleEventMouseLeave}
          eventClick={handleEventClick}
        />
        <Popover
          open={Boolean(activePopup)}
          anchorEl={activePopup?.anchorEl ?? null}
          onClose={closeDayPopup}
          disableRestoreFocus
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
          transformOrigin={{ vertical: 'top', horizontal: 'left' }}
          sx={{ pointerEvents: activePopup?.mode === 'hover' ? 'none' : 'auto' }}
          slotProps={{
            paper: {
              sx: {
                maxWidth: 340,
                p: 1.5,
                borderRadius: 1,
                boxShadow: '0 10px 30px rgba(15, 23, 42, 0.18)',
              },
            },
          }}
        >
          {activeDay && (
            <Stack spacing={1}>
              <Box>
                <Typography variant="subtitle2" sx={{ overflowWrap: 'anywhere' }}>
                  {activeDay.title}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {activeDay.date}
                </Typography>
              </Box>
              {activeItems.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Sin puntos de itinerario para este dia.
                </Typography>
              ) : (
                <Stack spacing={0.75}>
                  {activeItems.map((item) => (
                    <Box key={item.id}>
                      <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}>
                          {item.title}
                        </Typography>
                        <Chip size="small" label={item.visited ? 'Visitado' : 'Pendiente'} />
                      </Stack>
                      {item.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', overflowWrap: 'anywhere' }}>
                          {item.description}
                        </Typography>
                      )}
                    </Box>
                  ))}
                </Stack>
              )}
            </Stack>
          )}
        </Popover>
      </Stack>
    </Paper>
  )
}
