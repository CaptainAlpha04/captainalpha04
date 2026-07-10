import { mkdir, writeFile } from 'node:fs/promises';
import { fetchContributionsHtml, fetchRepoStats } from './lib/github-data.mjs';
import { parseTotalContributions, parseContributionDays } from './lib/parse-contributions.mjs';
import { computeStreaks } from './lib/streak.mjs';
import { aggregateLanguages, topLanguages } from './lib/languages.mjs';
import { renderPilotDossier } from './lib/templates/pilot-dossier.mjs';
import { renderMissionTelemetry } from './lib/templates/mission-telemetry.mjs';
import { renderMissionLog } from './lib/templates/mission-log.mjs';
import { renderSignalFooter } from './lib/templates/signal-footer.mjs';

const USERNAME = 'CaptainAlpha04';
const OUT_DIR = 'dist';

async function main() {
  const token = process.env.GITHUB_TOKEN;

  // 1. Fetch + compute — nothing is written to disk until every one of these succeeds.
  const contributionsHtml = await fetchContributionsHtml(USERNAME);
  const totalContributions = parseTotalContributions(contributionsHtml);
  const days = parseContributionDays(contributionsHtml);
  const { current: streakCurrent } = computeStreaks(days);

  const { repoCount, starCount, perRepoLanguages } = await fetchRepoStats(USERNAME, token);
  const languageTotals = aggregateLanguages(perRepoLanguages);
  const topLangs = topLanguages(languageTotals, 3);

  // 2. Render
  const files = {
    'pilot-dossier.svg': renderPilotDossier(),
    'mission-telemetry.svg': renderMissionTelemetry({
      streakCurrent,
      totalContributions,
      repoCount,
      starCount,
      topLangs,
    }),
    'mission-log.svg': renderMissionLog(),
    'signal-footer.svg': renderSignalFooter(),
  };

  // 3. Write — only reached if every fetch above succeeded.
  await mkdir(OUT_DIR, { recursive: true });
  await Promise.all(
    Object.entries(files).map(([name, contents]) => writeFile(`${OUT_DIR}/${name}`, contents, 'utf8'))
  );

  console.log(`Wrote ${Object.keys(files).length} signal SVGs to ${OUT_DIR}/`);
}

main().catch((err) => {
  console.error('Signal generation failed:', err.message);
  process.exit(1);
});
