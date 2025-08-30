// Minimal RASP middleware for Express to detect auth failures and emit security events.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export function raspMiddleware(opts = {}) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const eventsDirectory = opts.eventsDir || path.join(__dirname, '..', 'events');
  if (!fs.existsSync(eventsDirectory)) fs.mkdirSync(eventsDirectory, { recursive: true });

  const failClosed = opts.failClosed ?? process.env.RASP_FAIL_CLOSED === 'true';
  const threshold = parseInt(String(opts.threshold ?? process.env.RASP_BLOCK_THRESHOLD ?? '5'), 10);
  const counters = new Map();

  function emitEvent(event) {
    const filename = path.join(
      eventsDirectory,
      `event-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.json`,
    );
    // use synchronous write to make tests deterministic
    fs.writeFileSync(filename, JSON.stringify(event, null, 2));
  }

  async function middleware(req, res, next) {
    // example: capture failed auth attempts (assumes upstream sets req.authFailed)
    if (req.authFailed) {
      const ip = req.ip || req.connection?.remoteAddress || 'unknown';
      const c = (counters.get(ip) || 0) + 1;
      counters.set(ip, c);
      const event = { type: 'auth_failure', ip, path: req.path, count: c, ts: Date.now() };
      emitEvent(event);
      if (c >= threshold && failClosed) {
        // Quarantine: respond 403 and do not call next
        emitEvent({ type: 'quarantine', ip, ts: Date.now(), reason: 'threshold_exceeded' });
        return res.status(403).json({ error: 'quarantined' });
      }
    }

    // capture TLS errors if surfaced
    if (req.tlsError) {
      emitEvent({ type: 'tls_error', details: req.tlsError, ts: Date.now() });
    }

    return next();
  }

  // expose internals for testing
  middleware._emitEvent = emitEvent;
  middleware._counters = counters;
  middleware._eventsDir = eventsDirectory;
  return middleware;
}
