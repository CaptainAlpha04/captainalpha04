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
