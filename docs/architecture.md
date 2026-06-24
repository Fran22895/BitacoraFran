# Arquitectura

## Frontend

La app esta creada con Vite, React y TypeScript. La entrada es `src/main.tsx`, que monta `AppProviders` y despues `App`.

Capas principales:

- `src/domain`: tipos, constantes, validaciones, calculos, permisos y datos semilla.
- `src/store`: estado de aplicacion, modo demo local y puente hacia Supabase.
- `src/lib`: integraciones externas, repositorio Supabase y helpers de Storage.
- `src/components`: shell, formularios y componentes reutilizables.
- `src/features`: paginas y piezas de cada flujo.

## Flujo de datos

La app tiene dos modos:

- Demo local: usa `localStorage` y datos semilla.
- Remoto: al iniciar sesion con Google y Supabase configurado, carga viajes desde PostgreSQL y escribe mediante `src/lib/supabaseTrips.ts`.

El store expone operaciones CRUD genericas sobre viajes y colecciones internas. En remoto hace actualizaciones optimistas y muestra errores si Supabase rechaza la operacion.

Los datos semilla solo se cargan al seleccionar "Usar Demo local". En modo remoto o sin sesion, la app arranca con lista vacia hasta recibir datos reales de Supabase.

## Multiusuario

El acceso efectivo de edicion vive en `trip_members`. Para compartir sin conocer UUIDs internos, la app usa `trip_invitations`: propietario o admin invitan por email y rol. Si el email ya corresponde a un perfil existente, Supabase crea o actualiza el miembro; si no existe, deja una invitacion pendiente. En cada login con Google, `claim_trip_invitations()` convierte invitaciones pendientes del email autenticado en miembros reales antes de cargar el dashboard.

Los viajes con `is_public = true` aparecen a usuarios autenticados aunque no sean miembros, pero RLS solo expone la cabecera y el itinerario publico. El duplicado desde acceso publico crea una copia privada sin vuelos, alojamientos, coches, reservas, seguros, documentos, contactos, diario ni gastos.

La UI nunca decide la seguridad por si sola: oculta botones segun rol para mejorar la experiencia, pero RLS y las RPC de Supabase aplican las reglas reales.

## Rutas

- `/login`: login con Google cuando Supabase esta configurado o demo local.
- `/`: dashboard de viajes.
- `/trips/:tripId`: detalle completo del viaje.

## UI

Material UI gestiona tema, layout y componentes base. El tema usa una paleta sobria con acentos verdes, ambar y estados semanticos. Las secciones CRUD usan `EntitySection` para mantener formularios y acciones coherentes.

## Carga diferida

Mapa, calendario y PDF se cargan bajo demanda desde el detalle del viaje para reducir el coste inicial del dashboard. La apertura de documentos privados tambien se resuelve bajo demanda con URLs firmadas de Supabase Storage.

## Decisiones registradas

Las decisiones arquitectonicas importantes se guardan en `docs/adr`. ADR significa "Architecture Decision Record": una nota breve que explica una decision, su contexto y sus consecuencias.
