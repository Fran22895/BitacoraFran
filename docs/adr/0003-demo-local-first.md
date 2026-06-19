# ADR 0003: Modo Demo Local Primero

## Estado

Aceptada.

## Contexto

El proyecto Supabase cloud aun no existe, pero la app debe poder probarse desde el primer arranque.

## Decision

Implementar un store local persistido en `localStorage` y preparar la integracion Supabase en paralelo.

## Consecuencias

- La app es usable sin configurar credenciales.
- El modelo de dominio queda listo para migrar a queries remotas.
- Habra que reemplazar el store local por Supabase en una fase posterior.
