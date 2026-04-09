import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase-admin';
import {
  calculateGitHubScore,
  calculateLeetCodeScore,
  calculateCodeforcesScore,
  calculateLinkedInScore,
  calculateKaggleScore,
  calculateCourseraScore,
  calculateActivityScore,
  calculateProfileScore,
  calculateOrbiScore,
  calculatePercentile,
  getRankTier,
} from '@/lib/orbi-score';

export async function GET(req: NextRequest) {
  const uid = req.nextUrl.searchParams.get('uid');
  if (!uid) return NextResponse.json({ error: 'uid required' }, { status: 400 });

  if (!db) return NextResponse.json({ error: 'Firebase Admin not initialized' }, { status: 500 });
  const snap = await db.collection('orbi_scores').doc(uid).get();
  if (!snap.exists) return NextResponse.json({ error: 'No score doc found' }, { status: 404 });

  const data = snap.data()!;
  const pd = data.platformData || {};
  const streakDays = data.streakDays || 0;
  const consistency = streakDays > 0 ? Math.min(streakDays / 30, 1) : 0;

  // Individual scores
  const githubScore = calculateGitHubScore(pd.github);
  const leetcodeScore = calculateLeetCodeScore(pd.leetcode);
  const codeforcesScore = calculateCodeforcesScore(pd.codeforces);
  const linkedinScore = calculateLinkedInScore(pd.linkedin);
  const kaggleScore = calculateKaggleScore(pd.kaggle);
  const courseraScore = calculateCourseraScore(pd.coursera);
  const activityScore = calculateActivityScore(streakDays, consistency);
  const profileScore = calculateProfileScore(data.profileData);

  const { score, breakdown } = calculateOrbiScore(pd, streakDays, consistency, data.profileData);

  // Get all scores for percentile
  const allSnap = await db.collection('orbi_scores').get();
  const allScores = allSnap.docs.filter(d => d.id !== uid).map(d => d.data().score || 0);
  const percentile = calculatePercentile(score, allScores);
  const rank = getRankTier(percentile);

  return NextResponse.json({
    storedScore: data.score,
    storedRank: data.rankTier,
    storedPercentile: data.percentile,
    storedBreakdown: data.breakdown,
    connectedPlatforms: data.connectedPlatforms,
    recalculated: {
      score,
      breakdown,
      percentile,
      rank,
      componentScores: {
        github: githubScore,
        leetcode: leetcodeScore,
        codeforces: codeforcesScore,
        linkedin: linkedinScore,
        kaggle: kaggleScore,
        coursera: courseraScore,
        activity: activityScore,
      },
    },
    rawPlatformData: {
      github: pd.github ? { username: pd.github.username, publicRepos: pd.github.publicRepos, followers: pd.github.followers, totalStars: pd.github.totalStars, totalCommits: pd.github.totalCommits, totalPRs: pd.github.totalPRs, contributionStreak: pd.github.contributionStreak } : null,
      linkedin: pd.linkedin || null,
      leetcode: pd.leetcode || null,
      codeforces: pd.codeforces || null,
      kaggle: pd.kaggle || null,
      coursera: pd.coursera || null,
    },
    otherUsersScores: allScores,
  });
}
