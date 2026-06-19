import 'leaflet/dist/leaflet.css'
import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { resolveCoordinates } from '../../domain/maps'
import type { Trip } from '../../domain/types'

interface TripMapProps {
  trip: Trip
}

export function TripMap({ trip }: TripMapProps) {
  const points = trip.itineraryItems.flatMap((item) => {
    const coordinates = resolveCoordinates(item.latitude, item.longitude, item.googleMapsUrl)
    return coordinates ? [{ item, coordinates }] : []
  })
  const center: [number, number] =
    points.length > 0 ? [points[0].coordinates.latitude, points[0].coordinates.longitude] : [40.4168, -3.7038]

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
                key={point.item.id}
                center={[point.coordinates.latitude, point.coordinates.longitude]}
                radius={9}
                pathOptions={{ color: point.item.visited ? '#15803d' : '#0f766e', fillOpacity: 0.75 }}
              >
                <Popup>
                  <strong>{point.item.title}</strong>
                  <br />
                  {point.item.description}
                  {point.item.googleMapsUrl && (
                    <>
                      <br />
                      <Button size="small" component="a" href={point.item.googleMapsUrl} target="_blank" rel="noopener noreferrer">
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
