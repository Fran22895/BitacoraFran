import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import interactionPlugin from '@fullcalendar/interaction'
import timeGridPlugin from '@fullcalendar/timegrid'
import { Paper, Stack, Typography } from '@mui/material'
import type { Trip } from '../../domain/types'

interface TripCalendarProps {
  trip: Trip
}

export function TripCalendar({ trip }: TripCalendarProps) {
  const events = [
    ...trip.itineraryDays.map((day) => ({
      id: day.id,
      title: day.title,
      start: day.date,
      allDay: true,
      color: '#0f766e',
    })),
    ...trip.flights.map((flight) => ({
      id: flight.id,
      title: `${flight.company} ${flight.flightNumber}`,
      start: flight.departureAt,
      end: flight.arrivalAt,
      color: '#2563eb',
    })),
    ...trip.activities.map((activity) => ({
      id: activity.id,
      title: activity.name,
      start: activity.startsAt,
      color: '#b45309',
    })),
    ...trip.accommodations.map((accommodation) => ({
      id: accommodation.id,
      title: accommodation.name,
      start: accommodation.checkInAt,
      end: accommodation.checkOutAt,
      color: '#7c3aed',
    })),
  ].filter((event) => event.start)

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
        />
      </Stack>
    </Paper>
  )
}
