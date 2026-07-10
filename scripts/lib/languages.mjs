export function aggregateLanguages(perRepoLanguages) {
  const totals = {};
  for (const repoLanguages of perRepoLanguages) {
    for (const [name, bytes] of Object.entries(repoLanguages)) {
      totals[name] = (totals[name] ?? 0) + bytes;
    }
  }
  return totals;
}

export function topLanguages(totals, n = 3) {
  const grandTotal = Object.values(totals).reduce((sum, bytes) => sum + bytes, 0);
  if (grandTotal === 0) return [];

  return Object.entries(totals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([name, bytes]) => ({
      name,
      bytes,
      pct: Math.round((bytes / grandTotal) * 1000) / 10,
    }));
}
