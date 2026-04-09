'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useOrbiScore, useOrbiScoreActions } from '@/hooks/use-orbi-score';
import { AppLayout } from '@/components/app-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { ScoreRing, RankBadge, LevelProgress, ScoreBreakdownBars, BadgesGrid, PercentileDisplay, StreakCounter } from '@/components/orbi-score/score-display';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Check, Loader2, AlertCircle, ExternalLink, Link2, RefreshCw, Sparkles, Brain, GraduationCap, User } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import type { ConnectedPlatform, ProfileData, CollegeType } from '@/lib/orbi-score';
import { searchColleges, nirfRankToScore, detectCollegeType } from '@/lib/orbi-score';

const PLATFORMS: {
  id: ConnectedPlatform;
  name: string;
  icon: string;
  placeholder: string;
  urlPrefix: string;
  description: string;
  autoFetch: boolean;
}[] = [
  {
    id: 'github',
    name: 'GitHub',
    icon: '🐙',
    placeholder: 'your-github-username',
    urlPrefix: 'github.com/',
    description: 'Repos, stars, commits, PRs, followers',
    autoFetch: true,
  },
  {
    id: 'leetcode',
    name: 'LeetCode',
    icon: '🧮',
    placeholder: 'your-leetcode-username',
    urlPrefix: 'leetcode.com/',
    description: 'Problems solved, contest rating, difficulty breakdown',
    autoFetch: true,
  },
  {
    id: 'codeforces',
    name: 'Codeforces',
    icon: '⚔️',
    placeholder: 'your-codeforces-handle',
    urlPrefix: 'codeforces.com/profile/',
    description: 'Rating, problems solved, contests participated',
    autoFetch: true,
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    icon: '💼',
    placeholder: 'linkedin.com/in/your-profile',
    urlPrefix: 'linkedin.com/in/',
    description: 'Role, experience, certifications, network — Founders & leaders score higher',
    autoFetch: false,
  },
  {
    id: 'kaggle',
    name: 'Kaggle',
    icon: '📊',
    placeholder: 'your-kaggle-username',
    urlPrefix: 'kaggle.com/',
    description: 'Tier, notebooks, competitions, medals',
    autoFetch: false,
  },
  {
    id: 'coursera',
    name: 'Coursera',
    icon: '🎓',
    placeholder: 'Number of certifications',
    urlPrefix: 'coursera.org/',
    description: 'Certifications, specializations completed',
    autoFetch: false,
  },
];

export default function PlatformsSettingsPage() {
  const { authUser, userData } = useAuth();
  const { scoreData, loading: scoreLoading } = useOrbiScore(authUser?.uid);
  const { connectPlatform, refreshData, saveProfile, connecting, refreshing, error } = useOrbiScoreActions();
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [connectError, setConnectError] = useState<string | null>(null);
  const [connectSuccess, setConnectSuccess] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [showBioInput, setShowBioInput] = useState(false);
  const [aiReasoning, setAiReasoning] = useState<string | null>(null);

  // Profile (About You) state
  const [bio, setBio] = useState('');
  const [collegeName, setCollegeName] = useState('');
  const [collegeType, setCollegeType] = useState<CollegeType>('other');
  const [nirfRank, setNirfRank] = useState(0);
  const [collegeQuery, setCollegeQuery] = useState('');
  const [collegeSuggestions, setCollegeSuggestions] = useState<{ name: string; rank: number; type: CollegeType }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSaved, setProfileSaved] = useState(false);
  const collegeInputRef = useRef<HTMLDivElement>(null);

  // Pre-populate profile from existing data
  const profileData = scoreData?.profileData;
  const profilePrefilled = useRef(false);
  useEffect(() => {
    if (profileData && !profilePrefilled.current) {
      profilePrefilled.current = true;
      setBio(profileData.bio || '');
      setCollegeName(profileData.collegeName || '');
      setCollegeQuery(profileData.collegeName || '');
      setCollegeType(profileData.collegeType || 'other');
      setNirfRank(profileData.nirfRank || 0);
    }
  }, [profileData]);

  // College search autocomplete
  useEffect(() => {
    if (collegeQuery.length >= 2) {
      const results = searchColleges(collegeQuery);
      setCollegeSuggestions(results);
      setShowSuggestions(results.length > 0);
    } else {
      setCollegeSuggestions([]);
      setShowSuggestions(false);
    }
  }, [collegeQuery]);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (collegeInputRef.current && !collegeInputRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setConnectError(null);
    setProfileSaved(false);
    try {
      const pd: ProfileData = {
        bio: bio.trim(),
        collegeName,
        collegeType: collegeType || detectCollegeType(collegeName),
        nirfRank,
        updatedAt: new Date().toISOString(),
      };
      await saveProfile(pd);
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3000);
    } catch (err: any) {
      setConnectError(err.message || 'Failed to save profile');
    } finally {
      setSavingProfile(false);
    }
  };

  // Pre-populate LinkedIn fields from existing data
  const linkedinData = scoreData?.platformData?.linkedin;
  const linkedinPrefilled = useRef(false);
  useEffect(() => {
    if (linkedinData && !linkedinPrefilled.current) {
      linkedinPrefilled.current = true;
      setInputValues(prev => ({
        ...prev,
        linkedin: prev.linkedin || linkedinData.profileUrl || '',
        linkedin_role: prev.linkedin_role || linkedinData.currentRole || 'entry',
        linkedin_years: prev.linkedin_years || String(linkedinData.yearsOfExperience || ''),
        linkedin_certs: prev.linkedin_certs || String(linkedinData.certifications || ''),
        linkedin_connections: prev.linkedin_connections || String(linkedinData.connections || ''),
        linkedin_endorsements: prev.linkedin_endorsements || String(linkedinData.endorsements || ''),
        linkedin_experiences: prev.linkedin_experiences || String(linkedinData.experienceCount || ''),
        linkedin_education: prev.linkedin_education || String(linkedinData.educationCount || ''),
      }));
    }
  }, [linkedinData]);

  const handleAIAnalyze = async () => {
    const profileUrl = inputValues.linkedin?.trim();
    const manualBio = inputValues.linkedin_bio?.trim() || bio.trim(); // fallback to About You bio

    if (!profileUrl && !manualBio) {
      setConnectError('Enter your LinkedIn URL or fill in "About You" section above');
      return;
    }

    setAnalyzing(true);
    setConnectError(null);
    setAiReasoning(null);

    try {
      const res = await fetch('/api/analyze-linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileUrl, manualBio }),
      });
      const result = await res.json();

      if (result.needsBio) {
        setShowBioInput(true);
        setConnectError('LinkedIn profile is private. Paste your headline + about section below, or fill in the "About You" section above.');
        return;
      }

      if (!res.ok) throw new Error(result.error || 'Analysis failed');

      const a = result.analysis;
      setInputValues(prev => ({
        ...prev,
        linkedin_role: a.currentRole || prev.linkedin_role || 'entry',
        linkedin_years: String(a.yearsOfExperience || 0),
        linkedin_certs: String(a.certifications || 0),
        linkedin_connections: String(a.connections || 0),
        linkedin_endorsements: String(a.endorsements || 0),
        linkedin_experiences: String(a.experienceCount || 0),
        linkedin_education: String(a.educationCount || 0),
      }));
      setAiReasoning(`AI detected: ${a.headline || a.currentRole}${a.roleReasoning ? ` — ${a.roleReasoning}` : ''}`);
      setShowBioInput(false);
    } catch (err: any) {
      setConnectError(err.message || 'AI analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleConnect = async (platform: typeof PLATFORMS[0]) => {
    const value = inputValues[platform.id]?.trim();
    const isAlreadyConnected = scoreData?.connectedPlatforms?.includes(platform.id);

    // Auto-fetch platforms always need a username/URL
    if (platform.autoFetch && !value) return;
    // Manual platforms need value on first connect, but allow update without it
    if (!platform.autoFetch && !value && !isAlreadyConnected) return;

    setConnectingPlatform(platform.id);
    setConnectError(null);
    setConnectSuccess(null);

    try {
      if (platform.autoFetch) {
        await connectPlatform(platform.id, value);
      } else {
        // Manual data entry for platforms without public APIs
        let manualData: any = {};
        if (platform.id === 'linkedin') {
          // Use existing profileUrl if not re-entered
          const existingData = scoreData?.platformData?.linkedin;
          const profileUrl = value || existingData?.profileUrl || '';
          const role = inputValues[`${platform.id}_role`] || existingData?.currentRole || 'entry';
          manualData = {
            profileUrl,
            currentRole: role,
            isFounder: role === 'founder',
            yearsOfExperience: parseInt(inputValues[`${platform.id}_years`] || '0') || existingData?.yearsOfExperience || 0,
            certifications: parseInt(inputValues[`${platform.id}_certs`] || '0') || existingData?.certifications || 0,
            connections: parseInt(inputValues[`${platform.id}_connections`] || '0') || existingData?.connections || 0,
            endorsements: parseInt(inputValues[`${platform.id}_endorsements`] || '0') || existingData?.endorsements || 0,
            hasHeadline: true,
            hasSummary: true,
            experienceCount: parseInt(inputValues[`${platform.id}_experiences`] || '0') || existingData?.experienceCount || 0,
            educationCount: parseInt(inputValues[`${platform.id}_education`] || '0') || existingData?.educationCount || 0,
          };
        } else if (platform.id === 'kaggle') {
          manualData = {
            username: value,
            tier: inputValues[`${platform.id}_tier`] || 'Novice',
            notebooks: parseInt(inputValues[`${platform.id}_notebooks`] || '0') || 0,
            competitions: parseInt(inputValues[`${platform.id}_competitions`] || '0') || 0,
            datasets: 0,
            medals: { gold: 0, silver: 0, bronze: 0 },
          };
        } else if (platform.id === 'coursera') {
          manualData = {
            certificationsCount: parseInt(value) || 0,
            specializations: parseInt(inputValues[`${platform.id}_specs`] || '0') || 0,
            courses: [],
          };
        }
        await connectPlatform(platform.id, value, manualData);
      }
      setConnectSuccess(platform.id);
      // Clear all fields for this platform
      setInputValues(prev => {
        const next = { ...prev };
        Object.keys(next).forEach(k => {
          if (k === platform.id || k.startsWith(`${platform.id}_`)) {
            delete next[k];
          }
        });
        return next;
      });
    } catch (err: any) {
      setConnectError(err.message || 'Connection failed');
    } finally {
      setConnectingPlatform(null);
    }
  };

  if (!authUser) return null;

  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Sparkles className="w-6 h-6 text-pink-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">Orbi Score</h1>
            <p className="text-sm text-slate-500">Connect your platforms to build your professional score</p>
          </div>
        </div>

        {/* Current Score Summary */}
        {scoreLoading ? (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 mb-8">
            <div className="flex items-center gap-6">
              <Skeleton className="w-[140px] h-[140px] rounded-full" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            </div>
          </div>
        ) : scoreData ? (
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-6 mb-8">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <ScoreRing
                score={scoreData.score}
                level={scoreData.level}
                rankTier={scoreData.rankTier}
                size={140}
              />
              <div className="flex-1 space-y-3 w-full">
                <div className="flex items-center gap-2 flex-wrap">
                  <RankBadge tier={scoreData.rankTier} />
                  <PercentileDisplay percentile={scoreData.percentile} className="text-left" />
                </div>
                <LevelProgress
                  level={scoreData.level}
                  xpInCurrentLevel={scoreData.xpInCurrentLevel}
                  xpToNextLevel={scoreData.xpToNextLevel}
                  rankTier={scoreData.rankTier}
                />
                <StreakCounter streakDays={scoreData.streakDays} longestStreak={scoreData.longestStreak} />
                <BadgesGrid badges={scoreData.badges} />
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-white/5">
              <ScoreBreakdownBars breakdown={scoreData.breakdown} />
            </div>
            <div className="flex justify-end mt-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshData}
                disabled={refreshing}
                className="text-slate-400 hover:text-white"
              >
                <RefreshCw className={cn('w-4 h-4 mr-2', refreshing && 'animate-spin')} />
                Refresh All
              </Button>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-white/10 bg-white/[0.01] p-8 text-center mb-8">
            <div className="text-4xl mb-3">🚀</div>
            <h3 className="text-lg font-semibold text-white mb-1">Get Your Orbi Score</h3>
            <p className="text-sm text-slate-500">Connect at least one platform below to generate your score</p>
          </div>
        )}

        {/* About You Section */}
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5 mb-8">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4 text-violet-400" />
            <h2 className="text-sm font-semibold uppercase tracking-wider text-violet-400">About You</h2>
          </div>

          {/* Bio / Achievements */}
          <div className="mb-4">
            <Label className="text-xs text-slate-400 mb-1 block">
              Tell us about yourself — what you do, your achievements, skills
              <span className="text-slate-600 ml-1">({bio.length}/300)</span>
            </Label>
            <Textarea
              placeholder="e.g. Founder of XYZ, building AI products. Won Smart India Hackathon 2025. Full-stack dev with 2 years of experience..."
              value={bio}
              onChange={(e) => setBio(e.target.value.slice(0, 300))}
              maxLength={300}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-600 text-sm min-h-[80px] resize-none"
            />
          </div>

          {/* College with NIRF Search */}
          <div className="mb-4" ref={collegeInputRef}>
            <Label className="text-xs text-slate-400 mb-1 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" />
              Your College / University
            </Label>
            <div className="relative">
              <Input
                placeholder="Start typing your college name..."
                value={collegeQuery}
                onChange={(e) => {
                  setCollegeQuery(e.target.value);
                  // If user edits away from a selected college, clear rank
                  if (collegeName && e.target.value !== collegeName) {
                    setCollegeName('');
                    setNirfRank(0);
                  }
                }}
                onFocus={() => { if (collegeSuggestions.length > 0) setShowSuggestions(true); }}
                className="h-9 bg-white/5 border-white/10 text-white placeholder:text-slate-600 text-sm"
              />

              {/* Autocomplete dropdown */}
              {showSuggestions && (
                <div className="absolute z-50 top-full left-0 right-0 mt-1 rounded-lg border border-white/10 bg-zinc-900 shadow-xl max-h-[200px] overflow-y-auto">
                  {collegeSuggestions.map((c) => (
                    <button
                      key={c.name}
                      type="button"
                      className="w-full text-left px-3 py-2 hover:bg-white/5 text-sm text-white flex items-center justify-between transition-colors"
                      onClick={() => {
                        setCollegeName(c.name);
                        setCollegeQuery(c.name);
                        setCollegeType(c.type);
                        setNirfRank(c.rank);
                        setShowSuggestions(false);
                      }}
                    >
                      <span>{c.name}</span>
                      <span className="text-xs text-slate-500">
                        {c.type.toUpperCase()} • NIRF #{c.rank}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* College not in list — manual entry */}
            {collegeQuery.length >= 2 && !collegeName && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-slate-500">College not in list?</span>
                <button
                  type="button"
                  className="text-xs text-violet-400 hover:text-violet-300 underline"
                  onClick={() => {
                    const name = collegeQuery.trim();
                    setCollegeName(name);
                    setCollegeType(detectCollegeType(name));
                  }}
                >
                  Use &quot;{collegeQuery.trim()}&quot;
                </button>
              </div>
            )}

            {/* Selected college info */}
            {collegeName && (
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <span className="text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" />
                  {collegeName}
                </span>
                <span className={cn(
                  'text-xs px-2 py-1 rounded-full font-medium',
                  collegeType === 'iit' || collegeType === 'iim' ? 'text-amber-400 bg-amber-500/10' :
                  collegeType === 'nit' ? 'text-blue-400 bg-blue-500/10' :
                  collegeType === 'iiit' ? 'text-cyan-400 bg-cyan-500/10' :
                  'text-slate-400 bg-white/5'
                )}>
                  {collegeType.toUpperCase()}
                </span>
                {nirfRank > 0 ? (
                  <span className="text-xs text-cyan-400 bg-cyan-500/10 px-2 py-1 rounded-full">
                    NIRF #{nirfRank} — {Math.round(nirfRankToScore(nirfRank, collegeType) * 35)}/35 pts
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      placeholder="NIRF rank (optional)"
                      value={nirfRank || ''}
                      onChange={(e) => setNirfRank(parseInt(e.target.value) || 0)}
                      className="h-7 w-36 bg-white/5 border-white/10 text-white text-xs"
                    />
                    <span className="text-[10px] text-slate-600">or leave blank</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Save Profile Button */}
          <Button
            size="sm"
            onClick={handleSaveProfile}
            disabled={savingProfile || (!bio.trim() && !collegeName)}
            className={cn(
              'w-full h-9 rounded-lg transition-all',
              profileSaved
                ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                : 'bg-gradient-to-r from-violet-600 to-pink-500 text-white hover:from-violet-500 hover:to-pink-400'
            )}
          >
            {savingProfile ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : profileSaved ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Profile saved! Score updated.
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Save Profile & Update Score
              </>
            )}
          </Button>
        </div>

        {/* Platform Cards */}
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Connect Platforms</h2>
        <div className="space-y-4">
          {PLATFORMS.map((platform) => {
            const isConnected = scoreData?.connectedPlatforms?.includes(platform.id);
            const isConnecting = connectingPlatform === platform.id;

            return (
              <div
                key={platform.id}
                className={cn(
                  'rounded-xl border p-5 transition-colors',
                  isConnected
                    ? 'border-green-500/20 bg-green-500/[0.03]'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                )}
              >
                <div className="flex items-start gap-4">
                  <span className="text-2xl mt-0.5">{platform.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-white font-semibold">{platform.name}</h3>
                      {isConnected && (
                        <span className="flex items-center gap-1 text-[10px] font-medium text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full">
                          <Check className="w-3 h-3" /> Connected
                        </span>
                      )}
                      {platform.autoFetch && (
                        <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded-full">Auto-fetch</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mb-3">{platform.description}</p>

                    {/* Username input */}
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <Input
                          placeholder={platform.placeholder}
                          value={inputValues[platform.id] || ''}
                          onChange={(e) => setInputValues(prev => ({ ...prev, [platform.id]: e.target.value }))}
                          className="h-9 bg-white/5 border-white/10 text-white placeholder:text-slate-600 text-sm"
                          disabled={isConnecting}
                        />
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleConnect(platform)}
                        disabled={isConnecting || (!inputValues[platform.id]?.trim() && !isConnected)}
                        className={cn(
                          'h-9 rounded-lg',
                          isConnected
                            ? 'bg-white/5 text-white hover:bg-white/10'
                            : 'bg-gradient-to-r from-pink-500 to-orange-500 text-white'
                        )}
                      >
                        {isConnecting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : isConnected ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 mr-1" />
                            Update
                          </>
                        ) : (
                          <>
                            <Link2 className="w-3.5 h-3.5 mr-1" />
                            Connect
                          </>
                        )}
                      </Button>
                    </div>

                    {/* Extra fields for manual platforms */}
                    {!platform.autoFetch && platform.id === 'linkedin' && (
                      <div className="space-y-3 mt-3">
                        {/* AI Analyze button */}
                        <Button
                          size="sm"
                          onClick={handleAIAnalyze}
                          disabled={analyzing || (!inputValues.linkedin?.trim() && !inputValues.linkedin_bio?.trim())}
                          className="w-full h-9 rounded-lg bg-gradient-to-r from-violet-600 to-blue-500 text-white hover:from-violet-500 hover:to-blue-400"
                        >
                          {analyzing ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              AI is analyzing your profile...
                            </>
                          ) : (
                            <>
                              <Brain className="w-4 h-4 mr-2" />
                              Auto-fill with AI (paste URL above)
                            </>
                          )}
                        </Button>

                        {/* Bio textarea for when LinkedIn profile is private */}
                        {showBioInput && (
                          <div>
                            <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Paste your LinkedIn headline + about section</Label>
                            <Textarea
                              placeholder="e.g. Founder & MD at XYZ Corp | Building products for 8+ years | Ex-Google..."
                              value={inputValues.linkedin_bio || ''}
                              onChange={(e) => setInputValues(prev => ({ ...prev, linkedin_bio: e.target.value }))}
                              className="mt-1 bg-white/5 border-white/10 text-white placeholder:text-slate-600 text-sm min-h-[80px]"
                            />
                            <Button
                              size="sm"
                              onClick={handleAIAnalyze}
                              disabled={analyzing || !inputValues.linkedin_bio?.trim()}
                              className="mt-2 h-8 rounded-lg bg-gradient-to-r from-violet-600 to-blue-500 text-white text-xs"
                            >
                              {analyzing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Brain className="w-3 h-3 mr-1" />}
                              Analyze Bio
                            </Button>
                          </div>
                        )}

                        {/* AI reasoning display */}
                        {aiReasoning && (
                          <div className="flex items-start gap-2 text-xs text-violet-300 bg-violet-500/10 rounded-lg px-3 py-2 border border-violet-500/20">
                            <Brain className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                            <span>{aiReasoning}</span>
                          </div>
                        )}

                        {/* Role & Founder — most impactful field */}
                        <div>
                          <Label className="text-[10px] text-slate-500 uppercase tracking-wider">Current Role / Seniority</Label>
                          <Select
                            value={inputValues[`${platform.id}_role`] || 'entry'}
                            onValueChange={(val) => setInputValues(prev => ({ ...prev, [`${platform.id}_role`]: val }))}
                          >
                            <SelectTrigger className="h-9 mt-1 bg-white/5 border-white/10 text-white text-sm">
                              <SelectValue placeholder="Select your role" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="founder">🚀 Founder / Co-Founder / Owner</SelectItem>
                              <SelectItem value="cxo">👔 C-Suite / MD (CEO, CTO, CFO, MD)</SelectItem>
                              <SelectItem value="vp">📊 VP / SVP</SelectItem>
                              <SelectItem value="director">🎯 Director / Head of</SelectItem>
                              <SelectItem value="manager">👥 Manager / Team Lead</SelectItem>
                              <SelectItem value="senior">⭐ Senior (Engineer, Designer, etc.)</SelectItem>
                              <SelectItem value="mid">💼 Mid-level</SelectItem>
                              <SelectItem value="entry">🌱 Entry-level / Junior</SelectItem>
                              <SelectItem value="student">📚 Student / Intern</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <Label className="text-[10px] text-slate-500">Years of Experience</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={inputValues[`${platform.id}_years`] || ''}
                              onChange={(e) => setInputValues(prev => ({ ...prev, [`${platform.id}_years`]: e.target.value }))}
                              className="h-8 bg-white/5 border-white/10 text-white text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-slate-500">Certifications</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={inputValues[`${platform.id}_certs`] || ''}
                              onChange={(e) => setInputValues(prev => ({ ...prev, [`${platform.id}_certs`]: e.target.value }))}
                              className="h-8 bg-white/5 border-white/10 text-white text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-slate-500">Connections</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={inputValues[`${platform.id}_connections`] || ''}
                              onChange={(e) => setInputValues(prev => ({ ...prev, [`${platform.id}_connections`]: e.target.value }))}
                              className="h-8 bg-white/5 border-white/10 text-white text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-slate-500">Endorsements</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={inputValues[`${platform.id}_endorsements`] || ''}
                              onChange={(e) => setInputValues(prev => ({ ...prev, [`${platform.id}_endorsements`]: e.target.value }))}
                              className="h-8 bg-white/5 border-white/10 text-white text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-slate-500">Experiences</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={inputValues[`${platform.id}_experiences`] || ''}
                              onChange={(e) => setInputValues(prev => ({ ...prev, [`${platform.id}_experiences`]: e.target.value }))}
                              className="h-8 bg-white/5 border-white/10 text-white text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-[10px] text-slate-500">Education</Label>
                            <Input
                              type="number"
                              placeholder="0"
                              value={inputValues[`${platform.id}_education`] || ''}
                              onChange={(e) => setInputValues(prev => ({ ...prev, [`${platform.id}_education`]: e.target.value }))}
                              className="h-8 bg-white/5 border-white/10 text-white text-xs"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {!platform.autoFetch && platform.id === 'coursera' && (
                      <div className="mt-2">
                        <Label className="text-[10px] text-slate-500">Specializations Completed</Label>
                        <Input
                          type="number"
                          placeholder="0"
                          value={inputValues[`${platform.id}_specs`] || ''}
                          onChange={(e) => setInputValues(prev => ({ ...prev, [`${platform.id}_specs`]: e.target.value }))}
                          className="h-8 bg-white/5 border-white/10 text-white text-xs mt-1"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Error display */}
        {(connectError || error) && (
          <div className="mt-4 flex items-center gap-2 text-red-400 text-sm bg-red-500/10 rounded-lg px-4 py-3">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{connectError || error}</span>
          </div>
        )}

        {/* Success message */}
        {connectSuccess && (
          <div className="mt-4 flex items-center gap-2 text-green-400 text-sm bg-green-500/10 rounded-lg px-4 py-3">
            <Check className="w-4 h-4 shrink-0" />
            <span>Platform connected successfully! Your score has been updated.</span>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
