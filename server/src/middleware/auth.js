import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { unauthorized } from '../lib/errors.js';

export const COOKIE_NAME = 'sweety_token';

export function cookieOptions() {
  return {
    httpOnly: true, // not readable from JS, so an XSS bug cannot steal the session
    sameSite: 'lax',
    secure: config.isProd,
    maxAge: config.cookieMaxAgeMs,
    path: '/',
  };
}

export function signToken(userId) {
  return jwt.sign({ sub: String(userId) }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
}

export function requireAuth(req, _res, next) {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) throw unauthorized();
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    req.userId = Number(payload.sub);
    next();
  } catch {
    throw unauthorized('Your session has expired. Please log in again.');
  }
}
