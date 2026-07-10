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
