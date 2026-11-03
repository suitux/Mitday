# Quadra — Especificación y plan de implementación

## Cómo usar este plan con Claude Code

Una fase por sesión:

1. `/clear` para empezar con contexto limpio.
2. Pega el **prompt base** cambiando el número de fase.
3. Revisa el plan que proponga (plan mode: `Shift+Tab`) y apruébalo o corrígelo.
4. Cuando termine: revisa el diff, prueba en local y haz commit.

**Prompt base:**

> Lee `CLAUDE.md` y la **Fase N** de `PLAN.md`. Explora el código existente y, antes de tocar nada, propón un plan de implementación para esa fase. Cuando lo apruebe, impleméntalo, deja `pnpm check` en verde y marca las tareas completadas en `PLAN.md`. Si algo no está especificado, pregúntame.

Cada fase incluye además notas específicas que conviene añadir al prompt.

---

## 1. Especificación funcional

### Actores

- **Creador**: usuario registrado. Crea planes, los gestiona y los cierra. También puede marcar su propia disponibilidad.
- **Invitado**: abre el enlace del plan, pone su nombre (y opcionalmente su email) y marca su disponibilidad. No tiene cuenta.
- **Usuario registrado como participante**: si abre un enlace estando logueado, se salta el paso del nombre y el plan aparece en su dashboard.

### Registro e inicio de sesión

- Google OAuth o magic link por email. Sin contraseñas.
- Tras el login → `/dashboard`.
- Solo hace falta cuenta para crear planes. Participar nunca exige cuenta.

### Crear un plan (asistente en 4 pasos)

1. **Datos**: título (1–80 caracteres) y descripción opcional (máx. 500).
2. **Cuándo**:
   - `dateMode`:
     - `range`: fecha inicio + fecha fin (máx. 366 días).
     - `dates`: días sueltos elegidos en un calendario (1–100).
     - `open`: cualquier día desde hoy hasta 1 año vista.
   - `granularity`:
     - `day`: días completos.
     - `slot`: franjas con nombre definidas por el creador (1–6, p. ej. «Comida», «Cena»). Son etiquetas, sin hora.
     - `hour`: rejilla horaria con intervalo de 30 o 60 min, entre una hora de inicio y una de fin del día (p. ej. 09:00–23:00), en la zona horaria del creador (detectada en el navegador y editable).
3. **Respuestas**: lista de 2–5 opciones con etiqueta, color (de una paleta fija) y peso (0–1). Por defecto: «Sí» (1, verde) y «No» (0, rojo). Las etiquetas por defecto se traducen al idioma del creador.
4. **Privacidad y avisos**:
   - `visibility`:
     - `full` (por defecto): los participantes ven el heatmap y, al tocar una celda, quién respondió qué.
     - `aggregate`: solo el heatmap, sin nombres.
     - `hidden`: cada participante solo ve lo suyo.
   - `notifyOnResponse` (por defecto activado): email al creador cuando alguien responde.

Al crear el plan → pantalla con el enlace para compartir (copiar + Web Share API en móvil).

### Participar (`/p/[slug]`)

1. Si el visitante ya está identificado en este plan (cookie de invitado válida o usuario logueado con participante vinculado) → directo al calendario.
2. Si no → formulario con nombre (1–40 caracteres) y email opcional («para avisarte cuando se decida la fecha»). Si está logueado, el nombre viene prerrellenado.
3. **Calendario**:
   - Arriba, una **paleta** con las opciones de respuesta. La opción activa funciona como «pincel».
   - Tocar una celda la pinta con la opción activa. Tocar una celda ya pintada con la misma opción la borra.
   - En la rejilla horaria se puede **arrastrar** para pintar varias celdas (pointer events).
   - Los cambios se guardan con un botón «Guardar» (estado sucio visible). Al guardar se reemplaza el conjunto completo de respuestas del participante.
4. **Lo que han marcado otros** (según `visibility`):
   - Tinte de fondo en cada celda con opacidad proporcional a la intensidad. Sutil: no compite con la selección propia, que se muestra con el color sólido de la opción.
   - Un punto discreto en la(s) mejor(es) celda(s).
   - Al tocar una celda (en modo `full`) se abre un bottom sheet con los nombres agrupados por opción, y un contador «X de N».
5. Tras el **primer guardado**, se muestra el **enlace personal de edición** (`/p/[slug]/claim?k=...`) con botón de copiar y un aviso: «Guárdalo para editar desde otro dispositivo». Si dejó email, se le envía también.

### Vistas por granularidad

- `day`: vista de mes (lunes primero), navegable entre meses. Fuera del rango o de los días elegidos, los días aparecen deshabilitados.
- `slot`: vista de mes. Al tocar un día se despliegan sus franjas; el día muestra un mini-indicador por franja.
- `hour`:
  - Móvil: lista de días; al tocar uno se despliega la columna de horas.
  - Escritorio: rejilla semanal (días en columnas, horas en filas) con arrastre.
  - Siempre en la hora local del visitante, con la zona indicada.

### Gestión del creador (`/plans/[id]/manage`)

- **Tabla completa** (participantes × celdas con respuesta), siempre visible para el creador sea cual sea `visibility`.
- **Editar**:
  - Siempre editables: título, descripción, `visibility`, `notifyOnResponse`, etiquetas y colores de las opciones.
  - Solo si no hay respuestas: `granularity`, `dateMode`, rango y horario, pesos, añadir o quitar opciones y franjas.
  - Añadir días en modo `dates`: siempre permitido. Quitar días: con confirmación (se borran las respuestas a esos días).
- **Borrar un participante** (con confirmación).
- **Regenerar enlace**: nuevo slug; el anterior deja de funcionar. Los enlaces personales también, porque contienen el slug.
- **Borrar plan** (con confirmación escribiendo el título).
- **Cerrar plan**: elegir la celda final (preseleccionada con la mejor).

### Cierre

- Estado `closed` + `finalCell`. Las respuestas quedan bloqueadas.
- Todos los participantes ven un banner con la fecha final y botones «Añadir a Google Calendar» y «Descargar .ics».
- El `.ics` depende de la granularidad:
  - `day`: evento de día completo.
  - `slot`: día completo con la franja en el título («Cena — Título»).
  - `hour`: evento con inicio en `finalCell` y duración igual al intervalo.
- Email a los participantes que dejaron email (y al creador), en su idioma, con enlace al plan y el .ics adjunto.
- El creador puede **reabrir** el plan (vuelve a `open` y se borra `finalCell`). No se envía email al reabrir.

### Emails

| Email | Destinatario | Cuándo |
|---|---|---|
| Magic link | usuario | login (Auth.js) |
| Nueva respuesta | creador | primer guardado de cada participante; en ediciones, solo si han pasado más de 60 min desde el último aviso por ese participante. Requiere `notifyOnResponse` |
| Enlace personal | invitado con email | primer guardado |
| Fecha decidida | participantes con email + creador | al cerrar |

Todos los emails se envían en el idioma del destinatario (`locale` guardado en `users` y `participants`).

### Dashboard

Dos listas: «Mis planes» (creados) y «Participo» (planes donde tengo participante vinculado a mi usuario). Cada plan muestra título, estado, nº de participantes y la mejor celda o la fecha final.

### i18n

- `es` (por defecto), `ca` y `en`, con segmento `[locale]` en todas las rutas.
- Detección del idioma por `Accept-Language` y selector de idioma en el footer.
- Formato de fechas según el locale. Semana empezando en lunes.

### Fuera de alcance en la v1

Tiempo real, comentarios, planes recurrentes, sincronización con calendarios externos, planes de pago, apps nativas.

---

## 2. Modelo de datos

Tablas de Auth.js (`users`, `accounts`, `sessions`, `verification_tokens`) según el adapter de Drizzle, más el campo `users.locale`.

**plans**
- `id` uuid PK
- `slug` text único (nanoid 12)
- `ownerId` → users
- `title`, `description`
- `granularity` enum(day, slot, hour)
- `dateMode` enum(range, dates, open)
- `rangeStart`, `rangeEnd`: date, nullable
- `hourInterval`: int nullable (30 | 60)
- `dayStartMinute`, `dayEndMinute`: int nullable
- `timezone` text (IANA)
- `visibility` enum(full, aggregate, hidden)
- `notifyOnResponse` bool
- `status` enum(open, closed)
- `finalCell` text nullable, `closedAt` nullable
- `createdAt`, `updatedAt`

**plan_dates**: `planId`, `date`; PK (planId, date). Solo se usa en modo `dates`.

**plan_slots**: `id` uuid, `planId`, `label`, `order`.

**answer_options**: `id` uuid, `planId`, `label`, `color`, `weight` (numeric 0–1), `order`.

**participants**
- `id` uuid
- `planId`
- `userId` nullable → users
- `name`
- `email` nullable
- `locale`
- `editTokenHash` nullable (null si está vinculado a usuario)
- `notifiedAt` nullable
- `createdAt`, `updatedAt`
- Índice único parcial (planId, userId) where userId is not null.

**responses**: `participantId` → participants (on delete cascade), `cell` text, `optionId` → answer_options; PK (participantId, cell). Índice en `cell` dentro del plan (vía join) o columna `planId` desnormalizada con índice (planId, cell).

Borrados en cascada: plan → dates, slots, options, participants → responses.

---

## 3. Identidad de invitados

- Al crear un participante invitado: `token = randomBytes(32).base64url`, se guarda `sha256(token)`.
- Cookie `quadra_p_<planId>` = `<participantId>.<token>` (httpOnly, secure, sameSite lax, 1 año, path `/`).
- Enlace personal: `/[locale]/p/[slug]/claim?k=<participantId>.<token>`. El route handler valida el token, pone la cookie y redirige a `/p/[slug]` sin query.
- Comparación de hashes en tiempo constante.
- Usuario logueado: se usa el participante con `userId`. Si además tiene una cookie de invitado válida para ese plan, se ofrece «vincular» (asignar `userId` a ese participante).

---

## 4. Fases

### Fase 0 — Scaffolding

- [x] `create-next-app` con TypeScript, App Router, Tailwind, ESLint y `src/`
- [x] pnpm, Prettier, TS estricto (`noUncheckedIndexedAccess`)
- [x] shadcn/ui inicializado (button, input, dialog, sheet, sonner)
- [x] Drizzle + Neon (`neon-serverless`), `drizzle.config.ts` y scripts `db:*`
- [x] next-intl con `[locale]`, `messages/{es,ca,en}.json` y el middleware de next-intl
- [x] Vitest y Playwright configurados con un test de ejemplo cada uno
- [x] Script `pnpm check`
- [x] `.env.example`, README mínimo
- [ ] Repo en GitHub + proyecto en Vercel conectado _(pendiente: el push a GitHub requiere tu permiso)_

**Hecho cuando**: `pnpm check` y `pnpm build` en verde, y la landing se ve en `/es`, `/ca` y `/en` en un preview de Vercel.

**Notas para el prompt**: «Usa las versiones estables actuales de cada paquete y consulta su documentación si dudas de la API. Integra next-intl y Auth.js en el mismo middleware desde el principio».

### Fase 1 — Autenticación

- [x] Auth.js v5 con Google + Resend (magic link), adapter Drizzle y estrategia JWT
- [x] Tablas de Auth.js en el schema + `users.locale` + primera migración
- [x] Página `/login` con Google y formulario de email, más la página «revisa tu correo»
- [x] Plantilla de magic link con React Email, traducida
- [x] Protección de `/dashboard` y `/plans/*`
- [x] Dashboard vacío con estado vacío y CTA «Crear plan»
- [x] Header con avatar/nombre y cerrar sesión
- [x] Solo en entorno de test: provider de login para Playwright, protegido por variable de entorno y **nunca** activo en producción

**Hecho cuando**: puedo entrar con Google y con magic link, cerrar sesión, y las rutas protegidas redirigen a `/login`.

### Fase 2 — Schema completo y creación de planes

- [x] Schema completo de la sección 2 + migración
- [x] `src/lib/cells.ts`: tipos, `buildCell`, `parseCell` y validación con zod, más tests
- [x] Server action `createPlan` con validación completa (límites de la sección 1)
- [x] Asistente de 4 pasos con navegación atrás/adelante, estado conservado y validación por paso
- [x] Pantalla «plan creado» con enlace, copiar y compartir
- [x] Dashboard lista «Mis planes»

**Hecho cuando**: puedo crear planes con cada combinación de `dateMode` × `granularity` y aparecen en el dashboard.

**Notas para el prompt**: «El selector de días sueltos y el de rango deben reutilizar el mismo componente de mes que usaremos después en la vista del participante».

### Fase 3 — Participar (solo modo `day`)

- [x] `src/lib/grid.ts`: celdas válidas de un plan en modo `day` para los tres `dateMode`, más tests
- [x] `src/lib/guest.ts`: tokens, hash, cookie y lectura del participante actual, más tests
- [x] `/p/[slug]`: formulario de nombre y email → crear participante
- [x] Route handler `claim`
- [x] Vista de mes con paleta-pincel, pintar/borrar y estado sucio
- [x] Server action `saveResponses`: valida que cada celda pertenece al plan y cada opción también, y reemplaza el conjunto en una transacción
- [x] Enlace personal tras el primer guardado
- [x] Usuario logueado: nombre prerrellenado, participante vinculado y el plan en «Participo» del dashboard
- [x] Plan cerrado o slug inexistente → pantallas adecuadas

**Hecho cuando**: un invitado responde, recarga y ve sus respuestas; abre su enlace personal en otro navegador y puede editarlas.

### Fase 4 — Agregación y visibilidad

- [x] `src/lib/aggregate.ts`: puntuación por celda, intensidad y mejor(es) celda(s), más tests. Desempate: más respuestas de peso máximo y, después, la fecha más temprana
- [x] Query de agregados según `visibility`: `full` (agregados + nombres), `aggregate` (solo agregados), `hidden` (nada de otros)
- [x] Heatmap sutil en celdas + punto de mejor celda
- [x] Bottom sheet con nombres por opción (solo `full`)
- [x] Revalidar datos al volver a enfocar la pestaña
- [x] Test que verifique que en `hidden` no se envía al cliente ningún dato de otros participantes

**Hecho cuando**: con 3 participantes de prueba, el heatmap y la mejor celda son correctos en los tres modos de visibilidad.

**Notas para el prompt**: «Propón 2 variantes visuales del heatmap antes de implementar. Tiene que ser sutil y legible en modo claro y oscuro».

### Fase 5 — Franjas y horas

- [x] `grid.ts` para `slot` y `hour`: rejilla horaria generada en la `timezone` del plan con `@date-fns/tz`, correcta en cambios de horario (DST). Tests con un día de cambio de hora
- [x] Vista `slot`: mes + franjas desplegables por día
- [x] Vista `hour` en móvil (lista de días → columna de horas) y en escritorio (rejilla semanal)
- [x] Pintar arrastrando con pointer events (táctil y ratón)
- [x] Mostrar en hora local del visitante, con la zona indicada si difiere de la del plan
- [x] Heatmap y bottom sheet funcionando en ambas vistas

**Hecho cuando**: un plan horario creado en `Europe/Madrid` se ve desplazado correctamente desde un navegador en `America/New_York`, y las respuestas coinciden.

### Fase 6 — Gestión del creador

- [x] `/plans/[id]/manage`: tabla participantes × celdas (scroll horizontal en móvil)
- [x] Editar plan con las restricciones de la sección 1
- [x] Borrar participante, regenerar enlace y borrar plan, con confirmaciones
- [x] El creador puede participar desde su propio plan
- [x] Autorización de todas las actions: solo el dueño

**Hecho cuando**: todas las acciones funcionan y un usuario que no es el dueño recibe 404 en `manage` y error en las actions.

### Fase 7 — Cierre, calendario y emails

- [x] Cerrar y reabrir plan; bloqueo de respuestas en servidor
- [x] Banner de fecha final + enlace a Google Calendar + `/api/plans/[id]/ics`
- [x] Plantillas React Email traducidas: nueva respuesta, enlace personal, fecha decidida
- [x] Lógica de aviso al creador con `notifiedAt` (ventana de 60 min)
- [x] Envío de emails sin bloquear la respuesta (`after()` de Next)
- [x] Locale del destinatario en cada email

**Hecho cuando**: cerrar un plan envía los emails correctos y el `.ics` se importa bien en Google Calendar y en Apple Calendar para las tres granularidades.

### Fase 8 — Pulido y producción

- [x] Traducciones completas `ca` y `en` revisadas
- [x] Rate limiting con Upstash en crear participante, guardar respuestas y pedir magic link
- [x] `opengraph-image` en `/p/[slug]` con el título del plan (para la vista previa en WhatsApp)
- [x] Accesibilidad: navegación por teclado en la rejilla, `aria-*` en celdas, contraste del heatmap
- [x] Páginas 404 y de error traducidas
- [x] e2e de los flujos principales: crear plan → invitado responde → creador cierra
- [ ] Dominio, variables de entorno de producción y migraciones en el deploy _(migraciones en el build listas con `pnpm vercel-build`; faltan dominio y credenciales: Neon, Google OAuth, Resend, Upstash)_
- [x] Revisión final de seguridad: autorización de cada action, tokens, datos enviados al cliente

**Hecho cuando**: el flujo completo funciona en producción en el móvil, compartido por WhatsApp.

---

## 5. Decisiones tomadas

- Un enlace = un plan.
- Granularidad, fechas, respuestas y visibilidad: configurables por el creador.
- No responder ≠ «No».
- Invitados: cookie + enlace personal; tokens hasheados.
- Sin tiempo real: revalidación al enfocar la pestaña.
- Sesiones JWT.
- El creador puede reabrir un plan cerrado.
- Avisos al creador limitados a uno por participante cada 60 min en ediciones.
