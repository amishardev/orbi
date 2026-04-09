import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

const db = admin.firestore();

// ═══════════════════════════════════════════════════════════════
// ORBI SCORE — Cloud Functions for platform data fetching & scoring
// ═══════════════════════════════════════════════════════════════

// ─── Types (mirrored from client for Cloud Functions) ────────

interface ScoreBreakdown {
  github: number;
  leetcode: number;
  codeforces: number;
  linkedin: number;
  kaggle: number;
  coursera: number;
  activity: number;
}

interface GitHubData {
  username: string;
  publicRepos: number;
  followers: number;
  totalStars: number;
  totalCommits: number;
  totalPRs: number;
  contributionStreak: number;
  topLanguages: string[];
  fetchedAt: string;
}

interface LeetCodeData {
  username: string;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  ranking: number;
  contestRating: number;
  contestsAttended: number;
  acceptanceRate: number;
  fetchedAt: string;
}

interface CodeforcesData {
  handle: string;
  rating: number;
  maxRating: number;
  rank: string;
  problemsSolved: number;
  contestsParticipated: number;
  fetchedAt: string;
}

type RankTier = 'Captain' | 'Major' | 'Colonel' | 'Brigadier' | 'Major General' | 'Marshall' | 'Master' | 'Grand Master';
type BadgeId = string;

// ─── Scoring Weights (same as client) ────────────────────────

function clampScore(value: number, max: number, cap: number): number {
  return Math.min(value / cap, 1) * max;
}

function calculateGitHubScore(data: GitHubData | undefined): number {
  if (!data) return 0;
  return Math.round(
    clampScore(data.publicRepos, 60, 50) +
    clampScore(data.totalStars, 60, 500) +
    clampScore(data.totalCommits, 60, 1000) +
    clampScore(data.totalPRs, 40, 200) +
    clampScore(data.followers, 40, 200) +
    clampScore(data.contributionStreak, 40, 100)
  );
}

function calculateLeetCodeScore(data: LeetCodeData | undefined): number {
  if (!data) return 0;
  return Math.round(
    clampScore(data.totalSolved, 80, 500) +
    clampScore(data.hardSolved, 60, 100) +
    clampScore(data.mediumSolved, 40, 200) +
    clampScore(data.contestRating, 50, 2500) +
    clampScore(data.contestsAttended, 20, 50)
  );
}

function calculateCodeforcesScore(data: CodeforcesData | undefined): number {
  if (!data) return 0;
  return Math.round(
    clampScore(data.rating, 80, 2400) +
    clampScore(data.problemsSolved, 40, 500) +
    clampScore(data.contestsParticipated, 30, 100)
  );
}

function calculateLinkedInScore(data: any): number {
  if (!data) return 0;
  const completeness =
    (data.hasHeadline ? 0.2 : 0) +
    (data.hasSummary ? 0.2 : 0) +
    Math.min((data.experienceCount || 0) / 3, 1) * 0.3 +
    Math.min((data.educationCount || 0) / 2, 1) * 0.3;
  return Math.round(
    clampScore(data.certifications || 0, 40, 10) +
    clampScore(data.connections || 0, 20, 500) +
    clampScore(completeness, 40, 1)
  );
}

const KAGGLE_TIER_MAP: Record<string, number> = {
  'Novice': 1, 'Contributor': 2, 'Expert': 3, 'Master': 4, 'Grandmaster': 5,
};

function calculateKaggleScore(data: any): number {
  if (!data) return 0;
  const tierNum = KAGGLE_TIER_MAP[data.tier] || 1;
  const totalMedals = (data.medals?.gold || 0) + (data.medals?.silver || 0) + (data.medals?.bronze || 0);
  return Math.round(
    clampScore(tierNum, 40, 5) +
    clampScore(data.notebooks || 0, 20, 50) +
    clampScore(data.competitions || 0, 20, 20) +
    clampScore(totalMedals, 20, 30)
  );
}

function calculateCourseraScore(data: any): number {
  if (!data) return 0;
  return Math.round(
    clampScore(data.certificationsCount || 0, 30, 10) +
    clampScore(data.specializations || 0, 20, 5)
  );
}

function calculateActivityScore(streakDays: number, consistency: number): number {
  return Math.round(
    clampScore(streakDays, 30, 30) +
    clampScore(consistency, 20, 1)
  );
}

function scoreToLevel(score: number): { level: number; xpInCurrentLevel: number; xpToNextLevel: number } {
  const totalXp = score * 15;
  let level = 1;
  let accumulatedXp = 0;
  while (level <= 500) {
    const needed = 50 + level * 10;
    if (accumulatedXp + needed > totalXp) {
      return {
        level: Math.max(1, level - 1),
        xpInCurrentLevel: Math.round(totalXp - accumulatedXp),
        xpToNextLevel: needed,
      };
    }
    accumulatedXp += needed;
    level++;
  }
  return { level: 500, xpInCurrentLevel: 0, xpToNextLevel: 0 };
}

function getRankTier(percentile: number): RankTier {
  if (percentile >= 99) return 'Grand Master';
  if (percentile >= 95) return 'Master';
  if (percentile >= 90) return 'Marshall';
  if (percentile >= 85) return 'Major General';
  if (percentile >= 80) return 'Brigadier';
  if (percentile >= 75) return 'Colonel';
  if (percentile >= 65) return 'Major';
  return 'Captain';
}

function evaluateBadges(platformData: any, score: number, streakDays: number, rankTier: RankTier): BadgeId[] {
  const badges: BadgeId[] = [];
  const gh = platformData.github;
  const lc = platformData.leetcode;
  const cf = platformData.codeforces;
  const kg = platformData.kaggle;
  const totalProblems = (lc?.totalSolved || 0) + (cf?.problemsSolved || 0);
  if (totalProblems >= 200) badges.push('top_coder');
  if (kg && kg.notebooks >= 5 && kg.competitions >= 3) badges.push('ai_builder');
  if (gh && gh.totalPRs >= 50 && gh.totalStars >= 500) badges.push('open_source_hero');
  if (streakDays >= 30) badges.push('streak_master');
  if (gh && gh.followers >= 100) badges.push('community_leader');
  if (lc && lc.hardSolved >= 50) badges.push('problem_solver');
  if (gh && gh.topLanguages?.length >= 5) badges.push('full_stack');
  if (kg && KAGGLE_TIER_MAP[kg.tier] >= 3) badges.push('data_wizard');
  if (rankTier === 'Master' || rankTier === 'Grand Master') badges.push('elite_dev');
  return badges;
}

function calculatePercentile(userScore: number, allScores: number[]): number {
  if (allScores.length === 0) return 50;
  const below = allScores.filter(s => s < userScore).length;
  const rawPercentile = (below / allScores.length) * 100;
  return Math.min(99.9, Math.max(30, Math.round(rawPercentile * 10) / 10));
}

// ═══════════════════════════════════════════════════════════════
// PLATFORM DATA FETCHERS
// ═══════════════════════════════════════════════════════════════

async function fetchGitHubData(username: string): Promise<GitHubData> {
  const fetch = (await import('node-fetch')).default;
  const headers: Record<string, string> = { 'Accept': 'application/vnd.github.v3+json' };
  const ghToken = process.env.GITHUB_TOKEN;
  if (ghToken) headers['Authorization'] = `token ${ghToken}`;

  const userRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers });
  if (!userRes.ok) throw new Error(`GitHub user not found: ${username}`);
  const userData = await userRes.json() as any;

  // Fetch repos for stars & languages
  const reposRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=stars`, { headers });
  const repos = await reposRes.json() as any[];
  const totalStars = Array.isArray(repos) ? repos.reduce((sum: number, r: any) => sum + (r.stargazers_count || 0), 0) : 0;
  const languages = new Set<string>();
  if (Array.isArray(repos)) {
    repos.forEach((r: any) => { if (r.language) languages.add(r.language); });
  }

  // Fetch contribution events for commits & PRs (approximate from recent events)
  const eventsRes = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}/events?per_page=100`, { headers });
  const events = await eventsRes.json() as any[];
  let totalCommits = 0;
  let totalPRs = 0;
  if (Array.isArray(events)) {
    events.forEach((e: any) => {
      if (e.type === 'PushEvent') totalCommits += e.payload?.commits?.length || 1;
      if (e.type === 'PullRequestEvent' && e.payload?.action === 'opened') totalPRs++;
    });
    // Scale up since we only get recent 100 events
    totalCommits = Math.round(totalCommits * 4);
    totalPRs = Math.round(totalPRs * 4);
  }

  return {
    username,
    publicRepos: userData.public_repos || 0,
    followers: userData.followers || 0,
    totalStars,
    totalCommits,
    totalPRs,
    contributionStreak: 0, // Would need GraphQL for accurate streak
    topLanguages: Array.from(languages).slice(0, 10),
    fetchedAt: new Date().toISOString(),
  };
}

async function fetchLeetCodeData(username: string): Promise<LeetCodeData> {
  const fetch = (await import('node-fetch')).default;

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

  const data = await res.json() as any;
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

async function fetchCodeforcesData(handle: string): Promise<CodeforcesData> {
  const fetch = (await import('node-fetch')).default;

  const infoRes = await fetch(`https://codeforces.com/api/user.info?handles=${encodeURIComponent(handle)}`);
  const infoData = await infoRes.json() as any;
  if (infoData.status !== 'OK') throw new Error(`Codeforces user not found: ${handle}`);
  const user = infoData.result[0];

  // Fetch submissions for problem count
  const subsRes = await fetch(`https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=1&count=10000`);
  const subsData = await subsRes.json() as any;
  const solvedProblems = new Set<string>();
  if (subsData.status === 'OK') {
    subsData.result.forEach((sub: any) => {
      if (sub.verdict === 'OK') {
        solvedProblems.add(`${sub.problem.contestId}-${sub.problem.index}`);
      }
    });
  }

  // Fetch contest history
  const ratingRes = await fetch(`https://codeforces.com/api/user.rating?handle=${encodeURIComponent(handle)}`);
  const ratingData = await ratingRes.json() as any;
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

// ═══════════════════════════════════════════════════════════════
// CALLABLE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Connect a platform and fetch its data
 */
export const connectPlatform = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');

  const { platform, username } = data as { platform: string; username: string };
  if (!platform || !username) {
    throw new functions.https.HttpsError('invalid-argument', 'Platform and username required');
  }

  const allowedPlatforms = ['github', 'leetcode', 'codeforces', 'kaggle', 'linkedin', 'coursera'];
  if (!allowedPlatforms.includes(platform)) {
    throw new functions.https.HttpsError('invalid-argument', 'Invalid platform');
  }

  const userId = context.auth.uid;
  let platformData: any;

  try {
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
        // For LinkedIn, Kaggle, Coursera — accept manual input for now
        platformData = { ...data.manualData, fetchedAt: new Date().toISOString() };
        break;
    }
  } catch (error: any) {
    throw new functions.https.HttpsError('not-found', `Could not fetch ${platform} data: ${error.message}`);
  }

  // Save platform connection
  const scoreRef = db.collection('orbi_scores').doc(userId);
  const scoreDoc = await scoreRef.get();

  const existingData = scoreDoc.exists ? scoreDoc.data() : {};
  const existingPlatformData = existingData?.platformData || {};
  const existingConnected = existingData?.connectedPlatforms || [];

  const updatedPlatformData = { ...existingPlatformData, [platform]: platformData };
  const updatedConnected = Array.from(new Set([...existingConnected, platform]));

  // Recalculate score
  const streakDays = existingData?.streakDays || 0;
  const consistency = streakDays > 0 ? Math.min(streakDays / 30, 1) : 0;

  const breakdown: ScoreBreakdown = {
    github: calculateGitHubScore(updatedPlatformData.github),
    leetcode: calculateLeetCodeScore(updatedPlatformData.leetcode),
    codeforces: calculateCodeforcesScore(updatedPlatformData.codeforces),
    linkedin: calculateLinkedInScore(updatedPlatformData.linkedin),
    kaggle: calculateKaggleScore(updatedPlatformData.kaggle),
    coursera: calculateCourseraScore(updatedPlatformData.coursera),
    activity: calculateActivityScore(streakDays, consistency),
  };

  const score = Math.min(1000,
    breakdown.github + breakdown.leetcode + breakdown.codeforces +
    breakdown.linkedin + breakdown.kaggle + breakdown.coursera + breakdown.activity
  );

  const levelData = scoreToLevel(score);
  const rankTier = getRankTier(score);
  const badges = evaluateBadges(updatedPlatformData, score, streakDays, rankTier);

  // Fetch all scores for percentile calculation
  const allScoresSnap = await db.collection('orbi_scores').select('score').get();
  const allScores = allScoresSnap.docs.map(d => d.data().score || 0);
  const percentile = calculatePercentile(score, allScores);

  const scoreDocData = {
    userId,
    score,
    level: levelData.level,
    percentile,
    rankTier,
    xpToNextLevel: levelData.xpToNextLevel,
    xpInCurrentLevel: levelData.xpInCurrentLevel,
    breakdown,
    badges,
    streakDays,
    longestStreak: Math.max(existingData?.longestStreak || 0, streakDays),
    connectedPlatforms: updatedConnected,
    platformData: updatedPlatformData,
    lastCalculated: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    ...(scoreDoc.exists ? {} : { createdAt: admin.firestore.FieldValue.serverTimestamp() }),
  };

  await scoreRef.set(scoreDocData, { merge: true });

  return { success: true, score, level: levelData.level, percentile, rankTier, breakdown, badges };
});

/**
 * Recalculate all user scores and percentiles (scheduled daily)
 */
export const recalculateAllScores = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const scoresSnap = await db.collection('orbi_scores').get();
    const allScores: number[] = [];
    const updates: { ref: FirebaseFirestore.DocumentReference; score: number }[] = [];

    // First pass: recalculate scores
    for (const doc of scoresSnap.docs) {
      const data = doc.data();
      const platformData = data.platformData || {};
      const streakDays = data.streakDays || 0;
      const consistency = streakDays > 0 ? Math.min(streakDays / 30, 1) : 0;

      const breakdown: ScoreBreakdown = {
        github: calculateGitHubScore(platformData.github),
        leetcode: calculateLeetCodeScore(platformData.leetcode),
        codeforces: calculateCodeforcesScore(platformData.codeforces),
        linkedin: calculateLinkedInScore(platformData.linkedin),
        kaggle: calculateKaggleScore(platformData.kaggle),
        coursera: calculateCourseraScore(platformData.coursera),
        activity: calculateActivityScore(streakDays, consistency),
      };

      const score = Math.min(1000,
        breakdown.github + breakdown.leetcode + breakdown.codeforces +
        breakdown.linkedin + breakdown.kaggle + breakdown.coursera + breakdown.activity
      );

      allScores.push(score);
      updates.push({ ref: doc.ref, score });
    }

    // Second pass: update percentiles
    const batch = db.batch();
    for (const { ref, score } of updates) {
      const percentile = calculatePercentile(score, allScores);
      const levelData = scoreToLevel(score);
      const rankTier = getRankTier(score);
      batch.update(ref, {
        score,
        percentile,
        level: levelData.level,
        rankTier,
        xpToNextLevel: levelData.xpToNextLevel,
        xpInCurrentLevel: levelData.xpInCurrentLevel,
        lastCalculated: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    console.log(`Recalculated scores for ${updates.length} users`);
  });

/**
 * Refresh a user's platform data
 */
export const refreshPlatformData = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');

  const userId = context.auth.uid;
  const scoreRef = db.collection('orbi_scores').doc(userId);
  const scoreDoc = await scoreRef.get();

  if (!scoreDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'No score document found. Connect a platform first.');
  }

  const existingData = scoreDoc.data()!;
  const platformData = { ...existingData.platformData };

  // Check rate limit: max 1 refresh per hour
  const lastCalc = existingData.lastCalculated?.toDate?.();
  if (lastCalc && Date.now() - lastCalc.getTime() < 3600000) {
    throw new functions.https.HttpsError('resource-exhausted', 'Please wait at least 1 hour between refreshes');
  }

  // Re-fetch all connected platforms
  const errors: string[] = [];
  for (const platform of existingData.connectedPlatforms || []) {
    try {
      const username = platformData[platform]?.username || platformData[platform]?.handle || platformData[platform]?.profileUrl;
      if (!username) continue;

      switch (platform) {
        case 'github':
          platformData.github = await fetchGitHubData(username);
          break;
        case 'leetcode':
          platformData.leetcode = await fetchLeetCodeData(username);
          break;
        case 'codeforces':
          platformData.codeforces = await fetchCodeforcesData(platformData.codeforces.handle);
          break;
      }
    } catch (error: any) {
      errors.push(`${platform}: ${error.message}`);
    }
  }

  // Recalculate
  const streakDays = existingData.streakDays || 0;
  const consistency = streakDays > 0 ? Math.min(streakDays / 30, 1) : 0;

  const breakdown: ScoreBreakdown = {
    github: calculateGitHubScore(platformData.github),
    leetcode: calculateLeetCodeScore(platformData.leetcode),
    codeforces: calculateCodeforcesScore(platformData.codeforces),
    linkedin: calculateLinkedInScore(platformData.linkedin),
    kaggle: calculateKaggleScore(platformData.kaggle),
    coursera: calculateCourseraScore(platformData.coursera),
    activity: calculateActivityScore(streakDays, consistency),
  };

  const score = Math.min(1000,
    breakdown.github + breakdown.leetcode + breakdown.codeforces +
    breakdown.linkedin + breakdown.kaggle + breakdown.coursera + breakdown.activity
  );

  const levelData = scoreToLevel(score);
  const rankTier = getRankTier(score);
  const badges = evaluateBadges(platformData, score, streakDays, rankTier);

  const allScoresSnap = await db.collection('orbi_scores').select('score').get();
  const allScores = allScoresSnap.docs.map(d => d.data().score || 0);
  const percentile = calculatePercentile(score, allScores);

  await scoreRef.update({
    score,
    level: levelData.level,
    percentile,
    rankTier,
    breakdown,
    badges,
    xpToNextLevel: levelData.xpToNextLevel,
    xpInCurrentLevel: levelData.xpInCurrentLevel,
    platformData,
    lastCalculated: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  return { success: true, score, level: levelData.level, percentile, rankTier, breakdown, badges, errors };
});

/**
 * Get leaderboard (top N users by score)
 */
export const getLeaderboard = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Must be logged in');

  const limit = Math.min(data?.limit || 50, 100);
  const snapshot = await db.collection('orbi_scores')
    .orderBy('score', 'desc')
    .limit(limit)
    .get();

  const leaderboard: any[] = [];
  for (const doc of snapshot.docs) {
    const scoreData = doc.data();
    const userDoc = await db.collection('users').doc(doc.id).get();
    const userData = userDoc.data();
    leaderboard.push({
      userId: doc.id,
      displayName: userData?.displayName || 'Unknown',
      username: userData?.username || '',
      photoURL: userData?.photoURL || '',
      isVerified: userData?.isVerified || false,
      score: scoreData.score,
      level: scoreData.level,
      rankTier: scoreData.rankTier,
      percentile: scoreData.percentile,
      badges: scoreData.badges || [],
    });
  }

  return { leaderboard };
});
