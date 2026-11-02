# Trimly frontend

The Next.js app calls the NestJS API directly. The API base URL defaults to
`http://localhost:5000`; override it with `NEXT_PUBLIC_API_URL` in `.env.local`.

## Local setup

1. Apply [`db/schema.sql`](./db/schema.sql) to the PostgreSQL database.
2. Start the API from `backend/`; setup instructions and environment variables
   are documented in [`backend/README.md`](../backend/README.md).
3. Install frontend dependencies and start this app with `npm run dev`.

For local M-PESA callbacks, enable the backend ngrok tunnel. Configure
`NGROK_AUTHTOKEN` and `MPESA_CALLBACK_TOKEN` in the backend `.env`; the backend
publishes the callback URL automatically.
