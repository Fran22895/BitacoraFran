# Base De Datos

## Resumen

Supabase usa PostgreSQL con RLS activado. El archivo `supabase/schema.sql` crea tablas, funciones de permiso, politicas y un bucket privado.

## Tablas

- `profiles`: perfil enlazado a `auth.users`.
- `trips`: datos principales del viaje.
- `trip_members`: usuarios y roles por viaje.
- `trip_invitations`: invitaciones pendientes por email para compartir viajes sin conocer UUIDs.
- `trip_destinations`: destinos estructurados opcionales.
- `flights`: vuelos, equipaje y extras.
- `vehicle_rentals`: coche de alquiler y fotos.
- `accommodations`: hoteles/apartamentos.
- `itinerary_days`: dias del itinerario.
- `itinerary_items`: puntos visitables.
- `activities`: actividades opcionales con sobrecoste.
- `restaurants`: restaurantes asociados a un dia del itinerario, precio medio y reserva.
- `contacts`: telefonos de interes.
- `insurances`: seguros separados.
- `documents`: documentos y vouchers.
- `journal_entries`: diario de bitacora.
- `expenses`: gastos generales.

## Ubicaciones

Las referencias geograficas pueden guardar coordenadas manuales y enlaces de Google Maps:

- `vehicle_rentals`: `pickup_latitude`, `pickup_longitude`, `dropoff_latitude`, `dropoff_longitude`, `pickup_google_maps_url`, `dropoff_google_maps_url`.
- `accommodations`: `address`, `google_maps_url`.
- `itinerary_items`: `latitude`, `longitude`, `google_maps_url`.
- `activities`: `location`, `google_maps_url`, `reservation_url`.
- `restaurants`: `location`, `google_maps_url`.
- `contacts`: `address`, `google_maps_url`.

La app usa las coordenadas manuales como fuente principal. Si faltan y el enlace largo de Google Maps contiene coordenadas, intenta extraerlas para pintar el punto en el mapa.

## Costes multimoneda

Los costes se guardan como JSON:

```json
{
  "amount": 100,
  "currency": "USD",
  "conversionRate": 0.92
}
```

`conversionRate` convierte el importe a la moneda base del viaje. La app no consulta APIs de divisas en v1.

## Permisos

Roles:

- `owner`: elimina viaje y gestiona todo.
- `admin`: edita contenido y gestiona editores/lectores.
- `editor`: crea, edita y elimina contenido.
- `reader`: solo consulta y exporta.

Las funciones `can_read_trip`, `can_edit_trip` y `can_manage_trip` centralizan las politicas RLS.

## Duplicado De Viajes Compartidos

La funcion `duplicate_trip(source_trip_id, duplicate_title)` permite que cualquier usuario con lectura sobre un viaje cree una copia propia. La copia asigna al usuario autenticado como `owner`, no arrastra miembros ni invitaciones, y remapea los IDs de dias para conservar correctamente puntos de itinerario, actividades y restaurantes.

## Invitaciones Por Email

Flujo:

- Propietario/admin llama a `invite_trip_member(trip_id, email, role)`.
- Si el email ya existe en `profiles`, Supabase crea o actualiza `trip_members`.
- Si el email todavia no existe, se crea una fila `pending` en `trip_invitations`.
- Al iniciar sesion con Google, `claim_trip_invitations()` busca invitaciones pendientes del email autenticado y las convierte en miembros reales.

Restricciones:

- No se puede invitar como `owner`.
- Un `admin` solo puede asignar `editor` o `reader`.
- Solo `owner` puede asignar `admin`.
- RLS permite leer invitaciones a miembros del viaje y al email invitado.

## Storage

Bucket: `trip-documents`.

Ruta recomendada:

```text
{trip_id}/{category}/{file_name}
```

Las politicas de Storage leen el primer segmento de la ruta como `trip_id` para aplicar permisos.

En la tabla `documents.file_url` se puede guardar una URL externa normal o una referencia privada:

```text
storage://trip-documents/{trip_id}/{category}/{file_name}
```

Cuando se abre un documento privado, el cliente pide una URL firmada temporal.
