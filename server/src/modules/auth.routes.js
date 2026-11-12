import { Router } from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { query } from '../db/pool.js';
import { config } from '../config.js';
import { COOKIE_NAME, cookieOptions, signToken, requireAuth } from '../middleware/auth.js';
import { validationError, conflictError, AppError, unauthorized } from '../lib/errors.js';

export const authRouter = Router();

// Slows down password guessing. Disabled in tests so the suite is not throttled.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => config.isTest,
  message: { error: { code: 'RATE_LIMITED', message: 'Too many attempts. Please try again later.' } },
});

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Compared against when the email is unknown, so response time doesn't reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', config.bcryptRounds);

const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });

function validateRegistration(body = {}) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';

  if (!name) throw validationError('Please enter your name.', 'name');
  if (name.length > 80) throw validationError('Name must be 80 characters or fewer.', 'name');
  if (!EMAIL.test(email) || email.length > 254) {
    throw validationError('Please enter a valid email address.', 'email');
  }
  if (password.length < 8) throw validationError('Password must be at least 8 characters.', 'password');
  // bcrypt silently ignores anything past 72 bytes; reject instead of truncating.
  if (Buffer.byteLength(password) > 72) {
    throw validationError('Password must be 72 bytes or fewer.', 'password');
  }
  return { name, email, password };
}

function startSession(res, user) {
  res.cookie(COOKIE_NAME, signToken(user.id), cookieOptions());
}

authRouter.post('/register', authLimiter, async (req, res) => {
  const { name, email, password } = validateRegistration(req.body);
  const passwordHash = await bcrypt.hash(password, config.bcryptRounds);
  try {
    const { rows } = await query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, passwordHash]
    );
    startSession(res, rows[0]);
    res.status(201).json({ user: publicUser(rows[0]) });
  } catch (err) {
    if (err.code === '23505') throw conflictError('An account with this email already exists.', 'email');
    throw err;
  }
});

authRouter.post('/login', authLimiter, async (req, res) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || !password) throw validationError('Please enter your email and password.');

  const { rows } = await query(
    'SELECT id, name, email, password_hash FROM users WHERE lower(email) = $1',
    [email]
  );
  const user = rows[0];
  const ok = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);
  if (!user || !ok) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');

  startSession(res, user);
  res.json({ user: publicUser(user) });
});

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: undefined });
  res.status(204).end();
});

authRouter.get('/me', requireAuth, async (req, res) => {
  const { rows } = await query('SELECT id, name, email FROM users WHERE id = $1', [req.userId]);
  if (!rows[0]) throw unauthorized();
  res.json({ user: publicUser(rows[0]) });
});
