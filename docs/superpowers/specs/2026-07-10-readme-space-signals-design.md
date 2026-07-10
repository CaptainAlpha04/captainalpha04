# GitHub Profile README — Space Mission-Control Signals Redesign

Date: 2026-07-10

## Problem

The profile README's "Signal" section is broken and off-theme:

- `github-readme-stats.vercel.app` (stats card + top-languages card) returns `503 DEPLOYMENT_PAUSED` — that public instance has been shut down. It will not come back; any card served from it is permanently dead.
- `github-readme-streak-stats.herokuapp.com` still renders, but its foreground and background colors collide (unreadable text).
- The footer (`capsule-render` waving gradient) and the stat cards look like generic stock GitHub-profile widgets, mismatched against the custom animated pixel-art space banner (`assets/pixel-banner.svg`) already at the top of the README.

## Goal

Replace all third-party stat widgets with custom-generated pixel-art SVGs that:

1. Never depend on a third-party rendering service (eliminates the recurring breakage).
2. Extend one continuous "mission control / signal from orbit" visual narrative that matches the existing banner (moon, stars, rocket, CRT scanlines, purple/void palette) and plays on the GitHub handle `CaptainAlpha04`.
3. Surface real CV substance (skills, shipped outcomes, published package, agent work) as in-universe game/mission content — no company names, ever.
4. Stay live: stats (streak, commits, repos, stars, top languages) are pulled fresh on a schedule, not hand-typed.

## Non-goals

- No interactivity/JS — GitHub renders READMEs as static Markdown; everything is a static (optionally SMIL-animated) SVG image.
- No dark/light theme variants — the whole README already commits to one fixed dark-purple palette regardless of the visitor's GitHub theme, same as today's banner.
- No change to the Snake contribution-graph section — it already fits the theme and works.

## Architecture

### One script, four SVGs

`scripts/generate-signals.mjs` — a dependency-free Node script (ESM, uses Node's built-in `fetch`; no `npm install` step needed in CI) that:

1. Fetches live data:
   - **Stars / repos / top languages**: GitHub REST API, `GET /users/{user}/repos` (paginated) and `GET /repos/{owner}/{repo}/languages` per repo, summed by bytes. Authenticated with the workflow's automatic `GITHUB_TOKEN` (raises rate limit to 5000/hr; no PAT/secret required since this is all public data).
   - **Contribution streak**: GitHub's public contribution-calendar HTML fragment at `https://github.com/users/{user}/contributions`, parsed with a regex over `data-date="YYYY-MM-DD" data-level="N"` table-cell attributes to reconstruct the daily contribution list, from which current streak and longest streak are computed locally. No auth needed — this is the same technique most third-party streak-stat tools use internally.
2. Renders 4 SVG files as template strings (same hand-rolled approach as `assets/pixel-banner.svg` — no headless browser, no charting library):
   - `pilot-dossier.svg`
   - `mission-telemetry.svg`
   - `mission-log.svg`
   - `signal-footer.svg`
3. Writes them to `dist/`.

If any fetch/parse step fails (rate limit, GitHub changing the contributions HTML shape, network error), the script logs the error and exits non-zero **before writing any files**. This is the key fix for the original failure mode: a bad run must never overwrite the previous, known-good SVGs.

### Static vs. live content

- **Live** (re-fetched every run): streak, commit count, repo count, star count, top-language byte proportions.
- **Static constants at the top of the script** (hand-authored from the CV, edited manually when they change): Pilot Dossier's skill-bar labels/values and callsign/role text; Mission Log's 5 log-entry strings. These are not available from any API and don't change often enough to justify scraping the CV.

### Workflow integration

Extend the *existing* `.github/workflows/snake.yaml` — rename to `.github/workflows/assets.yaml` — rather than add a second workflow. Reasoning: its publish step (`crazy-max/ghaction-github-pages@v4`) replaces the entire `output` branch content from the `dist/` directory. A second, independently-triggered workflow publishing to the same branch would race and could wipe the other's files. One workflow now:

1. Checks out the repo.
2. Runs `Platane/snk@v3` (unchanged) → writes snake SVGs into `dist/`.
3. Sets up Node 20 and runs `node scripts/generate-signals.mjs` → writes the 4 signal SVGs into the same `dist/`.
4. Publishes `dist/` to the `output` branch (unchanged action/config).

Triggers unchanged: daily cron (`0 0 * * *`), `workflow_dispatch`, and `push` to `main`.

### Visual language (shared across all 4 new SVGs + reused from the banner)

- Palette: `#070312` / `#0a0420` / `#160a30` (backgrounds), `#7c5cff` (primary accent/borders), `#d9d4ff` / `#f5f3ff` (text), `#9be8ff` (secondary/cyan), `#ffb454` / `#ffd23f` (gold highlights). No new colors introduced.
- Font: `'Courier New', monospace` only — same as the banner. No embedded/external pixel fonts (e.g. Google Fonts), since GitHub's SVG sanitizer/camo proxy does not reliably load external font requests; monospace + letter-spacing is what the existing banner already uses successfully.
- "Pixel" texture achieved the same way the banner achieves it: hard-edged rects/polygons, repeating-block gradients for bar fills, CRT scanline strokes, SMIL `<animate>`/`<animateTransform>` for subtle motion (blinking LEDs, pulsing signal dots) — no raster images, no external assets.
- A small pixel-art astronaut sprite (blocky rects/polygons, matching the rocket's construction style in the banner) appears in the Pilot Dossier card as an optional mascot, with a subtle idle animation (visor-light blink). Non-mandatory flourish — first candidate to cut if it clutters the card.

## Card designs

### 1. Pilot Dossier (`pilot-dossier.svg`)

Replaces nothing directly (new section) — sits right after the `whoami` terminal block.

- Header line: `> cat /crew/pilot_dossier.log`
- `CALLSIGN: CAPTAIN ALPHA04` / `ROLE: AI-Native Systems Architect · CLEARANCE LV.23`
- 4 stat bars framed as ship subsystems, static values from the CV skillset:
  - `NAV / AGENTIC SYS`
  - `HULL / ARCHITECTURE`
  - `THRUSTERS / FULL-STACK`
  - `SENSORS / HAR RESEARCH`
- Small pixel astronaut sprite alongside.

### 2. Mission Telemetry (`mission-telemetry.svg`)

Replaces both `github-readme-stats` cards and the streak-stats card.

- Header line: `> transmission_feed --live`
- 4 live readout rows with a pulsing LED marker each: `DAYS IN ORBIT` (streak), `TRANSMISSIONS SENT` (commits), `VESSELS DEPLOYED` (repos), `STELLAR ACKS` (stars).
- `FUEL MIX` sub-section: top 3 languages as pixel bar chart (live byte-proportions).

### 3. Mission Log (`mission-log.svg`)

New section, placed after Mission Telemetry.

- Header line: `> cat /var/log/mission.log`
- 5 static log lines (`[LOG 001]`…`[LOG 005]`), each one CV achievement reframed as mission fiction, no company names:
  1. Shipped product → $100K+ revenue within 90 days of launch
  2. Built from zero ×3 ventures, solo founding engineer each time
  3. Published `golem-graph` to the npm registry
  4. Simulated 100+ parallel agents modeling live market dynamics
  5. Multi-agent framework featured on Google Gemini

### 4. Signal Footer (`signal-footer.svg`)

Replaces the `capsule-render` waving-gradient footer at the very bottom.

- `◈ CARRIER SIGNAL ● ● ● LOCKED ◈` with pulsing signal dots.
- `— transmission ends, orbit continues — thanks for reading, captain —`
- Pixel star-field / horizon consistent with the banner background.

## README section order (final)

1. Banner (unchanged)
2. `whoami` terminal block (unchanged)
3. **Pilot Dossier** (new)
4. Stack badges (unchanged)
5. "Wired into" (unchanged)
6. **Mission Telemetry** (replaces Signal section's stats/top-langs/streak cards)
7. **Mission Log** (new)
8. Snake (unchanged)
9. **Signal Footer** (replaces capsule-render footer)

## Testing / verification

- Run `node scripts/generate-signals.mjs` locally (or via `workflow_dispatch`) and visually inspect the 4 output SVGs open directly in a browser before merging.
- Confirm the workflow's publish step still succeeds and the `output` branch contains all 6 SVGs (2 snake + 4 signal) after a run.
- Confirm the README renders correctly on github.com (not just locally) since GitHub's SVG sanitizer is the real constraint — particularly the SMIL animations and any bar-fill gradients.
- Deliberately break one data fetch (e.g. temporarily point at a nonexistent username) and confirm the script exits non-zero and `dist/` is left empty/unwritten — proving a failed run can't clobber the last good `output` branch state.

## Open questions

None outstanding — direction, content, and layout are confirmed. Exact pixel numbers/positions within each SVG are an implementation detail for the build step, not a design decision.
