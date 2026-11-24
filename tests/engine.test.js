// Node runner: `npm test` (no dependencies, Node ≥ 18).
import { test } from 'node:test';
import { cases } from './cases.js';

for (const [name, fn] of cases) test(name, fn);
