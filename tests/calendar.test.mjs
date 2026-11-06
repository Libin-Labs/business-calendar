import test from 'node:test';
import assert from 'node:assert/strict';
import { addBusinessMinutes, isBusinessInstant } from '../dist/esm/index.js';

const calendar = {
  intervals: [
    { weekday: 1, startMinute: 540, endMinute: 720 },
    { weekday: 1, startMinute: 780, endMinute: 1020 },
    { weekday: 2, startMinute: 540, endMinute: 1020 },
    { weekday: 3, startMinute: 540, endMinute: 1020 },
    { weekday: 4, startMinute: 540, endMinute: 1020 },
    { weekday: 5, startMinute: 540, endMinute: 1020 },
  ],
};

test('adds time within an explicit UTC interval', () => {
  assert.equal(
    addBusinessMinutes('2026-11-02T09:00:00Z', 60, calendar).toISOString(),
    '2026-11-02T10:00:00.000Z',
  );
});

test('carries time across a split day', () => {
  assert.equal(
    addBusinessMinutes('2026-11-02T11:30:00Z', 60, calendar).toISOString(),
    '2026-11-02T13:30:00.000Z',
  );
});

test('carries time across weekday and weekend boundaries', () => {
  assert.equal(
    addBusinessMinutes('2026-11-06T16:30:00Z', 120, calendar).toISOString(),
    '2026-11-09T10:30:00.000Z',
  );
});

test('skips explicit holidays', () => {
  const withHoliday = { ...calendar, holidays: ['2026-11-03'] };
  assert.equal(
    addBusinessMinutes('2026-11-02T17:00:00Z', 60, withHoliday).toISOString(),
    '2026-11-04T10:00:00.000Z',
  );
});

test('includes opening boundaries and excludes closing boundaries', () => {
  assert.equal(isBusinessInstant('2026-11-02T09:00:00Z', calendar), true);
  assert.equal(isBusinessInstant('2026-11-02T17:00:00Z', calendar), false);
  assert.equal(
    addBusinessMinutes('2026-11-02T17:00:00Z', 1, calendar).toISOString(),
    '2026-11-03T09:01:00.000Z',
  );
});

test('retains seconds when adding whole minutes inside an interval', () => {
  assert.equal(
    addBusinessMinutes('2026-11-02T09:00:30Z', 1, calendar).toISOString(),
    '2026-11-02T09:01:30.000Z',
  );
});

test('zero minutes returns the original instant without snapping', () => {
  assert.equal(
    addBusinessMinutes('2026-11-02T18:00:00Z', 0, calendar).toISOString(),
    '2026-11-02T18:00:00.000Z',
  );
});

test('rejects invalid durations, overlaps, and timezone offsets', () => {
  assert.throws(() => addBusinessMinutes('2026-11-02T09:00:00Z', -1, calendar), RangeError);
  assert.throws(
    () =>
      addBusinessMinutes('2026-11-02T09:00:00Z', 1, {
        intervals: [
          { weekday: 1, startMinute: 1, endMinute: 5 },
          { weekday: 1, startMinute: 4, endMinute: 8 },
        ],
      }),
    /overlap/,
  );
  assert.throws(() => isBusinessInstant('2026-11-02T09:00:00-05:00', calendar), TypeError);
});

test('rejects malformed or impossible holidays and intervals', () => {
  assert.throws(
    () => isBusinessInstant('2026-11-02T09:00:00Z', { intervals: [], holidays: ['2026-02-30'] }),
    TypeError,
  );
  assert.throws(
    () =>
      isBusinessInstant('2026-11-02T09:00:00Z', {
        intervals: [{ weekday: 7, startMinute: 0, endMinute: 1 }],
      }),
    RangeError,
  );
  assert.throws(() => isBusinessInstant('2026-02-31T09:00:00Z', calendar), TypeError);
  assert.throws(() => isBusinessInstant(8_640_000_000_000_001, calendar), TypeError);
});

test('fails explicitly when the configured search horizon is exhausted', () => {
  assert.throws(
    () => addBusinessMinutes('2026-11-02T09:00:00Z', 1, { intervals: [], maxDays: 2 }),
    /no intervals/,
  );
  assert.throws(
    () =>
      addBusinessMinutes('2026-11-02T09:00:00Z', 1000, {
        intervals: [{ weekday: 1, startMinute: 0, endMinute: 1 }],
        maxDays: 1,
      }),
    /within 1 UTC days/,
  );
});
