import test from 'node:test';
import assert from 'node:assert/strict';
import { aggregateLanguages, topLanguages } from './languages.mjs';

test('aggregateLanguages sums bytes for the same language across repos', () => {
  const totals = aggregateLanguages([
    { TypeScript: 100, CSS: 10 },
    { TypeScript: 50, Python: 40 },
  ]);
  assert.deepEqual(totals, { TypeScript: 150, CSS: 10, Python: 40 });
});

test('topLanguages sorts descending by bytes and slices to n', () => {
  const totals = { TypeScript: 150, Python: 40, CSS: 10 };
  const top = topLanguages(totals, 2);
  assert.deepEqual(top.map((l) => l.name), ['TypeScript', 'Python']);
});

test('topLanguages computes percentage of the grand total across ALL languages, not just the slice', () => {
  const totals = { TypeScript: 80, Python: 20 };
  const top = topLanguages(totals, 1);
  assert.deepEqual(top, [{ name: 'TypeScript', bytes: 80, pct: 80 }]);
});

test('topLanguages returns an empty array when there are no languages', () => {
  assert.deepEqual(topLanguages({}, 3), []);
});
