# orders-api

Concise overview of this project.

## What this is
A NestJS Orders service implementing:
- Draft → Confirm → Close lifecycle for orders
- Idempotent POST for draft creation (Redis-backed)
- Optimistic locking via version/If-Match
- Outbox pattern (Outbox table) written in the same DB transaction as Order changes
- Event publishing (EventPublisherService) that reads outbox or publishes after commit
- Guards

## Key folders / files
- src/app.module.ts — root module, global providers (APP_INTERCEPTOR), TypeORM config
- src/main.ts — Nest bootstrap (avoid duplicate global interceptor here)
- src/modules/orders/
  - orders.module.ts
  - orders.controller.ts
  - services/orders.service.ts — transactional logic, idempotency usage, outbox writes
  - services/idempotency.service.ts — Redis idempotency helpers
  - entities/order.entity.ts
  - entities/outbox.entity.ts
  - events/event-publisher.service.ts — publish events (do not write outbox)
- src/common/interceptor/logging.interceptor.ts — request logging (register once via APP_INTERCEPTOR)
- test/integration/orders.integration.spec.ts — integration tests (Testcontainers or alternatives)
- jest.integration.config.js — integration jest config

## Design notes
- Outbox writes must occur inside the same DB transaction that mutates Order (done in OrdersService). EventPublisher only publishes after commit (or an outbox processor reads DB).
- Idempotency: IdempotencyService stores (tenantId + key) → { status, response } in Redis. createDraftIdempotent returns stored response on replay; conflicts detected when body differs.
- Optimistic locking: Orders have a version. confirmDraft validates version and throws Conflict on mismatch (map to 409).
- Avoid duplicate logs: register LoggingInterceptor exactly once (prefer APP_INTERCEPTOR in AppModule). Remove @UseInterceptors at controller level and app.useGlobalInterceptors in main.ts.

## API (examples)
- POST /api/v1/orders/draft
  - Creates a draft. Idempotency supported via Idempotency-Key header (handled in controller/service).
- PATCH /api/v1/orders/:id/confirm
  - Uses If-Match header (order version) to confirm and bump version.
- POST /api/v1/orders/:id/close
  - Closes order inside transaction and writes an outbox row for `orders.closed`.

(See controllers for exact routes/payloads.)

## Environment variables
- DB: DB_HOST, DB_PORT, DB_USER, DB_PASS, DB_NAME
- REDIS_HOST, REDIS_PORT
- Other config in src/config/app.config.ts

## Run locally
1. Install deps:
   - npm install
2. Dev:
   - npm run start:dev
3. Build:
   - npm run build
4. Tests:
   - Unit: npm test
   - Integration (requires Docker): npm run test:integration

## Integration tests
- test/integration uses Testcontainers (Postgres + Redis). Ensure Docker is running.
- Script: `test:integration` uses jest.integration.config.js
- If testcontainers package issues occur, either:
  - install latest testcontainers, or
  - fallback to in-memory replacements (not included).

## Common troubleshooting
- Cannot find module '@nestjs/typeorm' → npm i @nestjs/typeorm typeorm reflect-metadata
- testcontainers typings issues → npm i -D testcontainers; add test/types/testcontainers.d.ts with `declare module 'testcontainers';` if needed
- Duplicate logging entries → remove duplicates (controller @UseInterceptors / main.ts app.useGlobalInterceptors) and keep APP_INTERCEPTOR provider in AppModule.

## Useful commands
- Install: npm install
- Start dev: npm run start:dev
- Run integration tests: npm run test:integration
- Restart TS server in VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"

## Where to add outbox writes
- Always write outbox rows inside the same TypeORM transaction in OrdersService methods that mutate orders (createDraft, confirmDraft, closeOrder). Do not write outbox from EventPublisher.

## Contacts / next steps
- If you want, I can:
  - Add the integration test file to test/integration/ (already prepared)
  - Add README badges or CI config for running integration tests in CI (requires Docker)
