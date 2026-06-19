# ADR 0002: Supabase Como Backend

## Estado

Aceptada.

## Contexto

La app requiere login con Google, datos colaborativos, permisos por viaje y almacenamiento de documentos.

## Decision

Usar Supabase para Auth, PostgreSQL, RLS y Storage.

## Consecuencias

- Se evita construir backend propio en v1.
- RLS permite proteger datos cerca de la base de datos.
- La creacion del proyecto cloud depende de una cuenta de Supabase del usuario.
