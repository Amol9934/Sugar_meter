import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import compression from 'compression';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { authRouter } from './modules/auth.routes.js';
import { readingsRouter } from './modules/readings.routes.js';
import { reportsRouter } from './modules/reports.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { config } from './config.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.resolve(__dirname, '../../client/dist');
const indexPath = path.join(clientDist, 'index.html');

export function createApp() {
  const app = express();
  app.disable('x-powered-by');
  // Vercel is a reverse proxy; needed for rate limiting and secure cookies
  app.set('trust proxy', 1);

  if (config.isProd) {
    app.use(compression());
  }

  app.use(helmet());
  app.use(express.json({ limit: '10kb' }));
  app.use(cookieParser());

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', authRouter);
  app.use('/api/readings', readingsRouter);
  app.use('/api/reports', reportsRouter);

  if (config.isProd) {
    app.use(
      express.static(clientDist, {
        setHeaders(res, filePath) {
          if (filePath.endsWith('index.html')) {
            res.setHeader('Cache-Control', 'no-cache');
          } else if (filePath.includes(path.sep + 'assets' + path.sep) || filePath.includes('/assets/')) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
          }
        },
      })
    );

    app.get('{*path}', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        return next();
      }
      res.setHeader('Cache-Control', 'no-cache');
      res.sendFile(indexPath);
    });
  }

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
