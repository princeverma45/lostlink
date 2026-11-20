# LostLink

LostLink is a responsive campus lost-and-found application built with React, Express, Prisma, and SQLite. Students can report lost and found items, view database-backed possible matches, make private ownership claims, and complete a single-use SafeReturn handover. Moderators and administrators can review reports and claims.

## What works

- Student registration and sign-in with bcrypt password hashes, JWT sessions, protected API routes, and role-based moderation.
- Persistent SQLite records for users, reports, images, matches, private ownership checks, handovers, notifications, status history, campus locations, contributions, and disputes.
- Lost/found reports with optional validated image uploads, generated report codes, SHA-256 item fingerprints, duplicate warnings, and status timelines.
- Weighted, fuzzy report matching. Scores are estimates to help people review reports; they do not prove ownership.
- Private ownership-answer checks with recorded attempts and a moderator review path for failed answers.
- Random, expiring, one-use SafeReturn codes with QR images; both participants must be authorized to complete a handover.
- Student and admin analytics, notifications, contributor leaderboard, location activity, and configurable OpenStreetMap pins.
- Responsive layouts, accessible labels, input validation, upload limits, rate limits, and explicit API errors.

The guided assistant is implemented as database-backed report search and matching, not a generative AI feature. Real-time Socket.IO delivery, automatic report email verification, and campus-specific coordinates are not implemented. Campus map pins remain unset until an administrator enters accurate coordinates.

## Requirements

- Node.js 20.19+ (or 22.12+) and npm.
- Windows, macOS, or Linux.

## Install and run

From the project root:

1. Install the root development tools:

   ```sh
   npm install
   ```

2. Install backend and frontend dependencies:

   ```sh
   npm --prefix server install
   npm --prefix client install
   ```

3. Create the backend environment file:

   ```powershell
   Copy-Item server\.env.example server\.env
   ```

   Change `JWT_SECRET` to a private random value of at least 32 characters before using this outside a local demo. The default local database is `server/prisma/dev.db`.

4. Create the SQLite schema and demonstration records:

   ```sh
   npm run db:setup
   ```

5. Start both applications:

   ```sh
   npm run dev
   ```

   The frontend is at <http://localhost:5174> and the API is at <http://localhost:4101>. To start them separately, run `npm run dev:server` and `npm run dev:client` in two terminals.

`npm run db:setup` uses Prisma `db push` to create/update the local SQLite schema, generates the Prisma client, and seeds demo records. SQLite data persists in `server/prisma/dev.db` between server restarts. `npm run db:seed` can be run again safely for the demo users and sample reports.

## Demo accounts

All demo accounts use the password `LostLink2026!`:

| Role | Email |
| --- | --- |
| Student | `alex@lostlink.edu` |
| Student | `sam@lostlink.edu` |
| Administrator | `admin@lostlink.edu` |

These are local demonstration accounts, not production credentials. Registration only creates student accounts. Administrators can promote an account to moderator or admin.

## Tests and build

```sh
npm test
npm run build
```

The test command exercises the weighted matching service. Build compiles the React application for production.

## Deployment outline

1. Build the client with `npm run build` and serve `client/dist` from your static host.
2. Deploy the Express server with `npm --prefix server start`. Configure the static host or reverse proxy to forward `/api` and `/uploads` to the API origin.
3. Set `JWT_SECRET` to a unique secret, `CLIENT_ORIGIN` to the deployed frontend origin, and `PORT` to the API port. Set `DATABASE_URL` to a SQLite file on a persistent writable volume (for example, `file:/var/lib/lostlink/dev.db`), and persist `server/uploads` on durable storage.
4. On first deployment, install the server development dependencies in the build/release environment and run `npm --prefix server exec -- prisma db push --schema server/prisma/schema.prisma`. Generate the Prisma client with `npm --prefix server exec -- prisma generate --schema server/prisma/schema.prisma`, then start the server. Do not run the demo seed script in production.
5. Use one API instance when using SQLite and local uploads. For multiple instances, move the database and image storage to shared managed services; terminate TLS at the hosting platform or reverse proxy.

## API overview

All JSON APIs are under `/api`. Authenticated requests use `Authorization: Bearer <JWT>`.

- `POST /auth/register`, `POST /auth/login`, `GET /auth/me`, `PUT /auth/profile`
- `POST /reports/lost`, `POST /reports/found`, `GET /reports`, `GET /reports/mine`, `GET /reports/:id`, `PUT /reports/:id`, `DELETE /reports/:id`
- `GET /matches`, `POST /matches/recalculate`
- `POST /claims`, `GET /claims`, `PUT /claims/:id/verify`
- `POST /handover/create`, `POST /handover/:id/complete`
- `GET /notifications`, `PUT /notifications/:id/read`
- `GET /analytics/student`, `GET /analytics/admin`, `GET /analytics/heatmap`
- `GET /admin/users`, `PUT /admin/users/:id/role`, `GET /admin/reports`, `PUT /admin/reports/:id`, `GET /admin/claims`, `POST /admin/locations`
- `GET /locations`, `GET /leaderboard`

Report submissions accept `multipart/form-data` with an optional `image` (JPEG, PNG, or WebP; maximum 5 MB). A duplicate warning returns HTTP 409 with limited public report details; set `confirmDuplicates=true` after reviewing those results to continue.

## Safety and configuration

- Never expose `privateVerification` or handover token hashes in public responses. Ownership clues are only used by the private verification endpoint and are excluded from report APIs.
- Handovers expire after 15 minutes. The random token is returned once at creation; only its SHA-256 hash is stored. The completion endpoint validates the token, participant, expiry, and one-time-use state.
- For a real deployment, set a private `JWT_SECRET`, use HTTPS, configure `CLIENT_ORIGIN`, persist the SQLite file and uploads, back them up, and establish campus-specific policies and locations. Use a managed database and a dedicated private object store if deploying multiple API instances.
- Campus locations can be created by an admin. Coordinates are optional for reporting; the map only renders pins for locations with configured latitude and longitude.
