# ReadyOn Time-Off Management Microservice

Microservicio para gestionar solicitudes de tiempo libre, mantener integridad de saldos de vacaciones y sincronizar balances con sistemas HCM como Workday o SAP.

## Características

- Gestión del ciclo de vida de solicitudes de tiempo libre
- Validación y reserva de balances
- Approval workflow (approve / reject / cancel)
- Sincronización con HCM en tiempo real
- Reconciliación batch de balances
- Idempotency Keys para evitar duplicados
- Transactional Outbox Pattern para eventos de dominio
- Arquitectura preparada para integraciones event-driven

---

## Stack Tecnológico

- NestJS
- TypeScript
- Prisma 7
- SQLite
- pnpm

---

## Arquitectura

```text
Client
↓
REST API (NestJS)
↓
Domain Services
↓
Prisma Transactions
↓
SQLite
↓
Outbox Processor
↓
External Systems (HCM / Notifications / Payroll)
```

---

## Modelo de Dominio

```text
Employee
LeaveBalance
TimeOffRequest
IdempotencyKey
OutboxEvent
```

---

## Funcionalidades

## Solicitudes de Tiempo Libre

- Crear solicitud
- Aprobar solicitud
- Rechazar solicitud
- Cancelar solicitud aprobada
- Validación de saldo disponible

Estados soportados:

```text
PENDING -> APPROVED
PENDING -> REJECTED
APPROVED -> CANCELLED
```

---

## Integridad de Balance

Disponibilidad calculada:

```text
available = hcmBalance - reservedDays
```

Incluye:

- validaciones defensivas
- días reservados
- protección contra sobregiro
- detección de conflictos

---

## Sincronización con HCM

### Real-Time Sync

```http
POST /time-off/hcm-sync
```

Procesa actualizaciones externas.

---

## Reconciliation Batch

```http
POST /time-off/balances/reconcile
```

Permite:

- detectar drift
- reconciliar balances
- detectar conflictos

Estados posibles:

```text
RECONCILED
CONFLICT
NOT_FOUND
```

---

## Idempotencia

Endpoint:

```http
POST /time-off/requests
```

Requiere:

```http
Idempotency-Key header
```

Protege contra:

- retries
- double submit
- duplicados

---

## Transactional Outbox

Eventos emitidos:

```text
TimeOffRequested
TimeOffApproved
TimeOffRejected
TimeOffCancelled
BalanceSynced
BalanceReconciled
```

Beneficios:

- evita dual-write failures
- soporte para retries
- extensibilidad para Kafka / queues

---

# Endpoints

## Requests

```http
POST   /time-off/requests
PATCH  /time-off/requests/:id/approve
PATCH  /time-off/requests/:id/reject
PATCH  /time-off/requests/:id/cancel
```

---

## Balances

```http
GET   /time-off/employees/:employeeId/balance
POST  /time-off/hcm-sync
POST  /time-off/balances/reconcile
```

---

# Instalación

## Clonar repositorio

```bash
git clone https://github.com/tuusuario/readyon-timeoff.git
cd readyon-timeoff
```

---

## Instalar dependencias

```bash
pnpm install
```

---

## Variables de entorno

Crear:

```bash
.env
```

```env
DATABASE_URL="file:./dev.db"
```

---

## Generar Prisma Client

```bash
pnpm prisma generate
```

---

## Ejecutar migraciones

```bash
pnpm prisma migrate dev
```

---

## Seed (opcional)

```bash
pnpm tsx prisma/seed.ts
```

---

## Ejecutar proyecto

```bash
pnpm start:dev
```

Servidor:

```text
http://localhost:3000
```

---

# Ejemplos de Uso

## Crear solicitud

```http
POST /time-off/requests
```

Headers:

```http
Idempotency-Key: req-001
```

Body:

```json
{
  "employeeId": "emp1",
  "requestedDays": 2,
  "startDate": "2026-05-01",
  "endDate": "2026-05-02"
}
```

---

## Aprobar solicitud

```http
PATCH /time-off/requests/{id}/approve
```

---

## Obtener balance

```http
GET /time-off/employees/{employeeId}/balance
```

---

## Reconciliación batch

```http
POST /time-off/balances/reconcile
```

```json
[
  {
    "employeeId": "emp1",
    "newBalance": 15
  }
]
```

---

# Decisiones de Arquitectura

## HCM como source of truth

ReadyOn mantiene:

- validación local
- reservas
- reconciliación

HCM sigue siendo fuente oficial.

---

## Consistencia transaccional

Cambios de negocio y eventos se guardan juntos.

Patrón usado:

```text
Transactional Outbox
```

---

## Idempotencia para writes

Se implementó para soportar sistemas distribuidos y retries.

---

## Reconciliation como estrategia anti-drift

Incluida por cambios externos al sistema.

---

# Manejo de Fallos

Mitigaciones incluidas:

| Problema               | Solución           |
| ---------------------- | ------------------ |
| Duplicate requests     | Idempotency        |
| Balance drift          | Reconciliation     |
| Dual write failures    | Outbox             |
| Invalid approvals      | Transactions       |
| Reserved > HCM balance | Conflict detection |

---

# Eventos de Dominio

Ejemplo:

```text
Approve Request
↓
Persist APPROVED
↓
Store TimeOffApproved event
↓
Outbox processor publishes event
```

---

# Challenge Coverage

Este proyecto cubre:

✔ Gestión de solicitudes de tiempo libre

✔ Integridad de balances

✔ Sincronización con HCM

✔ Reconciliación batch

✔ Idempotencia

✔ Transactional outbox

✔ Manejo de conflictos entre sistemas

---

# Autor

Jesus Ramirez Ayala

---
