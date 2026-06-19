# Configuracion Supabase

## 1. Crear proyecto

1. Entra en Supabase.
2. Crea un proyecto nuevo.
3. Guarda la URL del proyecto y la anon key.

## 2. Variables de entorno

Copia `.env.example` a `.env.local`:

```bash
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key
```

Reinicia `npm run dev` despues de cambiar variables.

## 3. Activar Google Auth

1. Ve a Authentication > Providers.
2. Activa Google.
3. Configura Client ID y Client Secret desde Google Cloud Console.
4. En Google Cloud, anade la callback URL que muestra Supabase.
5. En Authentication > URL Configuration, anade `http://localhost:5173` para desarrollo.
6. Cuando despliegues, anade tambien el dominio de Vercel y el dominio personalizado si existe.

Para el OAuth basico de Google solo se usan scopes de identidad (`openid`, `email`, `profile`). No se necesitan APIs de pago para iniciar sesion con Google. Si en el futuro se piden scopes sensibles o restringidos, Google puede exigir verificacion adicional.

## 4. Ejecutar SQL

Abre SQL Editor y ejecuta `supabase/schema.sql` en un proyecto limpio.

El script crea:

- Tablas.
- Tipos enum.
- Funciones de permisos.
- RPCs `invite_trip_member` y `claim_trip_invitations` para compartir viajes por email.
- Politicas RLS.
- Bucket privado `trip-documents`.

## 5. Storage

Sube documentos dentro de carpetas por viaje:

```text
trip-documents/{trip_id}/reservas/hotel.pdf
```

La politica revisa permisos del viaje antes de permitir leer o escribir.

Desde la app, el panel "Subir archivo privado" crea documentos en Storage y guarda referencias `storage://...` que se abren mediante URL firmada.

## 6. Produccion en Vercel

Consulta `docs/production.md`. Resumen:

- Build Command: `npm run build`.
- Output Directory: `dist`.
- Variables: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- `vercel.json` ya contiene el rewrite SPA para rutas directas.

## 7. Nota sobre el plan gratuito

Supabase cambia cuotas y precios con el tiempo. Revisa siempre la pagina oficial de precios antes de subir muchas imagenes o documentos: https://supabase.com/pricing
