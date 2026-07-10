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
