# Produccion

## Estado actual

La aplicacion esta preparada para produccion como SPA estatica:

- Vercel sirve el frontend desde `dist`.
- `vercel.json` reescribe cualquier ruta a `index.html`, necesario para `/trips/:tripId`.
- Supabase gestiona Auth, base de datos, RLS y Storage.
- El modo demo local sigue disponible cuando Supabase no esta configurado o eliges "Usar demo local".
- Al iniciar sesion con Google y Supabase configurado, la app usa Supabase como fuente de verdad.

## Checklist predeploy

```bash
npm run test
npm run lint
npm run build
```

## Vercel

Configuracion recomendada:

- Framework Preset: Vite.
- Install Command: `npm ci`.
- Build Command: `npm run build`.
- Output Directory: `dist`.
- Production Branch: `main`.

Variables de entorno:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

Define las variables en Preview y Production.

## Supabase

1. Crea un proyecto cloud.
2. Ejecuta `supabase/schema.sql`.
3. Activa Google Auth.
4. Configura Site URL con el dominio final de Vercel.
5. Anade Redirect URLs para `http://localhost:5173`, Vercel Preview/Production y dominio personalizado.

## Google OAuth

En Google Cloud Console:

- Authorized JavaScript origins: localhost, dominio de Vercel y dominio personalizado.
- Authorized redirect URIs: callback URL exacta que muestra Supabase en el provider de Google.

## Storage privado

La app sube documentos al bucket `trip-documents` con esta ruta:

```text
{trip_id}/{category}/{timestamp}-{file_name}
```

En la base de datos se guarda una URL interna:

```text
storage://trip-documents/{trip_id}/{category}/{file_name}
```

Al abrir un documento, la app pide una URL firmada temporal a Supabase.

## Smoke test en Preview

- Entrar con Google.
- Crear viaje.
- Crear vuelo, alojamiento, itinerario, actividad y gasto.
- Subir un documento al Storage privado y abrirlo.
- Invitar un miembro con rol lector/editor.
- Validar que el lector no puede editar.
- Exportar PDF.
- Abrir directamente `/trips/:tripId`.

## Limitaciones conocidas

- Para anadir un miembro, el usuario debe existir ya en `profiles`; normalmente eso ocurre cuando ha iniciado sesion al menos una vez.
- Los cambios remotos son optimistas: la UI se actualiza al instante y muestra error si Supabase rechaza la operacion.
- El PDF se carga bajo demanda y puede generar un chunk grande, pero no afecta a la primera carga del dashboard.
