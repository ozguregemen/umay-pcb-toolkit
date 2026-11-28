// Aggregates all engine test cases. Used by the Node runner (engine.test.js)
// and the browser runner (tests/index.html).

import { cases as pcb } from './cases/pcb.js';
import { cases as si } from './cases/si.js';
import { cases as power } from './cases/power.js';
import { cases as circuit } from './cases/circuit.js';
import { cases as extra } from './cases/extra.js';
import { cases as matching } from './cases/matching.js';
import { cases as interfaces } from './cases/interfaces.js';
import { cases as stackup } from './cases/stackup.js';
import { cases as circuit2 } from './cases/circuit2.js';
import { cases as power2 } from './cases/power2.js';
import { cases as diagrams } from './cases/diagrams.js';
import { cases as integrity } from './cases/integrity.js';
import { cases as search } from './cases/search.js';
import { cases as math } from './cases/math.js';
import { cases as tolerance } from './cases/tolerance.js';
import { cases as powertree } from './cases/powertree.js';
import { cases as arith } from './cases/arith.js';
import { cases as thermalvia } from './cases/thermalvia.js';
import { cases as dcdrop } from './cases/dcdrop.js';
import { cases as termination } from './cases/termination.js';
import { cases as protection } from './cases/protection.js';

export const cases = [
  ...pcb, ...si, ...power, ...circuit, ...extra,
  ...matching, ...interfaces, ...stackup, ...circuit2, ...power2,
  ...diagrams, ...integrity, ...search, ...math, ...tolerance, ...powertree, ...arith, ...thermalvia, ...dcdrop,
  ...termination, ...protection,
];
