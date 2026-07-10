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
