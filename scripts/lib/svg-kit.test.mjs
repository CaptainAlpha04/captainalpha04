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
