'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import { useOrbiScore } from '@/hooks/use-orbi-score';
import { AppLayout } from '@/components/app-layout';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { RankBadge, ScoreRing } from '@/components/orbi-score/score-display';
import { getRankConfig, getRankTier, RANK_TIERS, type RankTier } from '@/lib/orbi-score';
import { cn } from '@/lib/utils';
import { Trophy, Medal, Crown, ArrowUp, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';

interface LeaderboardEntry {
  userId: string;
  displayName: string;
  username: string;
  photoURL: string;
  isVerified: boolean;
  score: number;
  level: number;
  rankTier: RankTier;
  percentile: number;
  badges: string[];
}

export default function LeaderboardPage() {
  const { authUser } = useAuth();
  const { scoreData } = useOrbiScore(authUser?.uid);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      try {
        const scoresSnap = await getDocs(
          query(collection(db, 'orbi_scores'), orderBy('score', 'desc'), limit(100))
        );

        const results: LeaderboardEntry[] = [];
        for (const scoreDoc of scoresSnap.docs) {
          const sd = scoreDoc.data();
          const userSnap = await getDoc(doc(db, 'users', scoreDoc.id));
          const ud = userSnap.data();
          if (!ud) continue;

          results.push({
            userId: scoreDoc.id,
            displayName: ud.displayName || 'Unknown',
            username: ud.username || '',
            photoURL: ud.photoURL || '',
            isVerified: ud.isVerified || false,
            score: sd.score || 0,
            level: sd.level || 1,
            rankTier: getRankTier(sd.percentile || 30),
            percentile: sd.percentile || 30,
            badges: sd.badges || [],
          });
        }

        setEntries(results);
      } catch (err) {
        console.error('Error fetching leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, []);

  const userRank = authUser
    ? entries.findIndex(e => e.userId === authUser.uid) + 1
    : 0;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
          <p className="text-sm text-slate-500">See how you stack up against other builders</p>
        </div>

        {/* Own rank card */}
        {scoreData && authUser && (
          <div className="rounded-xl border border-white/10 bg-gradient-to-r from-white/[0.03] to-white/[0.01] p-4 mb-8">
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xs text-slate-500">Your Rank</div>
                <div className="text-2xl font-bold text-white">#{userRank || '—'}</div>
              </div>
              <div className="w-px h-10 bg-white/10" />
              <ScoreRing score={scoreData.score} level={scoreData.level} rankTier={scoreData.rankTier} size={60} />
              <div className="flex-1">
                <RankBadge tier={scoreData.rankTier} size="sm" />
                <div className="text-xs text-slate-500 mt-1">
                  Top {(100 - scoreData.percentile).toFixed(1)}% • Level {scoreData.level}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Leaderboard list */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-white/[0.02]">
                <Skeleton className="w-8 h-8" />
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-20" />
                </div>
                <Skeleton className="h-6 w-16" />
              </div>
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-16">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-white mb-1">No scores yet</h3>
            <p className="text-sm text-slate-500">Be the first to connect your platforms!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {/* Top 3 podium */}
            {entries.length >= 3 && (
              <div className="grid grid-cols-3 gap-3 mb-8">
                {[entries[1], entries[0], entries[2]].map((entry, idx) => {
                  const rank = idx === 0 ? 2 : idx === 1 ? 1 : 3;
                  const config = getRankConfig(entry.rankTier);
                  const heights = ['h-28', 'h-36', 'h-24'];
                  const icons = [
                    <Medal key="2" className="w-5 h-5 text-slate-300" />,
                    <Crown key="1" className="w-6 h-6 text-yellow-400" />,
                    <Medal key="3" className="w-5 h-5 text-amber-600" />,
                  ];

                  return (
                    <motion.div
                      key={entry.userId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.15 }}
                      className="flex flex-col items-center"
                    >
                      <div className="relative mb-2">
                        <Avatar className="w-14 h-14 border-2" style={{ borderColor: config.color }}>
                          <AvatarImage src={entry.photoURL} />
                          <AvatarFallback>{entry.displayName[0]}</AvatarFallback>
                        </Avatar>
                        <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-background flex items-center justify-center border border-white/10">
                          {icons[idx]}
                        </div>
                      </div>
                      <div className="text-xs font-semibold text-white text-center truncate max-w-full">
                        {entry.displayName}
                      </div>
                      <div className="text-[10px] text-slate-500">@{entry.username}</div>
                      <div
                        className={cn('w-full rounded-t-xl mt-2 flex flex-col items-center justify-end pb-3', heights[idx])}
                        style={{ backgroundColor: `${config.color}10`, border: `1px solid ${config.color}20` }}
                      >
                        <div className="text-xl font-bold text-white">{entry.score}</div>
                        <div className="text-[10px] text-slate-500">Lv.{entry.level}</div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Rest of the list */}
            {entries.slice(3).map((entry, idx) => {
              const rank = idx + 4;
              const config = getRankConfig(entry.rankTier);
              const isMe = authUser?.uid === entry.userId;

              return (
                <motion.div
                  key={entry.userId}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Link
                    href={`/profile/${entry.username}`}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-xl transition-colors',
                      isMe
                        ? 'bg-pink-500/5 border border-pink-500/20'
                        : 'bg-white/[0.02] hover:bg-white/[0.04] border border-transparent'
                    )}
                  >
                    {/* Rank */}
                    <div className="w-8 text-center">
                      <span className={cn('text-sm font-bold', isMe ? 'text-pink-400' : 'text-slate-500')}>
                        {rank}
                      </span>
                    </div>

                    {/* Avatar */}
                    <Avatar className="w-10 h-10">
                      <AvatarImage src={entry.photoURL} />
                      <AvatarFallback>{entry.displayName[0]}</AvatarFallback>
                    </Avatar>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-white truncate">{entry.displayName}</span>
                        {entry.isVerified && (
                          <Badge variant="secondary" className="h-4 px-1 text-[8px]">✓</Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-500">@{entry.username} • Lv.{entry.level}</div>
                    </div>

                    {/* Score & Rank */}
                    <div className="text-right">
                      <div className="text-lg font-bold text-white">{entry.score}</div>
                      <RankBadge tier={entry.rankTier} size="sm" />
                    </div>

                    <ChevronRight className="w-4 h-4 text-slate-600" />
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
