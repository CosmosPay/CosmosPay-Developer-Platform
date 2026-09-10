/* supportStatus.test.ts — the two guards a ticket update body passes through. */
import { strict as assert } from 'node:assert';
import { test } from 'node:test';

import {
  TICKET_PRIORITIES,
  TICKET_STATUSES,
  isTicketPriority,
  isTicketStatus,
} from '@/lib/support-status';

test('isTicketStatus accepts exactly the declared statuses', () => {
  for (const s of TICKET_STATUSES) assert.equal(isTicketStatus(s), true);
  for (const bad of ['OPEN', 'Open', 'done', '', ' open', null, undefined, 0, {}, ['open']]) {
    assert.equal(isTicketStatus(bad), false, `${String(bad)} was accepted as a status`);
  }
});

test('isTicketPriority accepts exactly the declared priorities', () => {
  for (const p of TICKET_PRIORITIES) assert.equal(isTicketPriority(p), true);
  for (const bad of ['URGENT', 'critical', '', null, undefined, 3, {}]) {
    assert.equal(isTicketPriority(bad), false, `${String(bad)} was accepted as a priority`);
  }
});

test('neither guard is fooled by an inherited Object property name', () => {
  // `includes` on an array is safe here, but the guards used to be written as object
  // lookups elsewhere in this codebase; these are the names that break that shape.
  for (const bad of ['toString', 'constructor', '__proto__', 'hasOwnProperty']) {
    assert.equal(isTicketStatus(bad), false);
    assert.equal(isTicketPriority(bad), false);
  }
});
