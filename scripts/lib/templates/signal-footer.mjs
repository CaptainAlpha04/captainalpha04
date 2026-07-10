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
