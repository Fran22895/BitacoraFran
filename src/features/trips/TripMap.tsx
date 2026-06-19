import 'leaflet/dist/leaflet.css'
import { Box, Paper, Stack, Typography } from '@mui/material'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import type { Trip } from '../../domain/types'

interface TripMapProps {
  trip: Trip
}

export function TripMap({ trip }: TripMapProps) {
  const points = trip.itineraryItems.filter(
    (item): item is typeof item & { latitude: number; longitude: number } =>
      typeof item.latitude === 'number' && typeof item.longitude === 'number',
  )
  const center: [number, number] = points.length > 0 ? [points[0].latitude, points[0].longitude] : [40.4168, -3.7038]

  return (
    <Paper variant="outlined" sx={{ p: { xs: 1, md: 2 } }}>
      <Stack spacing={2}>
        <Typography variant="h6">Mapa del itinerario</Typography>
        <Box sx={{ height: { xs: 360, md: 520 }, borderRadius: 1, overflow: 'hidden' }}>
          <MapContainer center={center} zoom={points.length > 0 ? 12 : 5} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {points.map((point) => (
              <CircleMarker
                key={point.id}
                center={[point.latitude, point.longitude]}
                radius={9}
                pathOptions={{ color: point.visited ? '#15803d' : '#0f766e', fillOpacity: 0.75 }}
              >
                <Popup>
                  <strong>{point.title}</strong>
                  <br />
                  {point.description}
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </Box>
      </Stack>
    </Paper>
  )
}
