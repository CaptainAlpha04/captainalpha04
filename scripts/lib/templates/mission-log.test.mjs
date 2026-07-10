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
