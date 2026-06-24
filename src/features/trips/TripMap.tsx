import 'leaflet/dist/leaflet.css'
import { Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material'
import { useEffect, useMemo, useState } from 'react'
import { CircleMarker, MapContainer, Polyline, Popup, TileLayer, Tooltip, useMap } from 'react-leaflet'
import { resolveCoordinates } from '../../domain/maps'
import type { Trip } from '../../domain/types'

interface TripMapProps {
  trip: Trip
}

const allDays = 'all'
const defaultCenter: [number, number] = [40.4168, -3.7038]

interface MapPoint {
  id: string
  title: string
  description: string
  googleMapsUrl?: string
  coordinates: { latitude: number; longitude: number }
  color: string
  dayId?: string
  sequence?: number
  kind: 'itinerary' | 'restaurant'
}

function FitMapToPoints({ points }: { points: MapPoint[] }) {
  const map = useMap()
  const boundsKey = points.map((point) => `${point.id}:${point.coordinates.latitude},${point.coordinates.longitude}`).join('|')

  useEffect(() => {
    if (points.length === 0) {
      map.setView(defaultCenter, 5)
      return
    }

    if (points.length === 1) {
      const [point] = points
      map.setView([point.coordinates.latitude, point.coordinates.longitude], 13)
      return
    }

    map.fitBounds(points.map((point) => [point.coordinates.latitude, point.coordinates.longitude]), {
      padding: [32, 32],
    })
  }, [boundsKey, map, points])

  return null
}

export function TripMap({ trip }: TripMapProps) {
  const [dayFilter, setDayFilter] = useState(allDays)
  const orderedDays = useMemo(
    () => [...trip.itineraryDays].sort((a, b) => `${a.date}-${a.title}`.localeCompare(`${b.date}-${b.title}`)),
    [trip.itineraryDays],
  )
  const effectiveDayFilter = dayFilter === allDays || orderedDays.some((day) => day.id === dayFilter) ? dayFilter : allDays

  const { points, itineraryLines } = useMemo(() => {
    const selectedDayIds = effectiveDayFilter === allDays ? new Set(orderedDays.map((day) => day.id)) : new Set([effectiveDayFilter])
    const itineraryGroups = orderedDays
      .filter((day) => selectedDayIds.has(day.id))
      .map((day) => {
        const dayPoints = trip.itineraryItems
          .filter((item) => item.dayId === day.id)
          .sort((a, b) => a.order - b.order)
          .flatMap((item, index): MapPoint[] => {
            const coordinates = resolveCoordinates(item.latitude, item.longitude, item.googleMapsUrl)
            return coordinates
              ? [
                  {
                    id: item.id,
                    title: item.title,
                    description: item.description,
                    googleMapsUrl: item.googleMapsUrl,
                    coordinates,
                    color: item.visited ? '#15803d' : '#0f766e',
                    dayId: item.dayId,
                    sequence: index + 1,
                    kind: 'itinerary',
                  },
                ]
              : []
          })

        return { dayId: day.id, points: dayPoints }
      })

    const restaurantPoints = trip.restaurants
      .filter((restaurant) => selectedDayIds.has(restaurant.dayId))
      .flatMap((restaurant): MapPoint[] => {
        const coordinates = resolveCoordinates(undefined, undefined, restaurant.googleMapsUrl)
        return coordinates
          ? [
              {
                id: restaurant.id,
                title: restaurant.name,
                description: restaurant.location,
                googleMapsUrl: restaurant.googleMapsUrl,
                coordinates,
                color: '#be123c',
                dayId: restaurant.dayId,
                kind: 'restaurant',
              },
            ]
          : []
      })

    return {
      points: [...itineraryGroups.flatMap((group) => group.points), ...restaurantPoints],
      itineraryLines: itineraryGroups
        .filter((group) => group.points.length > 1)
        .map((group) => ({
          dayId: group.dayId,
          positions: group.points.map((point) => [point.coordinates.latitude, point.coordinates.longitude] as [number, number]),
        })),
    }
  }, [effectiveDayFilter, orderedDays, trip.itineraryItems, trip.restaurants])

  const center: [number, number] =
    points.length > 0 ? [points[0].coordinates.latitude, points[0].coordinates.longitude] : defaultCenter

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1, md: 2 } }}>
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' } }}>
          <Typography variant="h6">Mapa del itinerario</Typography>
          <TextField
            select
            size="small"
            label="Dia"
            value={effectiveDayFilter}
            onChange={(event) => setDayFilter(event.target.value)}
            sx={{ minWidth: { xs: '100%', sm: 260 } }}
          >
            <MenuItem value={allDays}>Todos los dias</MenuItem>
            {orderedDays.map((day) => (
              <MenuItem key={day.id} value={day.id}>
                {day.date} | {day.title}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
        <Box sx={{ height: { xs: 360, md: 520 }, borderRadius: 1, overflow: 'hidden' }}>
          <MapContainer center={center} zoom={points.length > 0 ? 12 : 5} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <FitMapToPoints points={points} />
            {itineraryLines.map((line) => (
              <Polyline key={line.dayId} positions={line.positions} pathOptions={{ color: '#0f766e', opacity: 0.72, weight: 4 }} />
            ))}
            {points.map((point) => (
              <CircleMarker
                key={point.id}
                center={[point.coordinates.latitude, point.coordinates.longitude]}
                radius={point.kind === 'itinerary' ? 12 : 9}
                pathOptions={{ color: point.color, fillOpacity: 0.75 }}
              >
                {point.sequence && (
                  <Tooltip permanent direction="center" opacity={1} className="trip-map-marker-number">
                    {point.sequence}
                  </Tooltip>
                )}
                <Popup>
                  <strong>{point.title}</strong>
                  <br />
                  {point.description}
                  {point.googleMapsUrl && (
                    <>
                      <br />
                      <Button size="small" component="a" href={point.googleMapsUrl} target="_blank" rel="noopener noreferrer">
                        Google Maps
                      </Button>
                    </>
                  )}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </Box>
      </Stack>
    </Paper>
  )
}
