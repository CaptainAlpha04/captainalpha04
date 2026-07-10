const USER_AGENT = 'captainalpha04-signals-script';

export async function fetchContributionsHtml(username) {
  const res = await fetch(`https://github.com/users/${username}/contributions`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch contributions page: ${res.status} ${res.statusText}`);
  }
  return res.text();
}

async function githubApi(path, token) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/vnd.github+json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    throw new Error(`GitHub API request failed for ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

export async function fetchRepoStats(username, token) {
  let repos = [];
  let page = 1;
  for (;;) {
    const batch = await githubApi(`/users/${username}/repos?per_page=100&page=${page}&type=owner`, token);
    repos = repos.concat(batch);
    if (batch.length < 100) break;
    page += 1;
  }

  const ownRepos = repos.filter((repo) => !repo.fork);
  const starCount = ownRepos.reduce((sum, repo) => sum + repo.stargazers_count, 0);

  const perRepoLanguages = [];
  for (const repo of ownRepos) {
    const languages = await githubApi(`/repos/${username}/${repo.name}/languages`, token);
    perRepoLanguages.push(languages);
  }

  return { repoCount: ownRepos.length, starCount, perRepoLanguages };
}
