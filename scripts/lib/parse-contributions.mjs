export function parseTotalContributions(html) {
  const match = html.match(
    /id="js-contribution-activity-description"[^>]*>\s*([\d,]+)\s*contributions/
  );
  if (!match) {
    throw new Error('Could not find total contributions count in contributions page HTML');
  }
  return Number(match[1].replace(/,/g, ''));
}

export function parseContributionDays(html) {
  const dayRegex = /data-date="(\d{4}-\d{2}-\d{2})"[^>]*?data-level="(\d)"/g;
  const days = [];
  let match;
  while ((match = dayRegex.exec(html)) !== null) {
    days.push({ date: match[1], active: Number(match[2]) > 0 });
  }
  days.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
  return days;
}
