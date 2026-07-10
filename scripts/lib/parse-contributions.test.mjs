import test from 'node:test';
import assert from 'node:assert/strict';
import { parseTotalContributions, parseContributionDays } from './parse-contributions.mjs';

const HEADER_FIXTURE = `
    <h2 tabindex="-1" id="js-contribution-activity-description" class="f4 text-normal mb-2">
      1,129
      contributions
        in the last year
    </h2>
`;

const DAYS_FIXTURE = `
<td data-ix="1" data-date="2025-07-08" id="contribution-day-component-0-1" data-level="0" role="gridcell" class="ContributionCalendar-day"></td>
<td data-ix="0" data-date="2025-07-06" id="contribution-day-component-0-0" data-level="2" role="gridcell" class="ContributionCalendar-day"></td>
<td data-ix="2" data-date="2025-07-07" id="contribution-day-component-0-2" data-level="0" role="gridcell" class="ContributionCalendar-day"></td>
`;

test('parseTotalContributions reads the comma-formatted count from the header', () => {
  assert.equal(parseTotalContributions(HEADER_FIXTURE), 1129);
});

test('parseTotalContributions throws a clear error when the header is missing', () => {
  assert.throws(() => parseTotalContributions('<html></html>'), /Could not find total contributions/);
});

test('parseContributionDays extracts date + active flag and sorts ascending', () => {
  const days = parseContributionDays(DAYS_FIXTURE);
  assert.deepEqual(days, [
    { date: '2025-07-06', active: true },
    { date: '2025-07-07', active: false },
    { date: '2025-07-08', active: false },
  ]);
});
