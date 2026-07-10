# Space Mission-Control README Signals — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the broken/mismatched third-party GitHub-profile widgets (dead `github-readme-stats` cards, unreadable streak-stats card, generic capsule-render footer) with four custom pixel-art SVGs — Pilot Dossier, Mission Telemetry, Mission Log, Signal Footer — generated live by a Node script and published through the repo's existing GitHub Actions pipeline, matching the space theme of `assets/pixel-banner.svg`.

**Architecture:** A dependency-free Node script (`scripts/generate-signals.mjs`) fetches live GitHub data (contribution calendar HTML for streak/total-contributions, REST API for repo/star/language counts), runs it through pure computation modules (streak calculation, language aggregation), and renders it through pure SVG-template modules built on a shared palette/component kit. The existing `.github/workflows/snake.yaml` (renamed `assets.yaml`) runs this script alongside the existing snake-game generation and publishes everything to the `output` branch in one atomic step, so there's no risk of two workflows racing to publish to the same branch. If any fetch fails, the script exits before writing files, so a bad run can never overwrite the last known-good SVGs.

**Tech Stack:** Node.js 20 (built-in `fetch` and `node:test`, zero npm dependencies), GitHub REST API, GitHub's public contribution-calendar HTML endpoint, GitHub Actions (`actions/checkout`, `actions/setup-node`, existing `Platane/snk` and `crazy-max/ghaction-github-pages` actions).

---

## Reference: verified data shapes

Confirmed live against `https://github.com/users/CaptainAlpha04/contributions` before writing this plan (do not re-derive these from memory — they're copied from a real response):

Total contributions header:
```html
<h2 tabindex="-1" id="js-contribution-activity-description" class="f4 text-normal mb-2">
      1,129
      contributions
        in the last year
    </h2>
```

Per-day calendar cell (attribute order is always `data-date` before `data-level` on `class="ContributionCalendar-day"` cells):
```html
<td tabindex="0" data-ix="2" aria-selected="false" aria-describedby="contribution-graph-legend-level-1" style="width: 10px" data-date="2025-07-20" id="contribution-day-component-0-2" data-level="1" role="gridcell" data-view-component="true" class="ContributionCalendar-day">
```
`data-level="0"` means no contributions that day; `1`–`4` mean some contributions (exact count isn't in this fragment, only the bucketed level — sufficient for streak math since we only need active/inactive per day).

---

### Task 1: Project scaffolding

**Files:**
- Create: `.gitignore`

- [ ] **Step 1: Create `.gitignore`**

```gitignore
dist/
.superpowers/
node_modules/
```

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore generated dist/ and brainstorm scratch dirs"
```

---

### Task 2: Shared SVG kit (palette + reusable components)

**Files:**
- Create: `scripts/lib/svg-kit.mjs`
- Test: `scripts/lib/svg-kit.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// scripts/lib/svg-kit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeXml, panel, barRow, led, svgDocument, PALETTE } from './svg-kit.mjs';

test('escapeXml escapes XML-significant characters', () => {
  assert.equal(escapeXml('A & B <tag> "quoted"'), 'A &amp; B &lt;tag&gt; &quot;quoted&quot;');
});

test('barRow computes a fill width proportional to pct', () => {
  const svg = barRow({ x: 0, y: 0, width: 300, label: 'TEST', pct: 50, color: PALETTE.accent });
  // track starts at x+150, so trackWidth = 300-150 = 150; 50% of 150 = 75
  assert.match(svg, /width="75"/);
});

test('barRow clamps pct to the 0-100 range', () => {
  // Match the fill rect specifically (it's the one with `fill="${color}"` and no `stroke`
  // attribute) — the track rect is always width="150" regardless of clamping, so asserting
  // on width="150" alone wouldn't actually prove clamping happened.
  const over = barRow({ x: 0, y: 0, width: 300, label: 'OVER', pct: 250, color: PALETTE.accent });
  assert.match(over, new RegExp(`width="150" height="14" fill="${PALETTE.accent}"`));
  const under = barRow({ x: 0, y: 0, width: 300, label: 'UNDER', pct: -10, color: PALETTE.accent });
  assert.match(under, new RegExp(`width="0" height="14" fill="${PALETTE.accent}"`));
});

test('panel includes the escaped title and given dimensions', () => {
  const svg = panel({ x: 10, y: 20, width: 400, height: 100, title: 'A & B' });
  assert.match(svg, /A &amp; B/);
  assert.match(svg, /width="400" height="100"/);
});

test('led renders a circle with the given color', () => {
  const svg = led({ x: 5, y: 5, color: '#ff0000' });
  assert.match(svg, /fill="#ff0000"/);
});

test('svgDocument wraps body in a valid svg tag with viewBox', () => {
  const svg = svgDocument({ width: 900, height: 200, body: '<circle r="1"/>' });
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" viewBox="0 0 900 200"/);
  assert.match(svg, /<circle r="1"\/>/);
  assert.match(svg.trim(), /<\/svg>$/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/svg-kit.test.mjs`
Expected: FAIL — `Cannot find module './svg-kit.mjs'`

- [ ] **Step 3: Write the implementation**

```js
// scripts/lib/svg-kit.mjs
export const PALETTE = {
  bgDeep: '#070312',
  bg: '#0a0420',
  bgMid: '#160a30',
  panelBg: '#0a0420',
  track: '#1b0f3d',
  accent: '#7c5cff',
  accentDark: '#2a1a5e',
  border: '#05020e',
  text: '#d9d4ff',
  textBright: '#f5f3ff',
  cyan: '#9be8ff',
  gold: '#ffb454',
  goldBright: '#ffd23f',
};

export function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function panel({ x, y, width, height, title }) {
  return `
    <rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${PALETTE.panelBg}" stroke="${PALETTE.accent}" stroke-width="3"/>
    <line x1="${x + 2}" y1="${y + 2}" x2="${x + width - 2}" y2="${y + 2}" stroke="${PALETTE.accentDark}" stroke-width="2"/>
    <line x1="${x + 2}" y1="${y + 2}" x2="${x + 2}" y2="${y + height - 2}" stroke="${PALETTE.accentDark}" stroke-width="2"/>
    <line x1="${x + width - 2}" y1="${y + 2}" x2="${x + width - 2}" y2="${y + height - 2}" stroke="${PALETTE.border}" stroke-width="2"/>
    <line x1="${x + 2}" y1="${y + height - 2}" x2="${x + width - 2}" y2="${y + height - 2}" stroke="${PALETTE.border}" stroke-width="2"/>
    <text x="${x + 16}" y="${y + 26}" font-family="'Courier New', monospace" font-size="11" letter-spacing="2" fill="${PALETTE.gold}">${escapeXml(title)}</text>
  `;
}

export function barRow({ x, y, width, label, pct, color }) {
  const trackX = x + 150;
  const trackWidth = width - 150;
  const clamped = Math.max(0, Math.min(100, pct));
  const fillWidth = Math.round((trackWidth * clamped) / 100);
  return `
    <text x="${x}" y="${y + 10}" font-family="'Courier New', monospace" font-size="10" fill="${PALETTE.cyan}">${escapeXml(label)}</text>
    <rect x="${trackX}" y="${y}" width="${trackWidth}" height="14" fill="${PALETTE.track}" stroke="${PALETTE.border}" stroke-width="2"/>
    <rect x="${trackX}" y="${y}" width="${fillWidth}" height="14" fill="${color}"/>
  `;
}

export function led({ x, y, color = PALETTE.cyan, delay = 0 }) {
  return `
    <circle cx="${x}" cy="${y}" r="4" fill="${color}">
      <animate attributeName="opacity" values="1;0.25;1" dur="1.4s" begin="${delay}s" repeatCount="indefinite"/>
    </circle>
  `;
}

export function scanlines({ x, y, width, rows, gap }) {
  let lines = '';
  for (let i = 0; i < rows; i++) {
    const ly = y + i * gap;
    lines += `<line x1="${x}" y1="${ly}" x2="${x + width}" y2="${ly}" stroke="${PALETTE.accent}" stroke-opacity="0.06"/>`;
  }
  return lines;
}

export function svgDocument({ width, height, body }) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${PALETTE.bgDeep}"/>
      <stop offset="55%" stop-color="${PALETTE.bgMid}"/>
      <stop offset="100%" stop-color="${PALETTE.bg}"/>
    </linearGradient>
  </defs>
  <rect x="0" y="0" width="${width}" height="${height}" fill="url(#bg)"/>
  ${body}
</svg>`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/svg-kit.test.mjs`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/svg-kit.mjs scripts/lib/svg-kit.test.mjs
git commit -m "feat: add shared pixel-art SVG kit (palette, panel, bar, led helpers)"
```

---

### Task 3: Contribution-calendar HTML parsing

**Files:**
- Create: `scripts/lib/parse-contributions.mjs`
- Test: `scripts/lib/parse-contributions.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// scripts/lib/parse-contributions.test.mjs
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/parse-contributions.test.mjs`
Expected: FAIL — `Cannot find module './parse-contributions.mjs'`

- [ ] **Step 3: Write the implementation**

```js
// scripts/lib/parse-contributions.mjs
export function parseTotalContributions(html) {
  const match = html.match(
    /id="js-contribution-activity-description"[^>]*>\s*([\d,]+)\s*contributions/
  );
  if (!match) {
    throw new Error('Could not find total contributions count in contributions page HTML');
  }
  return Number(match[1].replace(/,/g, ''));
}

export function parseContributionDays(html) {
  const dayRegex = /data-date="(\d{4}-\d{2}-\d{2})"[^>]*?data-level="(\d)"/g;
  const days = [];
  let match;
  while ((match = dayRegex.exec(html)) !== null) {
    days.push({ date: match[1], active: Number(match[2]) > 0 });
  }
  days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return days;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/parse-contributions.test.mjs`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/parse-contributions.mjs scripts/lib/parse-contributions.test.mjs
git commit -m "feat: parse total contributions and per-day activity from GitHub's contributions HTML"
```

---

### Task 4: Streak computation

**Files:**
- Create: `scripts/lib/streak.mjs`
- Test: `scripts/lib/streak.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// scripts/lib/streak.test.mjs
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/streak.test.mjs`
Expected: FAIL — `Cannot find module './streak.mjs'`

- [ ] **Step 3: Write the implementation**

```js
// scripts/lib/streak.mjs
export function computeStreaks(days) {
  const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let longest = 0;
  let running = 0;
  for (const day of sorted) {
    if (day.active) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  let current = 0;
  let i = sorted.length - 1;
  if (i >= 0 && !sorted[i].active) {
    i -= 1; // most recent day (today) hasn't happened yet — don't let it break the streak
  }
  while (i >= 0 && sorted[i].active) {
    current += 1;
    i -= 1;
  }

  return { current, longest };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/streak.test.mjs`
Expected: PASS (6 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/streak.mjs scripts/lib/streak.test.mjs
git commit -m "feat: compute current and longest streak from daily contribution activity"
```

---

### Task 5: Language aggregation

**Files:**
- Create: `scripts/lib/languages.mjs`
- Test: `scripts/lib/languages.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// scripts/lib/languages.test.mjs
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/languages.test.mjs`
Expected: FAIL — `Cannot find module './languages.mjs'`

- [ ] **Step 3: Write the implementation**

```js
// scripts/lib/languages.mjs
export function aggregateLanguages(perRepoLanguages) {
  const totals = {};
  for (const repoLanguages of perRepoLanguages) {
    for (const [name, bytes] of Object.entries(repoLanguages)) {
      totals[name] = (totals[name] ?? 0) + bytes;
    }
  }
  return totals;
}

export function topLanguages(totals, n = 3) {
  const grandTotal = Object.values(totals).reduce((sum, bytes) => sum + bytes, 0);
  if (grandTotal === 0) return [];

  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, bytes]) => ({
      name,
      bytes,
      pct: Math.round((bytes / grandTotal) * 1000) / 10,
    }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/languages.test.mjs`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/languages.mjs scripts/lib/languages.test.mjs
git commit -m "feat: aggregate per-repo language bytes into top-N percentages"
```

---

### Task 6: GitHub data fetching (I/O boundary — manually verified, not unit tested)

This module only wraps network calls; there's no branching logic worth unit-testing in isolation, and mocking `fetch` would mean adding a dependency we've deliberately avoided. It's verified manually in Task 11 once wired into the full script.

**Files:**
- Create: `scripts/lib/github-data.mjs`

- [ ] **Step 1: Write the implementation**

```js
// scripts/lib/github-data.mjs
const USER_AGENT = 'captainalpha04-signals-script';

export async function fetchContributionsHtml(username) {
  const res = await fetch(`https://github.com/users/${username}/contributions`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch contributions page: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

async function githubApi(path, token) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API request failed for ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchRepoStats(username, token) {
  let repos = [];
  let page = 1;
  for (;;) {
    const batch = await githubApi(`/users/${username}/repos?per_page=100&page=${page}&type=owner`, token);
    repos = repos.concat(batch);
    if (batch.length < 100) break;
    page += 1;
  }

  const ownRepos = repos.filter((repo) => !repo.fork);
  const starCount = ownRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);

  const perRepoLanguages = [];
  for (const repo of ownRepos) {
    const languages = await githubApi(`/repos/${username}/${repo.name}/languages`, token);
    perRepoLanguages.push(languages);
  }

  return { repoCount: ownRepos.length, starCount, perRepoLanguages };
}
```

- [ ] **Step 2: Commit**

```bash
git add scripts/lib/github-data.mjs
git commit -m "feat: fetch live repo/star/language stats and contribution HTML from GitHub"
```

---

### Task 7: Pilot Dossier template

**Files:**
- Create: `scripts/lib/templates/pilot-dossier.mjs`
- Test: `scripts/lib/templates/pilot-dossier.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// scripts/lib/templates/pilot-dossier.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderPilotDossier } from './pilot-dossier.mjs';

test('renders a valid svg document with callsign and all skill labels', () => {
  const svg = renderPilotDossier();
  assert.match(svg, /^<svg /);
  assert.match(svg.trim(), /<\/svg>$/);
  assert.match(svg, /CALLSIGN: CAPTAIN ALPHA04/);
  assert.match(svg, /NAV \/ AGENTIC SYS/);
  assert.match(svg, /HULL \/ ARCHITECTURE/);
  assert.match(svg, /THRUSTERS \/ FULL-STACK/);
  assert.match(svg, /SENSORS \/ HAR RESEARCH/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/templates/pilot-dossier.test.mjs`
Expected: FAIL — `Cannot find module './pilot-dossier.mjs'`

- [ ] **Step 3: Write the implementation**

```js
// scripts/lib/templates/pilot-dossier.mjs
import { svgDocument, panel, barRow, PALETTE } from '../svg-kit.mjs';

const SKILLS = [
  { label: 'NAV / AGENTIC SYS', pct: 92, color: PALETTE.accent },
  { label: 'HULL / ARCHITECTURE', pct: 88, color: PALETTE.cyan },
  { label: 'THRUSTERS / FULL-STACK', pct: 95, color: PALETTE.gold },
  { label: 'SENSORS / HAR RESEARCH', pct: 70, color: PALETTE.accent },
];

function astronaut(x, y) {
  return `
    <g transform="translate(${x},${y})">
      <circle cx="0" cy="0" r="16" fill="${PALETTE.text}"/>
      <circle cx="0" cy="0" r="11" fill="${PALETTE.bg}" stroke="${PALETTE.cyan}" stroke-width="2"/>
      <circle cx="-3" cy="-2" r="2.4" fill="${PALETTE.cyan}">
        <animate attributeName="opacity" values="1;0.1;1" dur="3.2s" repeatCount="indefinite"/>
      </circle>
      <rect x="-14" y="14" width="28" height="26" rx="4" fill="${PALETTE.accent}"/>
      <rect x="-20" y="16" width="8" height="18" rx="3" fill="${PALETTE.text}"/>
      <rect x="12" y="16" width="8" height="18" rx="3" fill="${PALETTE.text}"/>
      <rect x="-9" y="40" width="8" height="14" fill="${PALETTE.textBright}"/>
      <rect x="1" y="40" width="8" height="14" fill="${PALETTE.textBright}"/>
    </g>
  `;
}

export function renderPilotDossier() {
  const width = 900;
  const height = 230;

  let body = panel({ x: 10, y: 10, width: width - 20, height: height - 20, title: '> cat /crew/pilot_dossier.log' });
  body += `<text x="30" y="66" font-family="'Courier New', monospace" font-size="20" font-weight="700" fill="${PALETTE.textBright}">CALLSIGN: CAPTAIN ALPHA04</text>`;
  body += `<text x="30" y="88" font-family="'Courier New', monospace" font-size="13" fill="${PALETTE.accent}">ROLE: AI-NATIVE SYSTEMS ARCHITECT &#183; CLEARANCE LV.23</text>`;

  SKILLS.forEach((skill, i) => {
    body += barRow({ x: 30, y: 112 + i * 24, width: 560, label: skill.label, pct: skill.pct, color: skill.color });
  });

  body += astronaut(width - 110, height / 2 + 10);

  return svgDocument({ width, height, body });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/templates/pilot-dossier.test.mjs`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/templates/pilot-dossier.mjs scripts/lib/templates/pilot-dossier.test.mjs
git commit -m "feat: render Pilot Dossier SVG (callsign, skill bars, pixel astronaut)"
```

---

### Task 8: Mission Telemetry template

**Files:**
- Create: `scripts/lib/templates/mission-telemetry.mjs`
- Test: `scripts/lib/templates/mission-telemetry.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// scripts/lib/templates/mission-telemetry.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMissionTelemetry } from './mission-telemetry.mjs';

test('renders live values and top languages into the svg', () => {
  const svg = renderMissionTelemetry({
    streakCurrent: 41,
    totalContributions: 1129,
    repoCount: 37,
    starCount: 212,
    topLangs: [
      { name: 'TypeScript', pct: 80 },
      { name: 'Python', pct: 15 },
    ],
  });
  assert.match(svg, /^<svg /);
  assert.match(svg.trim(), /<\/svg>$/);
  assert.match(svg, />41</);
  assert.match(svg, />1,129</);
  assert.match(svg, />37</);
  assert.match(svg, />212</);
  assert.match(svg, /TypeScript \(80%\)/);
  assert.match(svg, /Python \(15%\)/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/templates/mission-telemetry.test.mjs`
Expected: FAIL — `Cannot find module './mission-telemetry.mjs'`

- [ ] **Step 3: Write the implementation**

```js
// scripts/lib/templates/mission-telemetry.mjs
import { svgDocument, panel, barRow, led, PALETTE } from '../svg-kit.mjs';

export function renderMissionTelemetry({ streakCurrent, totalContributions, repoCount, starCount, topLangs }) {
  const width = 900;
  const height = 260;

  let body = panel({ x: 10, y: 10, width: width - 20, height: height - 20, title: '> transmission_feed --live' });

  const rows = [
    ['DAYS IN ORBIT', `${streakCurrent}`],
    ['TRANSMISSIONS SENT', totalContributions.toLocaleString('en-US')],
    ['VESSELS DEPLOYED', `${repoCount}`],
    ['STELLAR ACKS', starCount.toLocaleString('en-US')],
  ];

  rows.forEach(([label, value], i) => {
    const y = 60 + i * 26;
    body += led({ x: 34, y: y - 4, delay: i * 0.2 });
    body += `<text x="50" y="${y}" font-family="'Courier New', monospace" font-size="12" fill="${PALETTE.text}">${label}</text>`;
    body += `<text x="${width - 40}" y="${y}" text-anchor="end" font-family="'Courier New', monospace" font-size="12" fill="${PALETTE.cyan}">${value}</text>`;
  });

  body += `<text x="30" y="192" font-family="'Courier New', monospace" font-size="10" letter-spacing="2" fill="${PALETTE.cyan}">FUEL MIX</text>`;

  const colors = [PALETTE.accent, PALETTE.cyan, PALETTE.gold];
  topLangs.forEach((lang, i) => {
    body += barRow({
      x: 30,
      y: 206 + i * 22,
      width: 560,
      label: `${lang.name} (${lang.pct}%)`,
      pct: lang.pct,
      color: colors[i % colors.length],
    });
  });

  return svgDocument({ width, height, body });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/templates/mission-telemetry.test.mjs`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/templates/mission-telemetry.mjs scripts/lib/templates/mission-telemetry.test.mjs
git commit -m "feat: render Mission Telemetry SVG (live streak/commits/repos/stars/languages)"
```

---

### Task 9: Mission Log template

**Files:**
- Create: `scripts/lib/templates/mission-log.mjs`
- Test: `scripts/lib/templates/mission-log.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// scripts/lib/templates/mission-log.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderMissionLog } from './mission-log.mjs';

test('renders all 5 mission log entries with no company names', () => {
  const svg = renderMissionLog();
  assert.match(svg, /^<svg /);
  assert.match(svg.trim(), /<\/svg>$/);
  assert.match(svg, /\[LOG 001\]/);
  assert.match(svg, /\$100K\+ revenue within 90 days/);
  assert.match(svg, /\[LOG 002\]/);
  assert.match(svg, /x3 ventures/);
  assert.match(svg, /\[LOG 003\]/);
  assert.match(svg, /golem-graph/);
  assert.match(svg, /\[LOG 004\]/);
  assert.match(svg, /100\+ parallel agents/);
  assert.match(svg, /\[LOG 005\]/);
  assert.match(svg, /Google Gemini/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/templates/mission-log.test.mjs`
Expected: FAIL — `Cannot find module './mission-log.mjs'`

- [ ] **Step 3: Write the implementation**

```js
// scripts/lib/templates/mission-log.mjs
import { svgDocument, panel, PALETTE, escapeXml } from '../svg-kit.mjs';

const ENTRIES = [
  '[LOG 001] Shipped product -> $100K+ revenue within 90 days of launch',
  '[LOG 002] Built from zero x3 ventures, solo founding engineer each time',
  '[LOG 003] Published golem-graph to the npm registry',
  '[LOG 004] Simulated 100+ parallel agents modeling live market dynamics',
  '[LOG 005] Multi-agent framework featured on Google Gemini',
];

export function renderMissionLog() {
  const width = 900;
  const height = 220;

  let body = panel({ x: 10, y: 10, width: width - 20, height: height - 20, title: '> cat /var/log/mission.log' });

  ENTRIES.forEach((entry, i) => {
    body += `<text x="30" y="${64 + i * 28}" font-family="'Courier New', monospace" font-size="12" fill="${PALETTE.text}">${escapeXml(entry)}</text>`;
  });

  return svgDocument({ width, height, body });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/templates/mission-log.test.mjs`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/templates/mission-log.mjs scripts/lib/templates/mission-log.test.mjs
git commit -m "feat: render Mission Log SVG (achievements as dated log entries)"
```

---

### Task 10: Signal Footer template

**Files:**
- Create: `scripts/lib/templates/signal-footer.mjs`
- Test: `scripts/lib/templates/signal-footer.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// scripts/lib/templates/signal-footer.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { renderSignalFooter } from './signal-footer.mjs';

test('renders the carrier-signal sign-off message', () => {
  const svg = renderSignalFooter();
  assert.match(svg, /^<svg /);
  assert.match(svg.trim(), /<\/svg>$/);
  assert.match(svg, /CARRIER SIGNAL LOCKED/);
  assert.match(svg, /transmission ends, orbit continues/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test scripts/lib/templates/signal-footer.test.mjs`
Expected: FAIL — `Cannot find module './signal-footer.mjs'`

- [ ] **Step 3: Write the implementation**

```js
// scripts/lib/templates/signal-footer.mjs
import { svgDocument, PALETTE, led } from '../svg-kit.mjs';

export function renderSignalFooter() {
  const width = 900;
  const height = 140;

  let body = `<text x="450" y="55" text-anchor="middle" font-family="'Courier New', monospace" font-size="16" letter-spacing="3" fill="${PALETTE.gold}">&#9670; CARRIER SIGNAL LOCKED &#9670;</text>`;
  body += led({ x: 400, y: 50, delay: 0 });
  body += led({ x: 450, y: 50, delay: 0.2 });
  body += led({ x: 500, y: 50, delay: 0.4 });
  body += `<text x="450" y="90" text-anchor="middle" font-family="'Courier New', monospace" font-size="12" fill="${PALETTE.cyan}">transmission ends, orbit continues -- thanks for reading, captain</text>`;

  return svgDocument({ width, height, body });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test scripts/lib/templates/signal-footer.test.mjs`
Expected: PASS (1 test)

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/templates/signal-footer.mjs scripts/lib/templates/signal-footer.test.mjs
git commit -m "feat: render Signal Footer SVG (replaces capsule-render wave)"
```

---

### Task 11: Orchestrator script

**Files:**
- Create: `scripts/generate-signals.mjs`

- [ ] **Step 1: Write the implementation**

```js
// scripts/generate-signals.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { fetchContributionsHtml, fetchRepoStats } from './lib/github-data.mjs';
import { parseTotalContributions, parseContributionDays } from './lib/parse-contributions.mjs';
import { computeStreaks } from './lib/streak.mjs';
import { aggregateLanguages, topLanguages } from './lib/languages.mjs';
import { renderPilotDossier } from './lib/templates/pilot-dossier.mjs';
import { renderMissionTelemetry } from './lib/templates/mission-telemetry.mjs';
import { renderMissionLog } from './lib/templates/mission-log.mjs';
import { renderSignalFooter } from './lib/templates/signal-footer.mjs';

const USERNAME = 'CaptainAlpha04';
const OUT_DIR = 'dist';

async function main() {
  const token = process.env.GITHUB_TOKEN;

  // 1. Fetch + compute — nothing is written to disk until every one of these succeeds.
  const contributionsHtml = await fetchContributionsHtml(USERNAME);
  const totalContributions = parseTotalContributions(contributionsHtml);
  const days = parseContributionDays(contributionsHtml);
  const { current: streakCurrent } = computeStreaks(days);

  const { repoCount, starCount, perRepoLanguages } = await fetchRepoStats(USERNAME, token);
  const languageTotals = aggregateLanguages(perRepoLanguages);
  const topLangs = topLanguages(languageTotals, 3);

  // 2. Render
  const files = {
    'pilot-dossier.svg': renderPilotDossier(),
    'mission-telemetry.svg': renderMissionTelemetry({
      streakCurrent,
      totalContributions,
      repoCount,
      starCount,
      topLangs,
    }),
    'mission-log.svg': renderMissionLog(),
    'signal-footer.svg': renderSignalFooter(),
  };

  // 3. Write — only reached if every fetch above succeeded.
  await mkdir(OUT_DIR, { recursive: true });
  await Promise.all(
    Object.entries(files).map(([name, contents]) => writeFile(`${OUT_DIR}/${name}`, contents, 'utf8'))
  );

  console.log(`Wrote ${Object.keys(files).length} signal SVGs to ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error('Signal generation failed:', err.message);
  process.exit(1);
});
```

- [ ] **Step 2: Manually verify a successful run**

Run: `node scripts/generate-signals.mjs` (from the repo root; `GITHUB_TOKEN` is optional locally — omitting it just uses the lower unauthenticated rate limit)
Expected: prints `Wrote 4 signal SVGs to dist/`, and `dist/pilot-dossier.svg`, `dist/mission-telemetry.svg`, `dist/mission-log.svg`, `dist/signal-footer.svg` all exist and open correctly in a browser.

- [ ] **Step 3: Manually verify a failed run writes nothing**

Run: `rm -rf dist && node -e "process.env.GITHUB_TOKEN=''; import('./scripts/lib/github-data.mjs').then(m => m.fetchContributionsHtml('this-user-should-not-exist-hopefully-xyz')).catch(e => { console.error(e.message); process.exit(1) })"`
Expected: non-zero exit, `dist/` is not created (confirms the real script's `main()` won't reach the write step on a fetch failure, since `fetchContributionsHtml`/`fetchRepoStats` throw before any `writeFile` call).

- [ ] **Step 4: Commit**

```bash
git add scripts/generate-signals.mjs
git commit -m "feat: add orchestrator script that generates all 4 signal SVGs into dist/"
```

---

### Task 12: GitHub Actions workflow

**Files:**
- Create: `.github/workflows/assets.yaml`
- Delete: `.github/workflows/snake.yaml` (replaced by the above — same job, same snake step, unchanged)

- [ ] **Step 1: Create the new workflow file**

```yaml
# .github/workflows/assets.yaml
name: generate assets

on:
  schedule:
    - cron: "0 0 * * *"
  workflow_dispatch: {}
  push:
    branches: [ main ]

jobs:
  generate:
    permissions:
      contents: write
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: Platane/snk@v3
        id: snake
        with:
          github_user_name: CaptainAlpha04
          outputs: |
            dist/github-contribution-grid-snake.svg
            dist/github-contribution-grid-snake-dark.svg?palette=github-dark

      - uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Generate signal SVGs
        run: node scripts/generate-signals.mjs
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

      - uses: crazy-max/ghaction-github-pages@v4
        with:
          target_branch: output
          build_dir: dist
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Note the only functional additions versus the old `snake.yaml` are: `actions/checkout@v4` (needed so `scripts/` exists on the runner — the old workflow never checked out the repo because `Platane/snk` didn't need it), `actions/setup-node@v4`, and the "Generate signal SVGs" step. The snake step and the publish step are byte-for-byte the same as before, per your request to keep the snake exactly as-is.

- [ ] **Step 2: Remove the old workflow file**

```bash
git rm .github/workflows/snake.yaml
```

- [ ] **Step 3: Stage and commit**

```bash
git add .github/workflows/assets.yaml
git commit -m "ci: extend snake workflow to also generate and publish signal SVGs"
```

---

### Task 13: README.md updates

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the "Signal" section and add the three new sections, in this order: Pilot Dossier (after `whoami`), Mission Telemetry + Mission Log (replacing the old Signal section), Signal Footer (replacing the capsule-render footer)**

Remove these existing blocks:
```markdown
### 📊 Signal

<div align="center">
<img height="165em" src="https://github-readme-stats.vercel.app/api?username=CaptainAlpha04&show_icons=true&hide_border=true&theme=radical&bg_color=0a0420&title_color=7c5cff&icon_color=9be8ff&text_color=d9d4ff"/>
<img height="165em" src="https://github-readme-stats.vercel.app/api/top-langs/?username=CaptainAlpha04&layout=compact&hide_border=true&theme=radical&bg_color=0a0420&title_color=7c5cff&text_color=d9d4ff"/>
</div>

<div align="center">
<img src="https://github-readme-streak-stats.herokuapp.com/?user=CaptainAlpha04&hide_border=true&background=0a0420&ring=7c5cff&fire=ffb454&currStreakLabel=d9d4ff"/>
</div>
```
and
```markdown
<div align="center">
<img src="https://capsule-render.vercel.app/api?type=waving&color=0:0a0420,100:1b0f3d&height=90&section=footer"/>
</div>
```

Insert a Pilot Dossier section directly after the `whoami` code block (before `### ⚙️ Stack`):
```markdown
### 🧑‍🚀 Pilot Dossier

<div align="center">
<img src="https://github.com/CaptainAlpha04/captainalpha04/blob/output/pilot-dossier.svg" width="100%" alt="pilot dossier"/>
</div>

<br/>
```

Insert Mission Telemetry + Mission Log where the old "Signal" section was (after "Wired into", before the Snake section):
```markdown
### 📡 Mission Telemetry

<div align="center">
<img src="https://github.com/CaptainAlpha04/captainalpha04/blob/output/mission-telemetry.svg" width="100%" alt="mission telemetry"/>
</div>

<br/>

### 🛰️ Mission Log

<div align="center">
<img src="https://github.com/CaptainAlpha04/captainalpha04/blob/output/mission-log.svg" width="100%" alt="mission log"/>
</div>

<br/>
```

Replace the old footer with:
```markdown
<div align="center">
<img src="https://github.com/CaptainAlpha04/captainalpha04/blob/output/signal-footer.svg" width="100%" alt="signal footer"/>
</div>
```

- [ ] **Step 2: Read the full file back and confirm the final section order top-to-bottom is:** banner → badges → `whoami` → Pilot Dossier → Stack → Wired into → Mission Telemetry → Mission Log → Snake → Signal Footer.

- [ ] **Step 3: Commit**

```bash
git add README.md
git commit -m "docs: replace broken/mismatched widgets with space mission-control SVG sections"
```

---

### Task 14: Push and verify on GitHub (requires your go-ahead)

This is the one task with real-world, visible-to-others side effects — pushing to `main` and triggering a workflow run that writes to the `output` branch. Do not run this until you've reviewed everything above.

- [ ] **Step 1: Push `main`**

```bash
git push origin main
```

- [ ] **Step 2: Watch the workflow run**

```bash
gh run watch
```

Expected: the `generate assets` workflow completes successfully; the `output` branch now contains 6 SVGs (2 snake + 4 new signal cards).

- [ ] **Step 3: View the rendered README on github.com/CaptainAlpha04/CaptainAlpha04**

Confirm all 4 new SVGs render (GitHub's SVG sanitizer is the one thing that can't be checked locally — this is the real test), the astronaut's visor blinks, the LEDs pulse, and no section shows a broken-image icon.
