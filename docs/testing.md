# Testing

## Herramientas

- Vitest para tests unitarios.
- Testing Library para componentes.
- jsdom como entorno DOM.

## Casos cubiertos

- Calculo de costes multimoneda.
- Total del viaje y presupuesto restante.
- Deteccion de datos incompletos.
- Permisos por rol.
- Validaciones Zod de viaje, vuelo, alojamiento, actividad y gasto.
- Formato de rutas privadas de Supabase Storage.

## Comandos

```bash
npm run test
npm run test:watch
```

## Siguientes pruebas recomendadas

- Tests de componentes para `TripFormDialog`.
- Tests de filtros del dashboard.
- Tests de acciones CRUD con store local.
- Tests de permisos visuales para lector/editor/admin.
