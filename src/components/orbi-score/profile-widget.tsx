'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useOrbiScore, useOrbiScoreActions } from '@/hooks/use-orbi-score';
import { OrbiScoreSection } from './score-display';
import { OrbiScoreCard, OrbiPercentileCard, ShareActions } from './share-cards';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ExternalLink, Sparkles, Share2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import type { User } from '@/lib/types';

// ═══════════════════════════════════════════════════════════════
// PROFILE ORBI SCORE WIDGET — Drop into profile page
// ═══════════════════════════════════════════════════════════════

interface ProfileOrbiScoreProps {
  user: User;
  className?: string;
}

export function ProfileOrbiScore({ user, className }: ProfileOrbiScoreProps) {
  const { authUser } = useAuth();
  const { scoreData, loading } = useOrbiScore(user.id);
  const { refreshData, refreshing } = useOrbiScoreActions();
  const [showShareModal, setShowShareModal] = useState(false);
  const isOwnProfile = authUser?.uid === user.id;

  if (loading) {
    return (
      <div className={cn('rounded-xl border border-white/5 bg-white/[0.02] p-6', className)}>
        <Skeleton className="h-4 w-32 mb-4" />
        <div className="flex items-center gap-4">
          <Skeleton className="w-[120px] h-[120px] rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  // No score yet — prompt to connect
  if (!scoreData) {
    return (
      <div className={cn('rounded-xl border border-white/5 bg-white/[0.02] p-6 text-center', className)}>
        <Sparkles className="w-8 h-8 text-pink-500 mx-auto mb-3" />
        <h3 className="text-white font-semibold mb-1">Orbi Score</h3>
        <p className="text-sm text-slate-500 mb-4">
          {isOwnProfile
            ? 'Connect your platforms to get your Orbi Score'
            : `${user.displayName} hasn't set up their Orbi Score yet`}
        </p>
        {isOwnProfile && (
          <Button asChild size="sm" className="rounded-full bg-gradient-to-r from-pink-500 to-orange-500 text-white">
            <Link href="/settings/platforms">Connect Platforms</Link>
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className={cn('rounded-xl border border-white/5 bg-white/[0.02] p-6', className)}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-pink-500" />
          Orbi Score
        </h3>
        <div className="flex items-center gap-1">
          {isOwnProfile && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-slate-400 hover:text-white"
              onClick={async () => {
                try { await refreshData(); } catch {}
              }}
              disabled={refreshing}
            >
              <RefreshCw className={cn('w-3.5 h-3.5 mr-1', refreshing && 'animate-spin')} />
              {refreshing ? 'Updating...' : 'Recalculate'}
            </Button>
          )}
          {isOwnProfile && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-slate-400 hover:text-white"
              onClick={() => setShowShareModal(true)}
            >
              <Share2 className="w-3.5 h-3.5 mr-1" />
              Share
            </Button>
          )}
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs text-slate-400 hover:text-white">
            <Link href={isOwnProfile ? '/settings/platforms' : '#'}>
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <OrbiScoreSection
        scoreData={scoreData}
        isOwnProfile={isOwnProfile}
        onRefresh={refreshData}
        refreshing={refreshing}
      />

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="sm:max-w-[820px] bg-[#0a0a1a] border-white/10">
          <DialogHeader>
            <DialogTitle className="text-white">Share Your Orbi Score</DialogTitle>
          </DialogHeader>
          <Tabs defaultValue="score" className="mt-4">
            <TabsList className="bg-white/5 border border-white/10">
              <TabsTrigger value="score">Score Card</TabsTrigger>
              <TabsTrigger value="percentile">Percentile Card</TabsTrigger>
            </TabsList>
            <TabsContent value="score" className="flex flex-col items-center gap-4 mt-4">
              <OrbiScoreCard
                username={user.username}
                displayName={user.displayName}
                photoURL={user.photoURL}
                score={scoreData.score}
                level={scoreData.level}
                rankTier={scoreData.rankTier}
                percentile={scoreData.percentile}
                breakdown={scoreData.breakdown}
                badges={scoreData.badges}
              />
              <ShareActions
                cardElementId="orbi-score-card"
                shareText={`I scored ${scoreData.score} on Orbi! Top ${(100 - scoreData.percentile).toFixed(1)}% 🚀`}
                user={{ uid: user.id, username: user.username, displayName: user.displayName, photoURL: user.photoURL }}
                score={scoreData.score}
                rankTier={scoreData.rankTier}
              />
            </TabsContent>
            <TabsContent value="percentile" className="flex flex-col items-center gap-4 mt-4">
              <OrbiPercentileCard
                username={user.username}
                displayName={user.displayName}
                photoURL={user.photoURL}
                score={scoreData.score}
                percentile={scoreData.percentile}
                rankTier={scoreData.rankTier}
                level={scoreData.level}
              />
              <ShareActions
                cardElementId="orbi-percentile-card"
                shareText={`I'm ahead of ${scoreData.percentile}% of users on Orbi! 🏆`}
                user={{ uid: user.id, username: user.username, displayName: user.displayName, photoURL: user.photoURL }}
                score={scoreData.score}
                rankTier={scoreData.rankTier}
              />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
