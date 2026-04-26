# Nobti Backend API Contract (v1)

Base URL:
- HTTP: `/api/v1`
- WS: `/ws`

Auth:
- Client auth is handled by Supabase.
- Backend expects: `Authorization: Bearer <supabase_access_token>`
- Backend validates JWT using Supabase JWKS.
- For anonymous visitors, token is from `signInAnonymously()`.

Common headers:
- `Content-Type: application/json`
- `Authorization: Bearer <token>` (when required)
- `Idempotency-Key: <uuid>` (recommended for ticket creation)

---

## 1) Health

### `GET /api/v1/health`
Response `200`
```json
{ "ok": true, "service": "nobti-api", "time": "2026-04-24T12:00:00Z" }
```

---

## 2) Public Visitor Discovery

### `GET /api/v1/public/establishments`
Query:
- `search?: string`
- `category?: string`
- `lat?: number`
- `lng?: number`
- `radiusKm?: number`
- `page?: number` (default 1)
- `limit?: number` (default 20)

Response `200`
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Dr. Karim — Cabinet médical",
      "category": "medical",
      "address": "Rue ...",
      "latitude": 33.57,
      "longitude": -7.59,
      "isActive": true
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

### `GET /api/v1/public/establishments/:establishmentId`
Response `200`
```json
{
  "id": "uuid",
  "name": "Dr. Karim — Cabinet médical",
  "category": "medical",
  "address": "Rue ...",
  "latitude": 33.57,
  "longitude": -7.59,
  "isActive": true
}
```

### `GET /api/v1/public/establishments/:establishmentId/queues`
Response `200`
```json
{
  "items": [
    {
      "id": "uuid",
      "establishmentId": "uuid",
      "name": "Consultations",
      "status": "open",
      "avgServiceMinutes": 4,
      "estimatedWaitMinutes": 16,
      "peopleWaiting": 4
    }
  ]
}
```

### `GET /api/v1/public/queues/:queueId`
Response `200`
```json
{
  "id": "uuid",
  "establishmentId": "uuid",
  "name": "Consultations",
  "status": "open",
  "avgServiceMinutes": 4,
  "estimatedWaitMinutes": 16,
  "peopleWaiting": 4
}
```

---

## 3) Visitor Ticket Flow (QR join)

### `POST /api/v1/queues/:queueId/tickets`  *(Auth required: anonymous or normal user)*
Creates one ticket for current user in queue.

Request body:
```json
{
  "source": "qr",
  "metadata": {
    "device": "web",
    "locale": "fr"
  }
}
```

Response `201`
```json
{
  "ticketId": "uuid",
  "queueId": "uuid",
  "userId": "uuid",
  "ticketNumber": "A08",
  "status": "waiting",
  "position": 4,
  "estimatedWaitMinutes": 16,
  "progress": 20,
  "createdAt": "2026-04-24T12:00:00Z"
}
```

Errors:
- `409` if active ticket already exists for same user+queue
- `403` if queue closed
- `404` queue not found

### `GET /api/v1/tickets/:ticketId` *(Auth required, owner or establishment owner)*
Response `200`
```json
{
  "ticketId": "uuid",
  "queueId": "uuid",
  "ticketNumber": "A08",
  "status": "waiting",
  "position": 4,
  "estimatedWaitMinutes": 16,
  "progress": 20,
  "calledAt": null,
  "servedAt": null,
  "cancelledAt": null
}
```

### `POST /api/v1/tickets/:ticketId/cancel` *(Auth required, owner or establishment owner)*
Request:
```json
{ "reason": "user_cancelled" }
```

Response `200`
```json
{
  "success": true,
  "ticketId": "uuid",
  "status": "cancelled",
  "cancelledAt": "2026-04-24T12:10:00Z"
}
```

---

## 4) Establishment Profile (owner flows)

> Maps to Prisma `public.establishments` where `owner` is auth user id.

### `POST /api/v1/establishments` *(Auth required)*
Creates establishment profile for current auth user (or additional if multi-establishment allowed).

Request:
```json
{
  "name": "Cabinet Karim",
  "category": "medical",
  "address": "Rue ...",
  "latitude": 33.57,
  "longitude": -7.59
}
```

Response `201`
```json
{
  "id": "uuid",
  "name": "Cabinet Karim",
  "category": "medical",
  "address": "Rue ...",
  "latitude": 33.57,
  "longitude": -7.59,
  "isActive": true,
  "owner": "auth-user-uuid"
}
```

### `GET /api/v1/me/establishments` *(Auth required)*
Response `200`
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Cabinet Karim",
      "category": "medical",
      "isActive": true
    }
  ]
}
```

### `PATCH /api/v1/establishments/:establishmentId` *(Auth required, owner only)*
Request:
```json
{
  "name": "Cabinet Karim Centre",
  "address": "Nouvelle adresse",
  "isActive": true
}
```

Response `200`
```json
{
  "id": "uuid",
  "name": "Cabinet Karim Centre",
  "address": "Nouvelle adresse",
  "isActive": true
}
```

---

## 5) Queue Management (establishment side)

### `POST /api/v1/establishments/:establishmentId/queues` *(owner)*
Request:
```json
{
  "name": "Consultations",
  "avgServiceMinutes": 4,
  "isActive": true
}
```

Response `201`
```json
{
  "id": "uuid",
  "establishmentId": "uuid",
  "name": "Consultations",
  "status": "open",
  "avgServiceMinutes": 4
}
```

### `GET /api/v1/establishments/:establishmentId/queues` *(owner)*
Response `200`
```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Consultations",
      "status": "open",
      "waitingCount": 12,
      "avgServiceMinutes": 4
    }
  ]
}
```

### `PATCH /api/v1/queues/:queueId` *(owner)*
Request:
```json
{
  "name": "Consultations générales",
  "avgServiceMinutes": 5,
  "isActive": true
}
```

Response `200`
```json
{
  "id": "uuid",
  "name": "Consultations générales",
  "avgServiceMinutes": 5,
  "isActive": true
}
```

### `POST /api/v1/queues/:queueId/open` *(owner)*
### `POST /api/v1/queues/:queueId/pause` *(owner)*
### `POST /api/v1/queues/:queueId/close` *(owner)*

Response `200`
```json
{ "id": "uuid", "status": "open" }
```
(or `paused` / `closed`)

---

## 6) Ticket Operations (establishment side)

### `GET /api/v1/queues/:queueId/tickets?status=waiting|called|served|cancelled` *(owner)*
Response `200`
```json
{
  "items": [
    {
      "ticketId": "uuid",
      "ticketNumber": "A08",
      "status": "waiting",
      "position": 1,
      "createdAt": "2026-04-24T12:00:00Z"
    }
  ]
}
```

### `POST /api/v1/tickets/:ticketId/call` *(owner)*
### `POST /api/v1/tickets/:ticketId/recall` *(owner)*
### `POST /api/v1/tickets/:ticketId/serve` *(owner)*
### `POST /api/v1/tickets/:ticketId/skip` *(owner)*
### `POST /api/v1/tickets/:ticketId/complete` *(owner)*

Response `200`
```json
{
  "ticketId": "uuid",
  "status": "called"
}
```
(status changes by action)

---

## 7) Analytics (establishment side)

### `GET /api/v1/establishments/:establishmentId/analytics/overview?from=ISO&to=ISO` *(owner)*
Response `200`
```json
{
  "totalTickets": 120,
  "servedTickets": 104,
  "cancelledTickets": 10,
  "avgWaitMinutes": 14,
  "avgServiceMinutes": 5,
  "peakHour": "11:00"
}
```

### `GET /api/v1/establishments/:establishmentId/analytics/queues/:queueId?from=ISO&to=ISO` *(owner)*
Response `200`
```json
{
  "queueId": "uuid",
  "totalTickets": 80,
  "servedTickets": 72,
  "avgWaitMinutes": 12,
  "timeline": [
    { "bucket": "2026-04-24T10:00:00Z", "tickets": 8, "avgWait": 10 }
  ]
}
```

---

## 8) Real-time WebSocket Contract

### Connect
`GET /ws/queues/:queueId?ticket_id=<uuid>&access_token=<jwt>&role=visitor|owner`

Rules:
- `role=visitor`: must own `ticket_id`
- `role=owner`: must own queue establishment
- Server sends snapshot first, then updates

### Server events
```json
{
  "type": "snapshot",
  "queueId": "uuid",
  "nowServing": "A04",
  "waitingCount": 12,
  "updatedAt": "2026-04-24T12:00:00Z"
}
```

```json
{
  "type": "ticket_update",
  "ticketId": "uuid",
  "ticketNumber": "A08",
  "status": "waiting",
  "position": 4,
  "estimatedWaitMinutes": 16,
  "progress": 20,
  "updatedAt": "2026-04-24T12:01:00Z"
}
```

```json
{ "type": "called", "ticketId": "uuid", "counter": "Desk 1", "updatedAt": "..." }
```

```json
{ "type": "served", "ticketId": "uuid", "updatedAt": "..." }
```

```json
{ "type": "cancelled", "ticketId": "uuid", "updatedAt": "..." }
```

```json
{ "type": "queue_state", "queueId": "uuid", "status": "paused", "updatedAt": "..." }
```

Error event:
```json
{ "type": "error", "code": "UNAUTHORIZED", "message": "Invalid token" }
```

---

## 9) Error Format (all HTTP routes)

Non-2xx response:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "queueId is invalid",
    "details": {
      "field": "queueId"
    }
  }
}
```

Common codes:
- `UNAUTHORIZED` (401)
- `FORBIDDEN` (403)
- `NOT_FOUND` (404)
- `CONFLICT` (409)
- `VALIDATION_ERROR` (422)
- `RATE_LIMITED` (429)
- `INTERNAL_ERROR` (500)

---

## 10) Notes for your current app

- `/join/[queue_id]` page needs:
  1. `POST /queues/:queueId/tickets`
  2. `GET /tickets/:ticketId` (optional fallback polling)
  3. `POST /tickets/:ticketId/cancel`
  4. `WS /ws/queues/:queueId?...` for live updates

- Supabase session token from client is enough; no custom backend login route required.

- `establishments.owner` should always be set from JWT `sub` (ignore owner from client body).