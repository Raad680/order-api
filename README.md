# orders-api

Concise overview of this project.

## What this is
A NestJS Orders service implementing:
- Draft → Confirm → Close lifecycle for orders
- Idempotent POST for draft creation (Redis-backed)
- Optimistic locking via version/If-Match
- Outbox pattern (Outbox table) written in the same DB transaction as Order changes
- Event publishing (EventPublisherService) that reads outbox or publishes after commit
- Guards (Tenant)
- Decorators

## Design notes
- Outbox writes must occur inside the same DB transaction that mutates Order (done in OrdersService). EventPublisher only publishes after commit (or an outbox processor reads DB).
- Idempotency: IdempotencyService stores (tenantId + key) in Redis. createDraftIdempotent returns stored response on replay; conflicts detected when body differs.
- Optimistic locking: Orders have a version. confirmDraft validates version and throws Conflict on mismatch (map to 409).

## API (examples)
- POST /api/v1/orders/draft
  - Creates a draft. Idempotency supported via Idempotency-Key header (handled in controller/service).
- PATCH /api/v1/orders/:id/confirm
  - Uses If-Match header (order version) to confirm and bump version.
- POST /api/v1/orders/:id/close
  - Closes order inside transaction and writes an outbox row for `orders.closed`.

## Environment variables
# PostgreSQL
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=db_password
DB_NAME=orders-api

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_TTL=3600

API_PREFIX=api/v1

