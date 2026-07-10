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
