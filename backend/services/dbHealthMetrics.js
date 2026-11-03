/**
 * Lightweight, in-process error metrics for database degradation.
 *
 * The repositories fall back to an in-memory store when a Prisma query fails.
 * That fallback is useful for keeping the API responsive, but it must never be
 * silent: operators need to know that live data is unavailable, and the UI
 * needs to be able to surface a "live data unavailable" banner instead of
 * presenting stale/partial numbers as fact.
 *
 * This module keeps a small counter snapshot that can be exposed through the
 * dashboard health endpoint. It is intentionally dependency-free and
 * process-local — a production deployment would replace it with Prometheus
 * counters, but the shape (`record` / `markHealthy` / `snapshot`) stays the
 * same.
 */

/** @type {{ total: number, consecutive: number, byOperation: Record<string, { errors: number, consecutive: number, lastError: string | null, lastErrorAt: string | null }> }} */
const state = {
  total: 0,
  consecutive: 0,
  byOperation: {},
};

const ensureOperation = (operation) => {
  if (!state.byOperation[operation]) {
    state.byOperation[operation] = {
      errors: 0,
      consecutive: 0,
      lastError: null,
      lastErrorAt: null,
    };
  }
  return state.byOperation[operation];
};

const describeError = (error) => {
  if (!error) return 'Unknown database error';
  if (typeof error === 'string') return error;
  return error.message || String(error);
};

/**
 * Record a database query failure. Increments the error metric and marks the
 * operation as degraded until a subsequent successful query clears it.
 */
export function recordDbFallback(operation, error) {
  state.total += 1;
  state.consecutive += 1;
  const entry = ensureOperation(operation);
  entry.errors += 1;
  entry.consecutive += 1;
  entry.lastError = describeError(error);
  entry.lastErrorAt = new Date().toISOString();
  return entry;
}

/**
 * Mark an operation as healthy again after a successful database query.
 */
export function markDbHealthy(operation) {
  const entry = ensureOperation(operation);
  entry.consecutive = 0;
  state.consecutive = 0;
  return entry;
}

/**
 * Snapshot of the current error metrics. `degraded` is true while at least one
 * operation has an unresolved failure streak.
 */
export function getDbHealthMetrics() {
  const operations = Object.entries(state.byOperation).map(([operation, value]) => ({
    operation,
    ...value,
    degraded: value.consecutive > 0,
  }));
  return {
    degraded: state.consecutive > 0,
    totalDbErrors: state.total,
    consecutiveDbErrors: state.consecutive,
    operations,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Reset all counters. Used by tests.
 */
export function resetDbHealthMetrics() {
  state.total = 0;
  state.consecutive = 0;
  state.byOperation = {};
}

export default {
  recordDbFallback,
  markDbHealthy,
  getDbHealthMetrics,
  resetDbHealthMetrics,
};
