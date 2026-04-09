'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import {
  getRankConfig,
  RANK_TIERS,
  BADGE_DEFINITIONS,
  SCORE_MAXES,
  PLATFORM_LABELS,
  PLATFORM_COLORS,
  type OrbiScoreDoc,
  type ScoreBreakdown,
  type RankTier,
  type BadgeId,
} from '@/lib/orbi-score';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Zap, TrendingUp, Target, Trophy, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

// ═══════════════════════════════════════════════════════════════
// ORBI SCORE RING — Animated circular score display
// ═══════════════════════════════════════════════════════════════

interface ScoreRingProps {
  score: number;
  level: number;
  rankTier: RankTier;
  size?: number;
  className?: string;
}

export function ScoreRing({ score, level, rankTier, size = 180, className }: ScoreRingProps) {
  const config = getRankConfig(rankTier);
  const strokeWidth = 8;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 1000) * circumference;

  return (
    <div className={cn('relative inline-flex items-center justify-center', className)}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Animated score ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={config.color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
        {/* Glow effect */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={config.color}
          strokeWidth={strokeWidth + 4}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
          opacity={0.15}
          filter="blur(4px)"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-bold text-white"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {score}
        </motion.span>
        <span className="text-xs text-slate-400 uppercase tracking-wider">orbi score</span>
        <div
          className={cn('mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider')}
          style={{ backgroundColor: `${config.color}20`, color: config.color }}
        >
          Lv. {level}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RANK BADGE — Tier indicator
// ═══════════════════════════════════════════════════════════════

interface RankBadgeProps {
  tier: RankTier;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export function RankBadge({ tier, size = 'md', className }: RankBadgeProps) {
  const config = getRankConfig(tier);
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5',
    md: 'text-xs px-3 py-1',
    lg: 'text-sm px-4 py-1.5',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-bold uppercase tracking-wider',
        sizeClasses[size],
        className
      )}
      style={{ backgroundColor: `${config.color}20`, color: config.color, border: `1px solid ${config.color}40` }}
    >
      <Trophy className="w-3 h-3" />
      {tier}
    </span>
  );
}

// ═══════════════════════════════════════════════════════════════
// LEVEL PROGRESS BAR
// ═══════════════════════════════════════════════════════════════

interface LevelProgressProps {
  level: number;
  xpInCurrentLevel: number;
  xpToNextLevel: number;
  rankTier: RankTier;
  className?: string;
}

export function LevelProgress({ level, xpInCurrentLevel, xpToNextLevel, rankTier, className }: LevelProgressProps) {
  const config = getRankConfig(rankTier);
  const pct = xpToNextLevel > 0 ? (xpInCurrentLevel / xpToNextLevel) * 100 : 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">Level {level}</span>
        <span className="text-slate-500">{Math.round(pct)}% to Level {level + 1}</span>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full bg-white/5">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: config.color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
        />
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCORE BREAKDOWN BARS
// ═══════════════════════════════════════════════════════════════

interface ScoreBreakdownProps {
  breakdown: ScoreBreakdown;
  className?: string;
}

export function ScoreBreakdownBars({ breakdown, className }: ScoreBreakdownProps) {
  const entries = (Object.keys(breakdown) as (keyof ScoreBreakdown)[])
    .filter(key => breakdown[key] > 0 || SCORE_MAXES[key] > 0)
    .sort((a, b) => breakdown[b] - breakdown[a]);

  return (
    <div className={cn('space-y-3', className)}>
      {entries.map((key) => {
        const value = breakdown[key];
        const max = SCORE_MAXES[key];
        const pct = (value / max) * 100;
        const color = PLATFORM_COLORS[key];

        return (
          <div key={key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">{PLATFORM_LABELS[key]}</span>
              <span className="text-slate-500">{value}/{max}</span>
            </div>
            <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-white/5">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// BADGES GRID
// ═══════════════════════════════════════════════════════════════

interface BadgesGridProps {
  badges: BadgeId[];
  className?: string;
}

export function BadgesGrid({ badges, className }: BadgesGridProps) {
  if (badges.length === 0) return null;

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {badges.map((id) => {
        const def = BADGE_DEFINITIONS[id];
        if (!def) return null;
        return (
          <motion.div
            key={id}
            className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: `${def.color}15`, color: def.color, border: `1px solid ${def.color}30` }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            title={def.description}
          >
            <span>{def.icon}</span>
            <span>{def.name}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// PERCENTILE DISPLAY
// ═══════════════════════════════════════════════════════════════

interface PercentileDisplayProps {
  percentile: number;
  className?: string;
}

export function PercentileDisplay({ percentile, className }: PercentileDisplayProps) {
  return (
    <div className={cn('text-center', className)}>
      <motion.div
        className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent"
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, type: 'spring' }}
      >
        Top {(100 - percentile).toFixed(1)}%
      </motion.div>
      <p className="text-xs text-slate-500 mt-1">You&#39;re ahead of {percentile}% of users</p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// STREAK COUNTER
// ═══════════════════════════════════════════════════════════════

interface StreakCounterProps {
  streakDays: number;
  longestStreak: number;
  className?: string;
}

export function StreakCounter({ streakDays, longestStreak, className }: StreakCounterProps) {
  return (
    <div className={cn('flex items-center gap-4', className)}>
      <div className="flex items-center gap-2">
        <span className="text-2xl">🔥</span>
        <div>
          <div className="text-lg font-bold text-white">{streakDays}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Day Streak</div>
        </div>
      </div>
      <div className="w-px h-8 bg-white/10" />
      <div className="flex items-center gap-2">
        <span className="text-2xl">⚡</span>
        <div>
          <div className="text-lg font-bold text-white">{longestStreak}</div>
          <div className="text-[10px] text-slate-500 uppercase tracking-wider">Best</div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// CONNECTED PLATFORMS LIST
// ═══════════════════════════════════════════════════════════════

const PLATFORM_ICONS: Record<string, { icon: string; color: string; bg: string }> = {
  github: { icon: '🐙', color: '#f0f0f0', bg: 'bg-white/5' },
  linkedin: { icon: '💼', color: '#0A66C2', bg: 'bg-blue-500/10' },
  leetcode: { icon: '🧮', color: '#F97316', bg: 'bg-orange-500/10' },
  codeforces: { icon: '⚔️', color: '#3B82F6', bg: 'bg-blue-500/10' },
  kaggle: { icon: '📊', color: '#20BEFF', bg: 'bg-cyan-500/10' },
  coursera: { icon: '🎓', color: '#0056D2', bg: 'bg-blue-600/10' },
};

interface ConnectedPlatformsProps {
  platforms: string[];
  platformData: OrbiScoreDoc['platformData'];
  className?: string;
}

export function ConnectedPlatforms({ platforms, platformData, className }: ConnectedPlatformsProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {platforms.map((p) => {
        const meta = PLATFORM_ICONS[p] || { icon: '🔗', color: '#fff', bg: 'bg-white/5' };
        const data = platformData[p as keyof typeof platformData];
        const username = (data as any)?.username || (data as any)?.handle || (data as any)?.profileUrl || '';

        return (
          <div key={p} className={cn('flex items-center gap-3 px-3 py-2 rounded-lg', meta.bg)}>
            <span className="text-lg">{meta.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white capitalize">{p}</div>
              {username && <div className="text-xs text-slate-500 truncate">{username}</div>}
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500" title="Connected" />
          </div>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// FULL ORBI SCORE SECTION (for profile page)
// ═══════════════════════════════════════════════════════════════

interface OrbiScoreSectionProps {
  scoreData: OrbiScoreDoc;
  isOwnProfile?: boolean;
  onRefresh?: () => void;
  refreshing?: boolean;
  className?: string;
}

export function OrbiScoreSection({ scoreData, isOwnProfile, onRefresh, refreshing, className }: OrbiScoreSectionProps) {
  return (
    <div className={cn('space-y-6', className)}>
      {/* Score Ring + Percentile */}
      <div className="flex flex-col sm:flex-row items-center gap-6">
        <ScoreRing
          score={scoreData.score}
          level={scoreData.level}
          rankTier={scoreData.rankTier}
        />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <RankBadge tier={scoreData.rankTier} />
            {isOwnProfile && onRefresh && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefresh}
                disabled={refreshing}
                className="h-7 px-2 text-slate-400 hover:text-white"
              >
                <RefreshCw className={cn('w-3.5 h-3.5', refreshing && 'animate-spin')} />
              </Button>
            )}
          </div>
          <PercentileDisplay percentile={scoreData.percentile} className="text-left" />
          <LevelProgress
            level={scoreData.level}
            xpInCurrentLevel={scoreData.xpInCurrentLevel}
            xpToNextLevel={scoreData.xpToNextLevel}
            rankTier={scoreData.rankTier}
          />
        </div>
      </div>

      {/* Streak */}
      <StreakCounter
        streakDays={scoreData.streakDays}
        longestStreak={scoreData.longestStreak}
      />

      {/* Badges */}
      <BadgesGrid badges={scoreData.badges} />

      {/* Breakdown */}
      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Score Breakdown</h4>
        <ScoreBreakdownBars breakdown={scoreData.breakdown} />
      </div>

      {/* Connected Platforms */}
      {scoreData.connectedPlatforms.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3">Connected Platforms</h4>
          <ConnectedPlatforms
            platforms={scoreData.connectedPlatforms}
            platformData={scoreData.platformData}
          />
        </div>
      )}
    </div>
  );
}
