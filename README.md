# BitacoraFran

Aplicacion React + Vite + TypeScript para gestionar viajes como diario de bitacora: reservas, vuelos, alojamientos, coche, itinerario, actividades, telefonos, documentos, permisos y presupuesto.

## Stack

- React, Vite y TypeScript.
- Material UI con modo claro/oscuro.
- React Router para rutas.
- React Hook Form + Zod para formularios y validacion.
- Supabase preparado para Auth con Google, base de datos, RLS y Storage.
- TanStack Query instalado para la capa de datos remota.
- FullCalendar, React Leaflet, dnd-kit y React PDF.
- Vitest + Testing Library.

## Arranque

```bash
npm install
npm run dev
```

La app arranca en modo demo local si Supabase no esta configurado. Los datos se guardan en `localStorage`.
Cuando entras con Google y Supabase esta configurado, la fuente de verdad pasa a ser Supabase.

## Supabase

1. Copia `.env.example` a `.env.local`.
2. Crea un proyecto en Supabase.
3. Activa Google Auth.
4. Ejecuta `supabase/schema.sql` en el SQL Editor.
5. Rellena:

```bash
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

Guia completa en `docs/supabase-setup.md`.

## Scripts

```bash
npm run dev
npm run build
npm run lint
npm run test
```

## Documentacion

- `docs/requirements.md`: requisitos funcionales y no funcionales.
- `docs/architecture.md`: estructura, decisiones y flujo de datos.
- `docs/database.md`: modelo Supabase y RLS.
- `docs/supabase-setup.md`: configuracion paso a paso.
- `docs/production.md`: despliegue en Vercel, variables, Auth y smoke test.
- `docs/testing.md`: estrategia de pruebas.
- `docs/roadmap.md`: siguientes fases.
- `docs/adr/`: decisiones arquitectonicas registradas.
