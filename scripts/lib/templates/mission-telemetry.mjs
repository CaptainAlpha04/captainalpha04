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
