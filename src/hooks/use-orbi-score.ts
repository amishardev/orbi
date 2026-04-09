'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { useAuth } from '@/hooks/use-auth';
import {
  calculateOrbiScore,
  scoreToLevel,
  getRankTier,
  evaluateBadges,
  calculatePercentile,
  type OrbiScoreDoc,
  type ConnectedPlatform,
  type ProfileData,
} from '@/lib/orbi-score';

const AUTO_REFRESH_INTERVAL = 24 * 60 * 60 * 1000; // 24 hours

// Fix stale rankTier from Firestore by recomputing from percentile
function fixRank(data: OrbiScoreDoc): OrbiScoreDoc {
  return { ...data, rankTier: getRankTier(data.percentile ?? 50) };
}

export function useOrbiScore(userId: string | undefined) {
  const [scoreData, setScoreData] = useState<OrbiScoreDoc | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { authUser } = useAuth();
  const autoRefreshTriggered = useRef(false);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Try real-time listener first, fall back to single read on permission errors
    const unsub = onSnapshot(
      doc(db, 'orbi_scores', userId),
      (snap) => {
        if (snap.exists()) {
          setScoreData(fixRank(snap.data() as OrbiScoreDoc));
        } else {
          setScoreData(null);
        }
        setLoading(false);
      },
      (err) => {
        // Silently handle permission errors (rules not deployed yet)
        if (err.code === 'permission-denied') {
          setScoreData(null);
          setLoading(false);
          return;
        }
        // For other errors, try a single getDoc as fallback
        getDoc(doc(db, 'orbi_scores', userId))
          .then((snap) => {
            if (snap.exists()) {
              setScoreData(fixRank(snap.data() as OrbiScoreDoc));
            } else {
              setScoreData(null);
            }
          })
          .catch(() => {
            setScoreData(null);
          })
          .finally(() => setLoading(false));
      }
    );

    return () => unsub();
  }, [userId]);

  // Auto-refresh: if this is the user's own profile and data is >24h old, refresh silently
  useEffect(() => {
    if (!scoreData || !authUser || authUser.uid !== userId || autoRefreshTriggered.current) return;

    const lastCalc = scoreData.lastCalculated;
    if (!lastCalc) return;

    const lastTime = typeof lastCalc === 'string' ? new Date(lastCalc).getTime() : (lastCalc as any).toMillis?.() || 0;
    const age = Date.now() - lastTime;

    if (age > AUTO_REFRESH_INTERVAL) {
      autoRefreshTriggered.current = true;
      // Trigger background refresh (fire-and-forget)
      backgroundRefresh(authUser.uid).catch(() => {});
    }
  }, [scoreData, authUser, userId]);

  return { scoreData, loading, error };
}

// Silent background refresh for auto-fetch platforms (GitHub, LeetCode, Codeforces)
async function backgroundRefresh(uid: string) {
  const scoreRef = doc(db, 'orbi_scores', uid);
  const scoreSnap = await getDoc(scoreRef);
  if (!scoreSnap.exists()) return;

  const existing = scoreSnap.data();
  const platformData = { ...existing.platformData };
  const autoFetchPlatforms = ['github', 'leetcode', 'codeforces'];

  let anyUpdated = false;
  for (const platform of (existing.connectedPlatforms || [])) {
    if (!autoFetchPlatforms.includes(platform)) continue;
    const username = platformData[platform]?.username || platformData[platform]?.handle;
    if (!username) continue;

    try {
      const res = await fetch('/api/platform-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, input: username }),
      });
      const result = await res.json();
      if (res.ok) {
        platformData[platform] = result.data;
        anyUpdated = true;
      }
    } catch { /* skip failed platforms */ }
  }

  if (!anyUpdated) return;

  const streakDays = existing.streakDays || 0;
  const consistency = streakDays > 0 ? Math.min(streakDays / 30, 1) : 0;
  const { score, breakdown } = calculateOrbiScore(platformData, streakDays, consistency, existing.profileData);
  const levelData = scoreToLevel(score);

  const allScoresSnap = await getDocs(collection(db, 'orbi_scores'));
  const allScores = allScoresSnap.docs.filter(d => d.id !== uid).map(d => d.data().score || 0);
  const percentile = calculatePercentile(score, allScores);

  const rankTier = getRankTier(percentile);
  const badges = evaluateBadges(platformData, score, streakDays, rankTier);

  await setDoc(scoreRef, {
    score, level: levelData.level, percentile, rankTier, breakdown, badges,
    xpToNextLevel: levelData.xpToNextLevel, xpInCurrentLevel: levelData.xpInCurrentLevel,
    platformData, lastCalculated: new Date().toISOString(), updatedAt: new Date().toISOString(),
  }, { merge: true });
}

export function useOrbiScoreActions() {
  const [connecting, setConnecting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { authUser } = useAuth();

  const connectPlatform = async (platform: ConnectedPlatform, input: string, manualData?: any) => {
    if (!authUser) throw new Error('Must be logged in');
    setConnecting(true);
    setError(null);

    try {
      let platformData: any;
      const autoFetchPlatforms = ['github', 'leetcode', 'codeforces'];

      if (autoFetchPlatforms.includes(platform)) {
        // Fetch via API route (handles CORS, extracts username from URL)
        const res = await fetch('/api/platform-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ platform, input }),
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || 'Failed to fetch platform data');
        platformData = result.data;
      } else {
        // Manual data for LinkedIn, Kaggle, Coursera
        platformData = { ...manualData, fetchedAt: new Date().toISOString() };
      }

      // Read existing score doc
      const scoreRef = doc(db, 'orbi_scores', authUser.uid);
      const scoreSnap = await getDoc(scoreRef);
      const existing = scoreSnap.exists() ? scoreSnap.data() : {};

      const updatedPlatformData = { ...(existing.platformData || {}), [platform]: platformData };
      const updatedConnected = Array.from(new Set([...(existing.connectedPlatforms || []), platform]));

      // Recalculate score
      const streakDays = existing.streakDays || 0;
      const consistency = streakDays > 0 ? Math.min(streakDays / 30, 1) : 0;
      const { score, breakdown } = calculateOrbiScore(updatedPlatformData, streakDays, consistency, existing.profileData);
      const levelData = scoreToLevel(score);

      // Fetch all scores for percentile (exclude self to avoid self-comparison bias)
      const allScoresSnap = await getDocs(collection(db, 'orbi_scores'));
      const allScores = allScoresSnap.docs
        .filter(d => d.id !== authUser.uid)
        .map(d => d.data().score || 0);
      const percentile = calculatePercentile(score, allScores);

      // Rank is percentile-based
      const rankTier = getRankTier(percentile);
      const badges = evaluateBadges(updatedPlatformData, score, streakDays, rankTier);

      // Write to Firestore
      await setDoc(scoreRef, {
        userId: authUser.uid,
        score,
        level: levelData.level,
        percentile,
        rankTier,
        xpToNextLevel: levelData.xpToNextLevel,
        xpInCurrentLevel: levelData.xpInCurrentLevel,
        breakdown,
        badges,
        streakDays,
        longestStreak: Math.max(existing.longestStreak || 0, streakDays),
        connectedPlatforms: updatedConnected,
        platformData: updatedPlatformData,
        lastCalculated: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        ...(!scoreSnap.exists() ? { createdAt: new Date().toISOString() } : {}),
      }, { merge: true });

      return { success: true, score, level: levelData.level, percentile, rankTier };
    } catch (err: any) {
      const message = err.message || 'Failed to connect platform';
      setError(message);
      throw err;
    } finally {
      setConnecting(false);
    }
  };

  const refreshData = async () => {
    if (!authUser) throw new Error('Must be logged in');
    setRefreshing(true);
    setError(null);

    try {
      const scoreRef = doc(db, 'orbi_scores', authUser.uid);
      const scoreSnap = await getDoc(scoreRef);
      if (!scoreSnap.exists()) throw new Error('No score found. Connect a platform first.');

      const existing = scoreSnap.data();
      const platformData = { ...existing.platformData };
      const autoFetchPlatforms = ['github', 'leetcode', 'codeforces'];

      // Re-fetch auto-fetch platforms with fresh API data
      for (const platform of (existing.connectedPlatforms || [])) {
        if (!autoFetchPlatforms.includes(platform)) continue;
        const username = platformData[platform]?.username || platformData[platform]?.handle;
        if (!username) continue;

        try {
          const res = await fetch('/api/platform-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ platform, input: username }),
          });
          const result = await res.json();
          if (res.ok) platformData[platform] = result.data;
        } catch { /* skip failed platforms */ }
      }

      // Recalculate score from ALL platform data (including manual platforms like LinkedIn)
      const streakDays = existing.streakDays || 0;
      const consistency = streakDays > 0 ? Math.min(streakDays / 30, 1) : 0;
      const { score, breakdown } = calculateOrbiScore(platformData, streakDays, consistency, existing.profileData);
      const levelData = scoreToLevel(score);

      const allScoresSnap = await getDocs(collection(db, 'orbi_scores'));
      const allScores = allScoresSnap.docs
        .filter(d => d.id !== authUser.uid)
        .map(d => d.data().score || 0);
      const percentile = calculatePercentile(score, allScores);

      const rankTier = getRankTier(percentile);
      const badges = evaluateBadges(platformData, score, streakDays, rankTier);

      await setDoc(scoreRef, {
        score, level: levelData.level, percentile, rankTier, breakdown, badges,
        xpToNextLevel: levelData.xpToNextLevel, xpInCurrentLevel: levelData.xpInCurrentLevel,
        platformData, lastCalculated: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }, { merge: true });

      return { success: true, score };
    } catch (err: any) {
      const message = err.message || 'Failed to refresh data';
      setError(message);
      throw err;
    } finally {
      setRefreshing(false);
    }
  };

  const saveProfile = async (profileData: ProfileData) => {
    if (!authUser) throw new Error('Must be logged in');
    setConnecting(true);
    setError(null);

    try {
      const scoreRef = doc(db, 'orbi_scores', authUser.uid);
      const scoreSnap = await getDoc(scoreRef);
      const existing = scoreSnap.exists() ? scoreSnap.data() : {};

      const platformData = existing.platformData || {};
      const streakDays = existing.streakDays || 0;
      const consistency = streakDays > 0 ? Math.min(streakDays / 30, 1) : 0;
      const { score, breakdown } = calculateOrbiScore(platformData, streakDays, consistency, profileData);
      const levelData = scoreToLevel(score);

      const allScoresSnap = await getDocs(collection(db, 'orbi_scores'));
      const allScores = allScoresSnap.docs
        .filter(d => d.id !== authUser.uid)
        .map(d => d.data().score || 0);
      const percentile = calculatePercentile(score, allScores);
      const rankTier = getRankTier(percentile);
      const badges = evaluateBadges(platformData, score, streakDays, rankTier);

      await setDoc(scoreRef, {
        userId: authUser.uid,
        score, level: levelData.level, percentile, rankTier, breakdown, badges,
        xpToNextLevel: levelData.xpToNextLevel, xpInCurrentLevel: levelData.xpInCurrentLevel,
        profileData,
        lastCalculated: new Date().toISOString(), updatedAt: new Date().toISOString(),
        ...(!scoreSnap.exists() ? { createdAt: new Date().toISOString(), connectedPlatforms: [], platformData: {}, streakDays: 0, longestStreak: 0 } : {}),
      }, { merge: true });

      return { success: true, score };
    } catch (err: any) {
      const message = err.message || 'Failed to save profile';
      setError(message);
      throw err;
    } finally {
      setConnecting(false);
    }
  };

  return { connectPlatform, refreshData, saveProfile, connecting, refreshing, error };
}
