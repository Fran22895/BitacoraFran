# ADR 0005: Invitaciones Por Email Para Compartir Viajes

## Estado

Aceptado.

## Contexto

La app debe ser multiusuario: cada usuario ve sus propios viajes y los viajes donde tiene un rol. Pedir el UUID interno de Supabase para compartir un viaje no es usable y exponer busquedas publicas de perfiles por email debilitaria la privacidad.

## Decision

Usar `trip_invitations` como bandeja de invitaciones pendientes por email y mantener `trip_members` como fuente de permisos efectivos.

El propietario o admin invita por email. Si el perfil ya existe, la RPC `invite_trip_member` crea o actualiza el miembro. Si no existe, deja una invitacion pendiente. Al iniciar sesion, `claim_trip_invitations` convierte las invitaciones pendientes del email autenticado en miembros reales antes de cargar el dashboard.

## Consecuencias

- El usuario invita con un dato humano: email.
- No hace falta exponer listados publicos de perfiles.
- RLS sigue protegiendo viajes, modulos internos, documentos y Storage.
- Las invitaciones pendientes pueden existir antes de que la persona se registre.
