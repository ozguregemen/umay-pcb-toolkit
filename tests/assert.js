// Tiny assertion helpers shared by all test case files (Node and browser).

export function near(actual, expected, relTol = 1e-3, label = '') {
  const tol = Math.abs(expected) * relTol || relTol;
  if (!(Math.abs(actual - expected) <= tol)) {
    throw new Error(`${label} expected ${expected} ± ${tol}, got ${actual}`);
  }
}

export function eq(actual, expected, label = '') {
  if (actual !== expected) throw new Error(`${label} expected ${expected}, got ${actual}`);
}

export function ok(cond, label = '') {
  if (!cond) throw new Error(`assertion failed: ${label}`);
}
