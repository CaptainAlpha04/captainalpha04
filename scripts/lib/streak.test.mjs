import test from 'node:test';
import assert from 'node:assert/strict';
import { computeStreaks } from './streak.mjs';

function days(pattern, startDate = '2025-01-01') {
  const start = new Date(`${startDate}T00:00:00Z`);
  return pattern.split('').map((flag, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return { date: d.toISOString().slice(0, 10), active: flag === '1' };
  });
}

test('empty input has no streaks', () => {
  assert.deepEqual(computeStreaks([]), { current: 0, longest: 0 });
});

test('all-inactive input has no streaks', () => {
  assert.deepEqual(computeStreaks(days('0000')), { current: 0, longest: 0 });
});

test('all-active input: current equals longest equals length', () => {
  assert.deepEqual(computeStreaks(days('11111')), { current: 5, longest: 5 });
});

test('trailing streak shorter than an earlier longest run', () => {
  // 5-day run, 2-day gap, 3-day trailing run
  assert.deepEqual(computeStreaks(days('1111100111')), { current: 3, longest: 5 });
});

test('inactive final day (today) does not zero out the current streak', () => {
  // 4 active days then today with no contribution yet
  assert.deepEqual(computeStreaks(days('11110')), { current: 4, longest: 4 });
});

test('input order does not matter — function sorts by date first', () => {
  const shuffled = [...days('11110')].reverse();
  assert.deepEqual(computeStreaks(shuffled), { current: 4, longest: 4 });
});
