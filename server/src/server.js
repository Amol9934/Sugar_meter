import { createApp } from './app.js';
import { config } from './config.js';
import { pool } from './db/pool.js';

const server = createApp().listen(config.port, () =>
  console.log(`Sweety API listening on http://localhost:${config.port}`)
);

// Graceful shutdown so in-flight requests finish and DB connections close cleanly.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    server.close(async () => {
      await pool.end();
      process.exit(0);
    });
  });
}
