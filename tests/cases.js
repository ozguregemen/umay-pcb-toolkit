// Aggregates all engine test cases. Used by the Node runner (engine.test.js)
// and the browser runner (tests/index.html).

import { cases as pcb } from './cases/pcb.js';
import { cases as si } from './cases/si.js';
import { cases as power } from './cases/power.js';
import { cases as circuit } from './cases/circuit.js';

export const cases = [...pcb, ...si, ...power, ...circuit];
