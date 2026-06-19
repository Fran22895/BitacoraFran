import 'leaflet/dist/leaflet.css'
import { Box, Button, Paper, Stack, Typography } from '@mui/material'
import { CircleMarker, MapContainer, Popup, TileLayer } from 'react-leaflet'
import { resolveCoordinates } from '../../domain/maps'
import type { Trip } from '../../domain/types'

interface TripMapProps {
  trip: Trip
}

export function TripMap({ trip }: TripMapProps) {
  const points = [
    ...trip.itineraryItems.flatMap((item) => {
      const coordinates = resolveCoordinates(item.latitude, item.longitude, item.googleMapsUrl)
      return coordinates ? [{ id: item.id, title: item.title, description: item.description, googleMapsUrl: item.googleMapsUrl, coordinates, color: item.visited ? '#15803d' : '#0f766e' }] : []
    }),
    ...trip.restaurants.flatMap((restaurant) => {
      const coordinates = resolveCoordinates(undefined, undefined, restaurant.googleMapsUrl)
      return coordinates ? [{ id: restaurant.id, title: restaurant.name, description: restaurant.location, googleMapsUrl: restaurant.googleMapsUrl, coordinates, color: '#be123c' }] : []
    }),
  ]
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
                key={point.id}
                center={[point.coordinates.latitude, point.coordinates.longitude]}
                radius={9}
                pathOptions={{ color: point.color, fillOpacity: 0.75 }}
              >
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
