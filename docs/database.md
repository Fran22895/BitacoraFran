# Base De Datos

## Resumen

Supabase usa PostgreSQL con RLS activado. El archivo `supabase/schema.sql` crea tablas, funciones de permiso, politicas y un bucket privado.

## Tablas

- `profiles`: perfil enlazado a `auth.users`.
- `trips`: datos principales del viaje.
- `trip_members`: usuarios y roles por viaje.
- `trip_destinations`: destinos estructurados opcionales.
- `flights`: vuelos, equipaje y extras.
- `vehicle_rentals`: coche de alquiler y fotos.
- `accommodations`: hoteles/apartamentos.
- `itinerary_days`: dias del itinerario.
- `itinerary_items`: puntos visitables.
- `activities`: actividades opcionales con sobrecoste.
- `contacts`: telefonos de interes.
- `insurances`: seguros separados.
- `documents`: documentos y vouchers.
- `journal_entries`: diario de bitacora.
- `expenses`: gastos generales.

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
