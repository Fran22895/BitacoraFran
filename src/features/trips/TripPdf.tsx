/* eslint-disable react-refresh/only-export-components */
import { Document, Page, StyleSheet, Text, View, pdf } from '@react-pdf/renderer'
import { calculateTripTotals, formatMoney } from '../../domain/calculations'
import { tripStatusLabels } from '../../domain/constants'
import type { Trip } from '../../domain/types'

interface TripPdfDocumentProps {
  trip: Trip
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 10,
    color: '#1f2937',
  },
  title: {
    fontSize: 22,
    marginBottom: 6,
    fontWeight: 700,
  },
  subtitle: {
    color: '#4b5563',
    marginBottom: 18,
  },
  section: {
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  sectionTitle: {
    fontSize: 13,
    marginBottom: 6,
    fontWeight: 700,
  },
  row: {
    marginBottom: 4,
  },
})

export function TripPdfDocument({ trip }: TripPdfDocumentProps) {
  const totals = calculateTripTotals(trip)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>{trip.title}</Text>
        <Text style={styles.subtitle}>
          {trip.destinations.join(' -> ')} | {trip.startDate} - {trip.endDate} | {tripStatusLabels[trip.status]}
        </Text>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resumen financiero</Text>
          <Text style={styles.row}>Presupuesto: {formatMoney(trip.budgetAmount, trip.baseCurrency)}</Text>
          <Text style={styles.row}>Total previsto: {formatMoney(totals.total, totals.currency)}</Text>
          <Text style={styles.row}>Restante: {formatMoney(totals.remainingBudget, totals.currency)}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Vuelos</Text>
          {trip.flights.map((flight) => (
            <Text key={flight.id} style={styles.row}>
              {flight.legType}: {flight.company} {flight.flightNumber} | {flight.originAirport} - {flight.destinationAirport}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Alojamientos</Text>
          {trip.accommodations.map((accommodation) => (
            <Text key={accommodation.id} style={styles.row}>
              {accommodation.name} | {accommodation.checkInAt} - {accommodation.checkOutAt}
            </Text>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Itinerario</Text>
          {trip.itineraryItems
            .slice()
            .sort((a, b) => a.order - b.order)
            .map((item) => (
              <Text key={item.id} style={styles.row}>
                {item.title}: {item.description}
              </Text>
            ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Telefonos de interes</Text>
          {trip.contacts.map((contact) => (
            <Text key={contact.id} style={styles.row}>
              {contact.name}: {contact.phone}
            </Text>
          ))}
        </View>
      </Page>
    </Document>
  )
}

export async function downloadTripPdf(trip: Trip) {
  const blob = await pdf(<TripPdfDocument trip={trip} />).toBlob()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = `${trip.title.replaceAll(' ', '-').toLowerCase()}-bitacora.pdf`
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}
