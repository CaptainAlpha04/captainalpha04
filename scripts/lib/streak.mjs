export function computeStreaks(days) {
  const sorted = [...days].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

  let longest = 0;
  let running = 0;
  for (const day of sorted) {
    if (day.active) {
      running += 1;
      longest = Math.max(longest, running);
    } else {
      running = 0;
    }
  }

  let current = 0;
  let i = sorted.length - 1;
  if (i >= 0 && !sorted[i].active) {
    i -= 1; // most recent day (today) hasn't happened yet — don't let it break the streak
  }
  while (i >= 0 && sorted[i].active) {
    current += 1;
    i -= 1;
  }

  return { current, longest };
}
