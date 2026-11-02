# Trimly backend

NestJS REST API for the Trimly frontend. PostgreSQL stores accounts, shops,
services, staff, bookings, sessions, and payments.

## Local setup

1. Create a PostgreSQL database and apply [`../frontend/db/schema.sql`](../frontend/db/schema.sql).
   Reapply it to an existing database to add the shop-owner relationship.
2. Copy `.env.example` to `.env` and set `DATABASE_URL`.
3. Install dependencies with `npm install`.
4. Start the API with `npm run start:dev` (default: `http://localhost:5000`).
5. Start the frontend in `frontend/` (default: `http://localhost:3000`). Set
   `NEXT_PUBLIC_API_URL` there only if the API is not at `http://localhost:5000`.

For Daraja callbacks during local development, set `NGROK_ENABLED=true`,
`NGROK_AUTHTOKEN`, and `MPESA_CALLBACK_TOKEN` in `.env`. The API starts an ngrok
tunnel automatically and sets the callback URL for the lifetime of that run.
Optionally set `NGROK_DOMAIN` to a reserved ngrok domain. Keep ngrok disabled
outside local development.

The frontend sends credentialed requests directly to this API. The session is a
14-day, HTTP-only cookie; in production, use HTTPS and configure
`CORS_ORIGINS` with the exact frontend origin(s).

## Endpoints

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| GET | `/health` | Public | Liveness check |
| GET | `/shops` | Public | List shops with services and staff |
| GET | `/shops/:id` | Public | Read one shop |
| GET | `/shops/mine` | Shop owner | List only the signed-in owner’s shops |
| POST | `/shops` | Shop owner | Create a shop |
| PATCH | `/shops/:id` | Shop owner | Update an owned shop profile |
| POST | `/shops/:shopId/services` | Shop owner | Add an owned-shop service |
| PATCH, DELETE | `/shops/:shopId/services/:serviceId` | Shop owner | Update or remove an owned-shop service |
| POST | `/shops/:shopId/staff` | Shop owner | Add an owned-shop staff member |
| PATCH, DELETE | `/shops/:shopId/staff/:staffId` | Shop owner | Update or remove owned-shop staff |
| GET | `/shops/:shopId/bookings` | Shop owner | View bookings for an owned shop |
| POST | `/auth/register` | Public | Create an account and session |
| POST | `/auth/login` | Public | Start a session |
| POST | `/auth/logout` | Public | Revoke the current session |
| GET | `/auth/me` | Signed in | Read the current account |
| GET, POST | `/bookings` | Signed in | List bookings or reserve an appointment |
| POST | `/payments/mpesa` | Signed in | Send an M-PESA STK prompt |
| GET | `/payments/:id` | Payment owner | Read payment status |
| POST | `/payments/mpesa/callback` | M-PESA token | Process a Daraja callback |

Booking payments require all `MPESA_*` values in `.env`. The configured
callback URL must be publicly reachable and include the same token as
`MPESA_CALLBACK_TOKEN`.

All owner operations verify `owner_user_id` against the authenticated session;
shop IDs alone never grant management access. Services and team members with
existing bookings cannot be deleted.
