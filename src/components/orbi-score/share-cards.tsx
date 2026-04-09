'use client';

import { useRef, useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { getRankConfig, BADGE_DEFINITIONS, PLATFORM_LABELS, PLATFORM_COLORS, SCORE_MAXES, type OrbiScoreDoc, type RankTier, type ScoreBreakdown } from '@/lib/orbi-score';
import { Download, Share2, Send, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { db } from '@/firebase/config';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { uploadMedia } from '@/app/actions/upload';

// ═══════════════════════════════════════════════════════════════
// ORBI SCORE CARD — html2canvas-safe, no blur/bg-clip-text
// All layout uses explicit px positions for pixel-perfect capture
// ═══════════════════════════════════════════════════════════════

interface OrbiScoreCardProps {
  username: string;
  displayName: string;
  photoURL: string;
  score: number;
  level: number;
  rankTier: RankTier;
  percentile: number;
  breakdown: ScoreBreakdown;
  badges: string[];
  className?: string;
}

export function OrbiScoreCard({
  username, displayName, photoURL, score, level, rankTier, percentile, breakdown, badges, className,
}: OrbiScoreCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const config = getRankConfig(rankTier);

  const topCategories = (Object.keys(breakdown) as (keyof ScoreBreakdown)[])
    .filter(k => breakdown[k] > 0)
    .sort((a, b) => breakdown[b] - breakdown[a])
    .slice(0, 4);

  const radius = 76;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 1000);

  return (
    <div
      ref={cardRef}
      id="orbi-score-card"
      style={{
        position: 'relative',
        width: 360,
        height: 640,
        borderRadius: 24,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #0a0a1a 0%, #0d1117 50%, #0a0a1a 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className={className}
    >
      {/* Subtle grid overlay */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.03,
        backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
        backgroundSize: '40px 40px',
      }} />

      {/* Top accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, transparent 0%, ${config.color} 30%, #ec4899 70%, transparent 100%)`,
      }} />

      {/* Subtle corner glow (radial gradient, no blur) */}
      <div style={{
        position: 'absolute', top: -30, right: -30, width: 140, height: 140,
        borderRadius: 70,
        background: `radial-gradient(circle, ${config.color}12 0%, transparent 70%)`,
      }} />

      {/* Content wrapper — all explicit positioning */}
      <div style={{ position: 'relative', zIndex: 10, width: 360, height: 640 }}>

        {/* Logo row */}
        <div style={{ position: 'absolute', top: 24, left: 28, right: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: 2, color: '#ec4899' }}>ORBI</span>
          <span style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 3, color: '#64748b', fontWeight: 500 }}>Score Card</span>
        </div>

        {/* Profile row */}
        <div style={{ position: 'absolute', top: 64, left: 28, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ position: 'relative', width: 52, height: 52 }}>
            <div style={{
              width: 52, height: 52, borderRadius: 26, overflow: 'hidden',
              border: `2px solid ${config.color}`,
            }}>
              <img src={photoURL || '/default-avatar.png'} alt={displayName}
                style={{ width: 52, height: 52, objectFit: 'cover', display: 'block' }}
                crossOrigin="anonymous"
              />
            </div>
            <div style={{
              position: 'absolute', bottom: -3, right: -3,
              width: 20, height: 20, borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 8, fontWeight: 700, color: '#000',
              backgroundColor: config.color,
              lineHeight: '20px', textAlign: 'center' as const,
            }}>{level}</div>
          </div>
          <div>
            <div style={{ color: '#fff', fontWeight: 700, fontSize: 17, lineHeight: '22px' }}>{displayName}</div>
            <div style={{ color: '#64748b', fontSize: 12, lineHeight: '16px' }}>@{username}</div>
          </div>
        </div>

        {/* Score Circle — centered in card */}
        <div style={{ position: 'absolute', top: 150, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative', width: 180, height: 180 }}>
            <svg width="180" height="180" viewBox="0 0 180 180" style={{ display: 'block', transform: 'rotate(-90deg)' }}>
              <circle cx="90" cy="90" r={radius} stroke="rgba(255,255,255,0.04)" strokeWidth="5" fill="none" />
              <circle
                cx="90" cy="90" r={radius}
                stroke={config.color}
                strokeWidth="5"
                fill="none"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={offset}
              />
            </svg>
            {/* Score text — absolutely positioned at center of SVG */}
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              textAlign: 'center' as const, width: 120,
            }}>
              <div style={{ fontSize: 44, fontWeight: 800, color: '#fff', letterSpacing: -1, lineHeight: '48px' }}>{score}</div>
              <div style={{ fontSize: 9, color: '#64748b', textTransform: 'uppercase' as const, letterSpacing: 3, lineHeight: '12px', marginTop: 4 }}>orbi score</div>
            </div>
          </div>
        </div>

        {/* Rank & Percentile row */}
        <div style={{ position: 'absolute', top: 355, left: 28, right: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{
            padding: '5px 12px', borderRadius: 999,
            fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1,
            backgroundColor: `${config.color}20`, color: config.color,
            border: `1px solid ${config.color}40`,
            lineHeight: '14px',
          }}>
            {rankTier} • Lv.{level}
          </span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#ec4899', lineHeight: '18px' }}>
            Top {(100 - percentile).toFixed(1)}% Builder
          </span>
        </div>

        {/* Mini Breakdown — 2×2 grid */}
        <div style={{ position: 'absolute', top: 394, left: 28, right: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {topCategories.map(key => (
            <div key={key} style={{
              display: 'flex', alignItems: 'center', gap: 8,
              backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: 10, padding: '8px 12px',
            }}>
              <div style={{ width: 3, height: 16, borderRadius: 2, backgroundColor: PLATFORM_COLORS[key], flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 10, color: '#64748b', lineHeight: '14px' }}>{PLATFORM_LABELS[key]}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#fff', lineHeight: '16px' }}>
                  {breakdown[key]}<span style={{ color: '#334155' }}>/{SCORE_MAXES[key]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Badges row */}
        {badges.length > 0 && (
          <div style={{ position: 'absolute', top: 500, left: 28, right: 28, display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {badges.slice(0, 4).map(id => {
              const def = BADGE_DEFINITIONS[id as keyof typeof BADGE_DEFINITIONS];
              return def ? (
                <span key={id} style={{
                  fontSize: 11, padding: '3px 8px', borderRadius: 999, lineHeight: '16px',
                  backgroundColor: `${def.color}15`, color: def.color,
                }}>
                  {def.icon} {def.name}
                </span>
              ) : null;
            })}
          </div>
        )}

        {/* Footer */}
        <div style={{
          position: 'absolute', bottom: 24, left: 28, right: 28,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          paddingTop: 10, borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <span style={{ fontSize: 10, color: '#475569', fontStyle: 'italic' }}>orbi.app</span>
          <span style={{ fontSize: 10, color: '#475569', fontStyle: 'italic' }}>
            {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ORBI PERCENTILE CARD — Minimal, premium
// ═══════════════════════════════════════════════════════════════

interface OrbiPercentileCardProps {
  username: string;
  displayName: string;
  photoURL: string;
  score: number;
  percentile: number;
  rankTier: RankTier;
  level: number;
  className?: string;
}

export function OrbiPercentileCard({
  username, displayName, photoURL, score, percentile, rankTier, level, className,
}: OrbiPercentileCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const config = getRankConfig(rankTier);

  return (
    <div
      ref={cardRef}
      id="orbi-percentile-card"
      style={{
        position: 'relative',
        width: 360,
        height: 640,
        borderRadius: 24,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, #0d0d0d 0%, #111111 50%, #0d0d0d 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
      className={className}
    >
      {/* Subtle radial gradient */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        background: `radial-gradient(ellipse at 50% 40%, ${config.color}08 0%, transparent 70%)`,
      }} />

      {/* Accent line */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 3,
        background: `linear-gradient(90deg, transparent, ${config.color}, transparent)`,
      }} />

      {/* Content — explicit positioning */}
      <div style={{ position: 'relative', zIndex: 10, width: 360, height: 640 }}>

        {/* Logo */}
        <div style={{ position: 'absolute', top: 32, left: 32 }}>
          <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: 2, color: '#ec4899' }}>ORBI</span>
        </div>

        {/* Avatar — centered */}
        <div style={{ position: 'absolute', top: 110, left: 0, right: 0, display: 'flex', justifyContent: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 32, overflow: 'hidden',
            border: `2px solid ${config.color}60`,
          }}>
            <img src={photoURL || '/default-avatar.png'} alt={displayName}
              style={{ width: 64, height: 64, objectFit: 'cover', display: 'block' }}
              crossOrigin="anonymous"
            />
          </div>
        </div>

        {/* Name */}
        <div style={{ position: 'absolute', top: 186, left: 0, right: 0, textAlign: 'center' as const }}>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, lineHeight: '22px' }}>{displayName}</div>
          <div style={{ color: '#64748b', fontSize: 12, lineHeight: '16px', marginTop: 2 }}>@{username}</div>
        </div>

        {/* Main percentile — the hero, centered */}
        <div style={{ position: 'absolute', top: 250, left: 0, right: 0, textAlign: 'center' as const }}>
          <div style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 3, color: '#64748b', lineHeight: '14px' }}>You are ahead of</div>
          <div style={{
            fontSize: 80, fontWeight: 800, letterSpacing: -2, lineHeight: '88px', marginTop: 8,
            color: config.color,
          }}>
            {percentile}%
          </div>
          <div style={{ fontSize: 10, textTransform: 'uppercase' as const, letterSpacing: 3, color: '#64748b', lineHeight: '14px', marginTop: 8 }}>of all users</div>
        </div>

        {/* Score & Level pills — centered */}
        <div style={{ position: 'absolute', top: 440, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 12 }}>
          <div style={{
            padding: '8px 16px', borderRadius: 16,
            backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center' as const,
          }}>
            <div style={{ fontSize: 10, color: '#64748b' }}>Score</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{score}</div>
          </div>
          <div style={{
            padding: '8px 16px', borderRadius: 16,
            backgroundColor: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
            textAlign: 'center' as const,
          }}>
            <div style={{ fontSize: 10, color: '#64748b' }}>Level</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>{level}</div>
          </div>
          <div style={{
            padding: '8px 16px', borderRadius: 16,
            backgroundColor: `${config.color}08`, border: `1px solid ${config.color}20`,
            textAlign: 'center' as const,
          }}>
            <div style={{ fontSize: 10, color: '#64748b' }}>Rank</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: config.color }}>{rankTier}</div>
          </div>
        </div>

        {/* Footer */}
        <div style={{
          position: 'absolute', bottom: 24, left: 32, right: 32,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontSize: 10, color: '#475569', fontStyle: 'italic' }}>orbi.app</span>
          <span style={{ fontSize: 10, color: '#475569', fontStyle: 'italic' }}>
            {new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
          </span>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SHARE ACTIONS — Download, Share, & Post to Orbi
// ═══════════════════════════════════════════════════════════════

interface ShareActionsProps {
  cardElementId: string;
  shareText: string;
  className?: string;
  /** Required for "Share to Orbi" — user info to create the post */
  user?: { uid: string; username: string; displayName: string; photoURL: string };
  score?: number;
  rankTier?: string;
}

export function ShareActions({ cardElementId, shareText, className, user, score, rankTier }: ShareActionsProps) {
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  const captureCard = useCallback(async (): Promise<Blob | null> => {
    const element = document.getElementById(cardElementId);
    if (!element) return null;

    const { toBlob } = await import('html-to-image');
    const blob = await toBlob(element, {
      pixelRatio: 2,
      backgroundColor: '#0a0a1a',
      cacheBust: true,
    });
    return blob;
  }, [cardElementId]);

  const handleDownload = useCallback(async () => {
    const blob = await captureCard();
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orbi-score-${Date.now()}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [captureCard]);

  const handleShare = useCallback(async () => {
    const blob = await captureCard();
    if (!blob) return;

    if (navigator.canShare?.({ files: [new File([blob], 'orbi-score.png', { type: 'image/png' })] })) {
      await navigator.share({
        text: shareText,
        files: [new File([blob], 'orbi-score.png', { type: 'image/png' })],
      });
    } else {
      try {
        await navigator.clipboard.write([
          new ClipboardItem({ 'image/png': blob }),
        ]);
        alert('Card copied to clipboard!');
      } catch {
        handleDownload();
      }
    }
  }, [captureCard, shareText, handleDownload]);

  const handlePostToOrbi = useCallback(async () => {
    if (!user || posting || posted) return;
    setPosting(true);
    try {
      const blob = await captureCard();
      if (!blob) throw new Error('Failed to capture card');

      // Upload image via server action
      const formData = new FormData();
      formData.append('media', new File([blob], 'orbi-score.png', { type: 'image/png' }));
      const result = await uploadMedia(formData, { folder: 'orbi-posts' });
      if (result.error || !result.url) throw new Error(result.error || 'Upload failed');

      // Build caption
      const captions = [
        `YAHOOO! 🚀 Just got my Orbi Score — ${score ?? '???'} points! ${rankTier ? `Ranked ${rankTier}!` : ''} Check yours out! 🏆🔥`,
        `Just unlocked my Orbi Score card! 💪 ${score ?? '???'} points${rankTier ? ` • ${rankTier}` : ''}. How do you stack up? 🚀`,
        `My Orbi Score just dropped: ${score ?? '???'}! ${rankTier ? `${rankTier} rank!` : ''} Let's gooo! 🎯🔥`,
      ];
      const caption = captions[Math.floor(Math.random() * captions.length)];

      // Create the post
      await addDoc(collection(db, 'posts'), {
        userId: user.uid,
        username: user.username || '',
        authorDisplayName: user.displayName || 'Orbian',
        authorPhotoURL: user.photoURL || '',
        caption,
        mediaUrl: result.url,
        mediaUrls: [result.url],
        mediaType: 'image',
        imageHint: 'orbi score card',
        createdAt: serverTimestamp(),
        reactions: {},
        commentsCount: 0,
        totalReactions: 0,
        isAnonymous: false,
        showProfileLink: true,
        visibility: 'public',
      });

      setPosted(true);
    } catch (err: any) {
      console.error('Post to Orbi failed:', err);
      alert('Failed to post. Please try again.');
    } finally {
      setPosting(false);
    }
  }, [user, posting, posted, captureCard, score, rankTier]);

  return (
    <div className={cn('flex items-center gap-2 flex-wrap justify-center', className)}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleDownload}
        className="rounded-full bg-white/5 hover:bg-white/10 text-white"
      >
        <Download className="w-4 h-4 mr-2" />
        Download
      </Button>
      <Button
        size="sm"
        onClick={handleShare}
        className="rounded-full bg-gradient-to-r from-pink-500 to-orange-500 text-white hover:opacity-90"
      >
        <Share2 className="w-4 h-4 mr-2" />
        Share
      </Button>
      {user && (
        <Button
          size="sm"
          onClick={handlePostToOrbi}
          disabled={posting || posted}
          className={cn(
            'rounded-full text-white',
            posted
              ? 'bg-green-600 hover:bg-green-600'
              : 'bg-violet-600 hover:bg-violet-700'
          )}
        >
          {posting ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Posting...</>
          ) : posted ? (
            <>✓ Posted!</>
          ) : (
            <><Send className="w-4 h-4 mr-2" />Share to Orbi</>
          )}
        </Button>
      )}
    </div>
  );
}
