# Sweety – blood glucose tracker

A small full-stack app where a diabetes patient records up to four blood glucose readings a day
(morning fasting, after breakfast, after lunch, after dinner) and sees daily, month-to-date and
previous-month reports.

**Stack:** Node.js 22 + Express 5 · PostgreSQL 16 · React 18 (Vite) · tests with `node:test` + supertest and Vitest + React Testing Library.

## Quick start

Prerequisites: Node.js ≥ 22, and either Docker or a local PostgreSQL ≥ 14.

```bash
# 1. Install dependencies for server and client
npm run install:all

# 2. Start PostgreSQL (creates the `sweety` and `sweety_test` databases)
npm run db:up
#    …or use your own PostgreSQL and create both databases yourself:
#    createdb sweety && createdb sweety_test

# 3. Configure the server
cp server/.env.example server/.env     # then set JWT_SECRET (see the file for a one-liner)

# 4. Create the tables and load demo data
npm run migrate
npm run seed                            # demo user: demo@sweety.app / Demo@1234

# 5. Run (two terminals)
npm run dev:server                      # API  -> http://localhost:4000
npm run dev:client                      # App  -> http://localhost:5173
```

## Tests

```bash
npm test                  # server + client
npm --prefix server test  # API + unit tests (needs the test database, see TEST_DATABASE_URL)
npm --prefix client test  # React Testing Library tests for the reading form
```

The server tests run against a **real PostgreSQL** (not a mock) because the interesting guarantees
live in the database: the unique constraint, concurrent writes and the report aggregates.
Tests only ever touch `TEST_DATABASE_URL`.

What is covered: date-range maths (month ends, leap years, January → December), every validation
message, one-reading-per-slot, the 4-per-day guard, five simultaneous identical requests (exactly one
wins), edit/delete rules, per-user isolation, password hashing, httpOnly cookie, report numbers
including rounding and boundary dates, empty ranges, and the form's client-side validation.

## API

All routes are under `/api`; everything except register/login needs the session cookie.

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/auth/register` | `{name, email, password}` → creates user, starts session |
| POST | `/auth/login` | `{email, password}` |
| POST | `/auth/logout` | clears the session |
| GET | `/auth/me` | current user |
| GET | `/readings?page=1&limit=20&date=` | own readings, newest first (pagination = bonus) |
| POST | `/readings` | `{date, slot, value}` |
| PUT | `/readings/:id` | replace a reading |
| DELETE | `/readings/:id` | delete a reading |
| GET | `/reports?date=YYYY-MM-DD` | daily + month-to-date + previous month relative to `date` (default: today) |

Slots: `morning_fasting`, `after_breakfast`, `after_lunch`, `after_dinner`.
Errors always look like `{ "error": { "code", "message", "field" } }`; `message` is safe to show to users.

## Design decisions

- **The database enforces the rules too.** `UNIQUE (user_id, reading_date, slot)`, `CHECK (value BETWEEN 40 AND 600)`
  and a slot `CHECK`. The API checks first to give friendly messages; the constraints guarantee
  correctness even under concurrent requests. Writes also take a per-user-per-day advisory lock so the
  "max 4 per day" count can't be raced.
- **Dates are `YYYY-MM-DD` strings everywhere.** No JS `Date` is built from a local date string, which
  avoids the classic off-by-one-day timezone bug. Postgres `DATE` values are returned as strings.
- **Reports are computed in SQL** (`COUNT/MAX/MIN/AVG` with `ROUND(…, 1)`) over an index-backed range, not by loading rows into JS.
  One request returns all three reports so the screen is consistent.
- **Auth:** bcrypt (cost 12) via `bcryptjs`, JWT in an **httpOnly, SameSite=Lax** cookie (not readable by JS, so XSS can't steal it).
  Login errors are identical for "wrong password" and "unknown email", with a dummy hash compare to even out timing. Auth routes are rate limited.
- **Authorization:** every query filters on `user_id`. Someone else's reading id returns 404, not 403, so ids can't be probed.
- **Layering:** pure rules (`lib/readingRules.js`, `lib/dates.js`) are separate from HTTP and SQL, so the logic that matters is unit tested without a server.
- **UI:** the day is shown as a four-row logbook (the paper diary patients already know). Slots already logged are disabled in the form.

## Bonus tasks done

Pagination on `GET /readings` · Docker Compose for PostgreSQL · React Testing Library tests for the reading form.

## Notes

### Assumptions
1. **"Maximum 4 readings per day" is implied by "one per slot" when there are exactly 4 slots.** I still implemented it
   as an explicit rule and unit-tested it directly, so it keeps working if slots change. When both rules apply (a full day, same slot again) the more specific
   "already have an *After lunch* reading" message is shown.
2. **"Today" and "future" use one configured timezone** (`APP_TIMEZONE`, default `Asia/Kolkata`), not the server's clock.
   The browser's `max` date and client check use the browser's local date; if those differ from `APP_TIMEZONE` near midnight the server's answer wins.
   A production version would store a timezone per user.
3. A non-integer such as `120.5` gets the same message as an out-of-range value ("Value must be between 40 and 600 mg/dl.").
4. Editing may change a reading's date and slot; the same rules apply as for creating.
5. Report dates in the future are rejected. "Previous month" means the calendar month before the **selected** date's month.
6. Emails are case-insensitive and unique. Registering an existing email says so (friendlier, but it reveals the account exists).
7. I deliberately did **not** colour readings as "high/low". Clinical targets differ per patient and per doctor, and the brief doesn't ask for it.

### With more time
- Per-user timezone; refresh tokens / server-side session revocation; email verification and password reset.
- Charts of the month (Recharts), CSV/PDF export for doctor visits, and the doctor role (view assigned patients' reports).
- Redis cache for reports invalidated on write; BullMQ daily reminder for users with < 4 readings.
- End-to-end tests (Playwright), CI pipeline (GitHub Actions running both suites against a Postgres service), and structured request logging.
- Per-patient target ranges (set with their doctor) to highlight readings out of range.

## Project layout

```
server/src
  lib/          dates, slots, pure validation rules, errors      (no I/O)
  db/           pool, migration runner, SQL migrations, seed
  middleware/   auth (JWT cookie), error handler
  modules/      auth / readings / reports routers
server/test     unit + integration tests
client/src      pages, components, API client, auth context
```
