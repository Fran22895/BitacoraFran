# Requisitos

## Objetivo

BitacoraFran permite planificar y registrar viajes con enfoque practico: consultar rapido reservas, costes, itinerario, contactos y notas durante el viaje, y conservar un diario despues.

## Requisitos funcionales

- Crear, editar y eliminar viajes.
- Dashboard con viajes ordenados por fecha mas reciente.
- Filtros por estado, etiqueta, busqueda y viajes pasados/futuros.
- Estados de viaje: planificado, en curso, finalizado y cancelado.
- Viajes con multiples destinos, acompanantes, portada, presupuesto, moneda base, etiquetas y notas.
- CRUD de vuelos con tramo, internacional, compania, aeropuertos, horarios, localizador, costes, equipaje y prioridad.
- CRUD de vehiculo de alquiler con seguro, franquicia, deposito, recogida/devolucion, coordenadas, enlaces de Google Maps y fotos de estado.
- CRUD de alojamientos con tipo, regimen, check-in/out, servicios, actividades, tasas, deposito, cancelacion y enlace de Google Maps.
- Itinerario por dias con puntos ordenables, imagen por URL, ubicacion por coordenadas o Google Maps, costes, recomendaciones y marcado visitado.
- Actividades extra con proveedor, reserva, ubicacion por texto o Google Maps, coste, pago y asociacion opcional a dia.
- Telefonos de interes con acciones de llamar, copiar y enlace de Google Maps cuando aplique.
- Seguros separados de vuelos.
- Documentos por categoria.
- Diario por fecha con texto, fotos por URL y estado de animo.
- Costes en varias monedas con tasa manual e importes decimales.
- Calculo automatico de totales y restante de presupuesto.
- Exportacion PDF del viaje.
- Permisos por viaje: propietario, admin, editor y lector.
- Compartir viajes por email con invitaciones pendientes.
- Aceptar automaticamente invitaciones pendientes cuando el usuario entra con Google usando ese email.
- Modo claro/oscuro y experiencia responsive movil.

## Requisitos no funcionales

- Aplicacion en espanol.
- Arquitectura preparada para Supabase.
- Validaciones con Zod.
- Componentes reutilizables y formularios consistentes.
- Los datos semilla solo aparecen al elegir "Usar Demo local".
- Tests para calculos, permisos y validaciones.
- Sin dependencia de API externa de divisas en la primera version.
- Sin modo offline obligatorio en v1.
