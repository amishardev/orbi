import { NextRequest, NextResponse } from 'next/server';

// ─── GitHub ──────────────────────────────────────────────────

async function fetchGitHubData(username: string) {
  const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
  const ghToken = process.env.GITHUB_TOKEN || process.env.GITHUB_PAT;
  if (ghToken && ghToken !== 'your-github-pat') headers['Authorization'] = `token ${ghToken}`;

  // 1. User profile
  const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
  if (!userRes.ok) throw new Error(`GitHub user not found: ${username}`);
  const userData = await userRes.json();

  // 2. Repos (up to 100, sorted by stars)
  const reposRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=stars`, { headers });
  const repos = await reposRes.json();
  const totalStars = Array.isArray(repos) ? repos.reduce((sum: number, r: any) => sum + (r.stargazers_count || 0), 0) : 0;
  const languages = new Set<string>();
  if (Array.isArray(repos)) {
    repos.forEach((r: any) => { if (r.language) languages.add(r.language); });
  }

  // 3. Use Search API for accurate commit count (last 12 months)
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  const since = oneYearAgo.toISOString().split('T')[0];

  let totalCommits = 0;
  let totalPRs = 0;

  try {
    // Search commits by this user across all repos (last 12 months)
    const commitSearchRes = await fetch(
      `https://api.github.com/search/commits?q=author:${encodeURIComponent(username)}+committer-date:>${since}&per_page=1`,
      { headers: { ...headers, 'Accept': 'application/vnd.github.cloak-preview+json' } }
    );
    if (commitSearchRes.ok) {
      const commitSearch = await commitSearchRes.json();
      totalCommits = commitSearch.total_count || 0;
    }
  } catch { /* fallback below */ }

  try {
    // Search PRs created by this user
    const prSearchRes = await fetch(
      `https://api.github.com/search/issues?q=author:${encodeURIComponent(username)}+type:pr+created:>${since}&per_page=1`,
      { headers }
    );
    if (prSearchRes.ok) {
      const prSearch = await prSearchRes.json();
      totalPRs = prSearch.total_count || 0;
    }
  } catch { /* fallback below */ }

  // 4. Fallback: if search API didn't work (rate-limited without token), use events API
  if (totalCommits === 0 && totalPRs === 0) {
    try {
      const eventsRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events?per_page=100`, { headers });
      const events = await eventsRes.json();
      if (Array.isArray(events)) {
        let evCommits = 0, evPRs = 0;
        events.forEach((e: any) => {
          if (e.type === 'PushEvent') evCommits += e.payload?.commits?.length || 1;
          if (e.type === 'PullRequestEvent' && e.payload?.action === 'opened') evPRs++;
        });
        // Events cover ~90 days, extrapolate to 12 months
        totalCommits = Math.round(evCommits * 4);
        totalPRs = Math.round(evPRs * 4);
      }
    } catch { /* ignore */ }
  }

  // 5. Estimate contribution streak from recent events
  let contributionStreak = 0;
  try {
    const eventsRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events?per_page=100`, { headers });
    const events = await eventsRes.json();
    if (Array.isArray(events) && events.length > 0) {
      const days = new Set<string>();
      events.forEach((e: any) => {
        if (e.created_at) days.add(e.created_at.split('T')[0]);
      });
      // Count consecutive days from today backwards
      const sortedDays = Array.from(days).sort().reverse();
      const today = new Date().toISOString().split('T')[0];
      let streak = 0;
      let checkDate = new Date();
      for (let i = 0; i < 100; i++) {
        const dateStr = checkDate.toISOString().split('T')[0];
        if (sortedDays.includes(dateStr)) {
          streak++;
        } else if (i > 0) { // skip today if no activity yet
          break;
        }
        checkDate.setDate(checkDate.getDate() - 1);
      }
      contributionStreak = streak;
    }
  } catch { /* ignore */ }

  return {
    username,
    publicRepos: userData.public_repos || 0,
    followers: userData.followers || 0,
    totalStars,
    totalCommits,
    totalPRs,
    contributionStreak,
    topLanguages: Array.from(languages).slice(0, 10),
    fetchedAt: new Date().toISOString(),
  };
}

// ─── LeetCode ────────────────────────────────────────────────

async function fetchLeetCodeData(username: string) {
  const query = `{
    matchedUser(username: "${username}") {
      submitStats: submitStatsGlobal {
        acSubmissionNum { difficulty count }
      }
      profile { ranking }
    }
    userContestRanking(username: "${username}") {
      rating
      attendedContestsCount
    }
  }`;

  const res = await fetch('https://leetcode.com/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  const data = await res.json();
  const stats = data?.data?.matchedUser?.submitStats?.acSubmissionNum || [];
  const contest = data?.data?.userContestRanking;

  const findCount = (difficulty: string) =>
    stats.find((s: any) => s.difficulty === difficulty)?.count || 0;

  const easy = findCount('Easy');
  const medium = findCount('Medium');
  const hard = findCount('Hard');

  return {
    username,
    totalSolved: easy + medium + hard,
    easySolved: easy,
    mediumSolved: medium,
    hardSolved: hard,
    ranking: data?.data?.matchedUser?.profile?.ranking || 0,
    contestRating: Math.round(contest?.rating || 0),
    contestsAttended: contest?.attendedContestsCount || 0,
    acceptanceRate: 0,
    fetchedAt: new Date().toISOString(),
  };
}

// ─── Codeforces ──────────────────────────────────────────────

async function fetchCodeforcesData(handle: string) {
  const infoRes = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`);
  const infoData = await infoRes.json();
  if (infoData.status !== 'OK') throw new Error(`Codeforces user not found: ${handle}`);
  const user = infoData.result[0];

  const subsRes = await fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=10000`);
  const subsData = await subsRes.json();
  const solvedProblems = new Set<string>();
  if (subsData.status === 'OK') {
    subsData.result.forEach((sub: any) => {
      if (sub.verdict === 'OK') {
        solvedProblems.add(`${sub.problem.contestId}-${sub.problem.index}`);
      }
    });
  }

  const ratingRes = await fetch(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(handle)}`);
  const ratingData = await ratingRes.json();
  const contestCount = ratingData.status === 'OK' ? ratingData.result.length : 0;

  return {
    handle,
    rating: user.rating || 0,
    maxRating: user.maxRating || 0,
    rank: user.rank || 'newbie',
    problemsSolved: solvedProblems.size,
    contestsParticipated: contestCount,
    fetchedAt: new Date().toISOString(),
  };
}

// ─── Extract username from URL or plain text ─────────────────

function extractUsername(input: string, platform: string): string {
  const trimmed = input.trim();

  // Remove trailing slashes
  const cleaned = trimmed.replace(/\/+$/, '');

  const patterns: Record<string, RegExp> = {
    github: /github\.com\/([a-zA-Z0-9_-]+)/,
    leetcode: /leetcode\.com\/(?:u\/)?([a-zA-Z0-9_-]+)/,
    codeforces: /codeforces\.com\/profile\/([a-zA-Z0-9_.-]+)/,
  };

  const pattern = patterns[platform];
  if (pattern) {
    const match = cleaned.match(pattern);
    if (match) return match[1];
  }

  // If no URL pattern matched, treat the entire input as a username
  // Extract last segment in case they pasted a URL we don't recognize
  const segments = cleaned.split('/').filter(Boolean);
  return segments[segments.length - 1] || trimmed;
}

// ─── API Route Handler ───────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { platform, input } = body;

    if (!platform || !input) {
      return NextResponse.json({ error: 'Platform and input are required' }, { status: 400 });
    }

    const username = extractUsername(input, platform);

    let platformData;
    switch (platform) {
      case 'github':
        platformData = await fetchGitHubData(username);
        break;
      case 'leetcode':
        platformData = await fetchLeetCodeData(username);
        break;
      case 'codeforces':
        platformData = await fetchCodeforcesData(username);
        break;
      default:
        return NextResponse.json({ error: `Unsupported platform for auto-fetch: ${platform}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: platformData });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Failed to fetch platform data' }, { status: 500 });
  }
}
