# Regla de agenda validada

En la migración se mantiene el horario de 08:00 a 22:00 con intervalos de dos horas. El intervalo **16:00–18:00** debe permanecer bloqueado todos los días de la semana, no solo lunes a viernes. El endpoint `/api/appointments/availability` y el apartado `/api/appointments/hold` reutilizan `validSlot`, que invoca `slotAvailable`.

Comprobación funcional esperada: para sábado y lunes, `16:00–18:00` debe devolver `available: false`; los demás intervalos siguen sujetos a fecha, vigencia y disponibilidad real.
