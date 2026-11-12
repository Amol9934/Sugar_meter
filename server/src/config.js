import 'dotenv/config';

const env = process.env;
const isTest = env.NODE_ENV === 'test';
const isProd = env.NODE_ENV === 'production';

function required(name, value) {
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const jwtSecret = required('JWT_SECRET', env.JWT_SECRET);
if (isProd && jwtSecret.length < 32) {
  throw new Error('JWT_SECRET must be at least 32 characters in production');
}

export const config = {
  isTest,
  isProd,
  port: Number(env.PORT) || 4000,
  databaseUrl: required(
    isTest ? 'TEST_DATABASE_URL' : 'DATABASE_URL',
    isTest ? env.TEST_DATABASE_URL : env.DATABASE_URL
  ),
  jwtSecret,
  jwtExpiresIn: '7d',
  cookieMaxAgeMs: 7 * 24 * 60 * 60 * 1000,
  // "Today" is decided in the patient's timezone, not the server's (see README: Notes).
  timezone: env.APP_TIMEZONE || 'Asia/Kolkata',
  // bcrypt cost: 12 in production, cheaper in tests so the suite stays fast.
  bcryptRounds: isTest ? 4 : 12,
  clientOrigin: env.CLIENT_ORIGIN || 'http://localhost:5173',
};
