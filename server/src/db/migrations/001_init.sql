CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(80)  NOT NULL,
  email         VARCHAR(254) NOT NULL,
  password_hash TEXT         NOT NULL,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT now()
);

-- Emails are unique case-insensitively ("A@x.com" and "a@x.com" are the same person).
CREATE UNIQUE INDEX users_email_lower_key ON users (lower(email));

CREATE TABLE readings (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reading_date DATE        NOT NULL,
  slot         VARCHAR(20) NOT NULL
               CHECK (slot IN ('morning_fasting','after_breakfast','after_lunch','after_dinner')),
  value        SMALLINT    NOT NULL CHECK (value BETWEEN 40 AND 600),
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- The database is the final authority on "one reading per slot per day".
  -- App-level checks give friendly messages; this constraint makes races impossible.
  CONSTRAINT readings_one_per_slot_per_day UNIQUE (user_id, reading_date, slot)
);

-- Serves both the per-day lookups and the month range reports (user_id, then date range).
-- The UNIQUE constraint above already creates an index on (user_id, reading_date, slot),
-- so no extra index is needed.
