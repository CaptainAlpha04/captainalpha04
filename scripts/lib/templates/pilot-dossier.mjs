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
