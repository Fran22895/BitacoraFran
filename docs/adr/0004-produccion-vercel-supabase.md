# ADR 0004: Produccion En Vercel Con Supabase Real

## Estado

Aceptada.

## Contexto

La app debe poder desplegarse como SPA y conservar autenticacion, permisos, datos colaborativos y documentos privados.

## Decision

Usar Vercel para servir el frontend estatico y Supabase cloud como fuente de verdad cuando el usuario inicia sesion con Google. Mantener el modo demo local para desarrollo y pruebas sin backend.

## Consecuencias

- El despliegue frontend es simple y compatible con Vite.
- Las rutas internas requieren rewrite a `index.html`, incluido en `vercel.json`.
- Los datos importantes solo deben guardarse en modo remoto.
- Storage privado se abre mediante URLs firmadas temporales.
