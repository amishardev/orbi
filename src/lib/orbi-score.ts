import type { Timestamp } from 'firebase/firestore';

// ═══════════════════════════════════════════════════════════════
// ORBI SCORE SYSTEM — Types, Scoring Algorithm & Constants
// ═══════════════════════════════════════════════════════════════

// ─── Platform Types ──────────────────────────────────────────

export type ConnectedPlatform =
  | 'github'
  | 'linkedin'
  | 'leetcode'
  | 'codeforces'
  | 'kaggle'
  | 'coursera';

export type RankTier =
  | 'Captain'
  | 'Major'
  | 'Colonel'
  | 'Brigadier'
  | 'Major General'
  | 'Marshall'
  | 'Master'
  | 'Grand Master';

export type BadgeId =
  | 'top_coder'
  | 'ai_builder'
  | 'open_source_hero'
  | 'streak_master'
  | 'community_leader'
  | 'problem_solver'
  | 'full_stack'
  | 'data_wizard'
  | 'rising_star'
  | 'elite_dev';

// ─── Platform Data Shapes ────────────────────────────────────

export interface GitHubData {
  username: string;
  publicRepos: number;
  followers: number;
  totalStars: number;
  totalCommits: number; // last 12 months
  totalPRs: number;
  contributionStreak: number; // consecutive days
  topLanguages: string[];
  fetchedAt: string;
}

export type LinkedInRole =
  | 'founder'
  | 'cxo'
  | 'vp'
  | 'director'
  | 'manager'
  | 'senior'
  | 'mid'
  | 'entry'
  | 'student';

export interface LinkedInData {
  profileUrl: string;
  currentRole: LinkedInRole;
  isFounder: boolean;
  yearsOfExperience: number;
  certifications: number;
  endorsements: number;
  connections: number; // capped at 500+
  hasHeadline: boolean;
  hasSummary: boolean;
  experienceCount: number;
  educationCount: number;
  fetchedAt: string;
}

export interface LeetCodeData {
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

export interface CodeforcesData {
  handle: string;
  rating: number;
  maxRating: number;
  rank: string; // "newbie" | "pupil" | "specialist" | ...
  problemsSolved: number;
  contestsParticipated: number;
  fetchedAt: string;
}

export interface KaggleData {
  username: string;
  tier: string; // "Novice" | "Contributor" | "Expert" | "Master" | "Grandmaster"
  notebooks: number;
  datasets: number;
  competitions: number;
  medals: { gold: number; silver: number; bronze: number };
  fetchedAt: string;
}

export interface CourseraData {
  certificationsCount: number;
  specializations: number;
  courses: string[];
  fetchedAt: string;
}

// ─── Profile Data (About You + College) ─────────────────────

export interface ProfileData {
  bio: string;              // "Tell us about yourself" (max 300 chars)
  collegeName: string;      // e.g. "IIT Bombay"
  collegeType: CollegeType; // institution tier
  nirfRank: number;         // NIRF ranking number (0 = unknown)
  updatedAt: string;
}

export type CollegeType = 'iit' | 'iim' | 'nit' | 'iiit' | 'private' | 'other';

// ─── NIRF College Database (Engineering + Management) ────────

export const NIRF_COLLEGES: { name: string; rank: number; type: CollegeType }[] = [
  // ── IITs (Engineering) ──
  { name: 'IIT Madras', rank: 1, type: 'iit' },
  { name: 'IIT Delhi', rank: 2, type: 'iit' },
  { name: 'IIT Bombay', rank: 3, type: 'iit' },
  { name: 'IIT Kanpur', rank: 4, type: 'iit' },
  { name: 'IIT Kharagpur', rank: 5, type: 'iit' },
  { name: 'IIT Roorkee', rank: 6, type: 'iit' },
  { name: 'IIT Hyderabad', rank: 7, type: 'iit' },
  { name: 'IIT Guwahati', rank: 8, type: 'iit' },
  { name: 'IIT (BHU) Varanasi', rank: 10, type: 'iit' },
  { name: 'IIT Indore', rank: 12, type: 'iit' },
  { name: 'IIT (ISM) Dhanbad', rank: 15, type: 'iit' },
  { name: 'IIT Patna', rank: 19, type: 'iit' },
  { name: 'IIT Gandhinagar', rank: 25, type: 'iit' },
  { name: 'IIT Mandi', rank: 26, type: 'iit' },
  { name: 'IIT Jodhpur', rank: 27, type: 'iit' },
  { name: 'IIT Ropar', rank: 32, type: 'iit' },
  { name: 'IIT Bhubaneswar', rank: 38, type: 'iit' },
  { name: 'IIT Jammu', rank: 56, type: 'iit' },
  { name: 'IIT Tirupati', rank: 57, type: 'iit' },
  { name: 'IIT Palakkad', rank: 64, type: 'iit' },
  { name: 'IIT Bhilai', rank: 72, type: 'iit' },
  { name: 'IIT Dharwad', rank: 77, type: 'iit' },
  { name: 'IIT Goa', rank: 80, type: 'iit' },

  // ── IIMs (Management) ──
  { name: 'IIM Ahmedabad', rank: 1, type: 'iim' },
  { name: 'IIM Bangalore', rank: 2, type: 'iim' },
  { name: 'IIM Kozhikode', rank: 3, type: 'iim' },
  { name: 'IIM Lucknow', rank: 5, type: 'iim' },
  { name: 'IIM Mumbai', rank: 6, type: 'iim' },
  { name: 'IIM Calcutta', rank: 7, type: 'iim' },
  { name: 'IIM Indore', rank: 8, type: 'iim' },
  { name: 'IIM Raipur', rank: 15, type: 'iim' },
  { name: 'IIM Tiruchirappalli', rank: 16, type: 'iim' },
  { name: 'IIM Ranchi', rank: 18, type: 'iim' },
  { name: 'IIM Rohtak', rank: 19, type: 'iim' },
  { name: 'IIM Udaipur', rank: 21, type: 'iim' },
  { name: 'IIM Kashipur', rank: 23, type: 'iim' },
  { name: 'IIM Nagpur', rank: 25, type: 'iim' },
  { name: 'IIM Visakhapatnam', rank: 29, type: 'iim' },
  { name: 'IIM Bodh Gaya', rank: 31, type: 'iim' },
  { name: 'IIM Sambalpur', rank: 34, type: 'iim' },
  { name: 'IIM Jammu', rank: 35, type: 'iim' },
  { name: 'IIM Shillong', rank: 37, type: 'iim' },
  { name: 'IIM Sirmaur', rank: 51, type: 'iim' },
  { name: 'IIM Amritsar', rank: 63, type: 'iim' },

  // ── NITs (Engineering) ──
  { name: 'NIT Tiruchirappalli', rank: 9, type: 'nit' },
  { name: 'NIT Rourkela', rank: 13, type: 'nit' },
  { name: 'NIT Karnataka Surathkal', rank: 17, type: 'nit' },
  { name: 'NIT Calicut', rank: 21, type: 'nit' },
  { name: 'NIT Warangal', rank: 28, type: 'nit' },
  { name: 'MNIT Jaipur', rank: 41, type: 'nit' },
  { name: 'NIT Durgapur', rank: 48, type: 'nit' },
  { name: 'NIT Silchar', rank: 50, type: 'nit' },
  { name: 'NIT Patna', rank: 53, type: 'nit' },
  { name: 'NIT Jalandhar', rank: 55, type: 'nit' },
  { name: 'NIT Delhi', rank: 65, type: 'nit' },
  { name: 'SVNIT Surat', rank: 66, type: 'nit' },
  { name: 'NIT Srinagar', rank: 73, type: 'nit' },
  { name: 'NIT Jamshedpur', rank: 82, type: 'nit' },
  { name: 'NIT Meghalaya', rank: 83, type: 'nit' },
  { name: 'NIT Kurukshetra', rank: 85, type: 'nit' },
  { name: 'NIT Raipur', rank: 86, type: 'nit' },
  { name: 'NIT Hamirpur', rank: 97, type: 'nit' },
  { name: 'NIT Puducherry', rank: 99, type: 'nit' },

  // ── IIITs ──
  { name: 'IIIT Hyderabad', rank: 54, type: 'iiit' },
  { name: 'IIIT Delhi', rank: 44, type: 'iiit' },
  { name: 'IIIT Bangalore', rank: 46, type: 'iiit' },
  { name: 'IIIT Allahabad', rank: 49, type: 'iiit' },
  { name: 'IIIT Sri City', rank: 60, type: 'iiit' },
  { name: 'IIIT Lucknow', rank: 70, type: 'iiit' },
  { name: 'IIIT Guwahati', rank: 75, type: 'iiit' },
  { name: 'IIIT Kottayam', rank: 79, type: 'iiit' },
  { name: 'IIIT Vadodara', rank: 81, type: 'iiit' },
  { name: 'IIIT Kalyani', rank: 83, type: 'iiit' },
  { name: 'IIIT Sonepat', rank: 88, type: 'iiit' },
  { name: 'IIIT Kanchipuram', rank: 90, type: 'iiit' },

  // ── Top Universities & Privates (Engineering NIRF) ──
  { name: 'Anna University', rank: 6, type: 'private' },
  { name: 'Jadavpur University', rank: 7, type: 'private' },
  { name: 'VIT Vellore', rank: 8, type: 'private' },
  { name: 'Jamia Millia Islamia', rank: 9, type: 'private' },
  { name: 'SRM Institute of Science and Technology', rank: 11, type: 'private' },
  { name: 'BITS Pilani', rank: 14, type: 'private' },
  { name: 'BITS Pilani Goa', rank: 14, type: 'private' },
  { name: 'BITS Pilani Hyderabad', rank: 14, type: 'private' },
  { name: 'IIEST Shibpur', rank: 16, type: 'private' },
  { name: 'Thapar Institute of Engineering and Technology', rank: 22, type: 'private' },
  { name: 'Amrita Vishwa Vidyapeetham', rank: 24, type: 'private' },
  { name: 'Delhi Technological University', rank: 29, type: 'private' },
  { name: 'DTU Delhi', rank: 29, type: 'private' },
  { name: 'Aligarh Muslim University', rank: 30, type: 'private' },
  { name: 'KIIT Bhubaneswar', rank: 33, type: 'private' },
  { name: 'JNTU Hyderabad', rank: 34, type: 'private' },
  { name: 'Punjab Engineering College', rank: 36, type: 'private' },
  { name: 'PEC Chandigarh', rank: 36, type: 'private' },
  { name: 'SASTRA University', rank: 37, type: 'private' },
  { name: 'Manipal Institute of Technology', rank: 39, type: 'private' },
  { name: 'NSUT Delhi', rank: 40, type: 'private' },
  { name: 'Netaji Subhas University of Technology', rank: 40, type: 'private' },
  { name: 'University of Hyderabad', rank: 43, type: 'private' },
  { name: 'Bharati Vidyapeeth University', rank: 45, type: 'private' },
  { name: 'Chandigarh University', rank: 47, type: 'private' },
  { name: 'SASTRA Thanjavur', rank: 52, type: 'private' },
  { name: 'PSG College of Technology', rank: 58, type: 'private' },
  { name: 'Coimbatore Institute of Technology', rank: 59, type: 'private' },
  { name: 'Ramaiah Institute of Technology', rank: 60, type: 'private' },
  { name: 'PES University', rank: 61, type: 'private' },
  { name: 'Lovely Professional University', rank: 62, type: 'private' },
  { name: 'LPU Punjab', rank: 62, type: 'private' },
  { name: 'Vishwakarma Institute of Technology', rank: 67, type: 'private' },
  { name: 'Thiagarajar College of Engineering', rank: 68, type: 'private' },
  { name: 'KL University', rank: 69, type: 'private' },
  { name: 'Nirma University', rank: 70, type: 'private' },
  { name: 'Siddaganga Institute of Technology', rank: 71, type: 'private' },
  { name: 'Dayananda Sagar College of Engineering', rank: 74, type: 'private' },
  { name: 'Vel Tech University', rank: 75, type: 'private' },
  { name: 'Sri Krishna College of Engineering and Technology', rank: 76, type: 'private' },
  { name: 'Mepco Schlenk Engineering College', rank: 78, type: 'private' },
  { name: 'BMS College of Engineering', rank: 79, type: 'private' },
  { name: 'Graphic Era University', rank: 80, type: 'private' },
  { name: 'Institute of Chemical Technology', rank: 81, type: 'private' },
  { name: 'Amity University Noida', rank: 84, type: 'private' },
  { name: 'Amity University', rank: 84, type: 'private' },
  { name: 'Jaypee Institute of Information Technology', rank: 87, type: 'private' },
  { name: 'CV Raman Global University', rank: 88, type: 'private' },
  { name: 'Shiv Nadar University', rank: 89, type: 'private' },
  { name: 'Galgotias University', rank: 90, type: 'private' },
  { name: 'Kumaraguru College of Technology', rank: 91, type: 'private' },
  { name: 'SR University', rank: 92, type: 'private' },
  { name: 'GRIET Hyderabad', rank: 93, type: 'private' },
  { name: 'VNR Vignana Jyothi', rank: 94, type: 'private' },
  { name: 'New Horizon College of Engineering', rank: 95, type: 'private' },
  { name: 'Alliance University', rank: 96, type: 'private' },
  { name: 'Anurag University', rank: 98, type: 'private' },
  { name: 'Kalasalingam University', rank: 100, type: 'private' },
  { name: 'Bennett University', rank: 102, type: 'private' },
  { name: 'Chitkara University', rank: 105, type: 'private' },
  { name: 'MIT Pune', rank: 108, type: 'private' },
  { name: 'COEP Pune', rank: 42, type: 'private' },
  { name: 'Christ University Bangalore', rank: 110, type: 'private' },
  { name: 'UPES Dehradun', rank: 112, type: 'private' },
  { name: 'Symbiosis Institute of Technology', rank: 115, type: 'private' },
  { name: 'Woxsen University', rank: 120, type: 'private' },
  { name: 'Jain University Bangalore', rank: 118, type: 'private' },
  { name: 'SRM AP', rank: 130, type: 'private' },
  { name: 'BIT Mesra', rank: 51, type: 'private' },
  { name: 'DAIICT Gandhinagar', rank: 63, type: 'private' },
  { name: 'LNMIIT Jaipur', rank: 76, type: 'private' },
];

// ─── College Type Tier Multipliers ───────────────────────────
// IIT = IIM > NIT > IIIT > Private
// This is an EXTRA multiplier on top of NIRF rank scoring

const COLLEGE_TYPE_BONUS: Record<CollegeType, number> = {
  iit:     1.0,    // Full multiplier — top tier
  iim:     1.0,    // Equal to IIT
  nit:     0.80,   // 80% — strong government
  iiit:    0.65,   // 65% — good specialized
  private: 0.50,   // 50% — private colleges
  other:   0.30,   // 30% — unknown/unranked
};

/** Detect college type from name */
export function detectCollegeType(name: string): CollegeType {
  const lower = name.toLowerCase();
  if (/\biit\b/.test(lower) && !/\biiit\b/.test(lower)) return 'iit';
  if (/\biim\b/.test(lower)) return 'iim';
  if (/\bnit\b/.test(lower) || /\bmnit\b/.test(lower) || /\bsvnit\b/.test(lower) || /\bvnit\b/.test(lower) || /\bmnnit\b/.test(lower)) return 'nit';
  if (/\biiit\b/.test(lower)) return 'iiit';
  // Check NIRF_COLLEGES for a match
  const match = NIRF_COLLEGES.find(c => c.name.toLowerCase() === lower);
  if (match) return match.type;
  return 'other';
}

/** Convert NIRF rank + college type to a 0–1 score multiplier.
 *  Score = rankScore * typeBonus where:
 *    - rankScore = how high the NIRF rank is
 *    - typeBonus = IIT/IIM=1.0 > NIT=0.8 > IIIT=0.65 > Private=0.5
 */
export function nirfRankToScore(nirfRank: number, collegeType: CollegeType = 'other'): number {
  if (nirfRank <= 0 && collegeType === 'other') return 0;

  // Base rank score (NIRF ranking quality)
  let rankScore: number;
  if (nirfRank <= 0) rankScore = 0.1;
  else if (nirfRank <= 10) rankScore = 1.0;
  else if (nirfRank <= 25) rankScore = 0.85;
  else if (nirfRank <= 50) rankScore = 0.70;
  else if (nirfRank <= 100) rankScore = 0.50;
  else if (nirfRank <= 200) rankScore = 0.30;
  else rankScore = 0.15;

  // Type bonus (IIT/IIM gets full credit, private gets half)
  const typeBonus = COLLEGE_TYPE_BONUS[collegeType] || 0.30;

  // Combined: weighted average favoring type (60% type, 40% rank)
  // This ensures IIT rank 77 scores higher than Private rank 8
  return Math.min(1.0, typeBonus * 0.6 + rankScore * 0.4);
}

/** Search colleges by name (fuzzy match) */
export function searchColleges(query: string): { name: string; rank: number; type: CollegeType }[] {
  if (!query || query.length < 2) return [];
  const lower = query.toLowerCase();
  // Deduplicate by name (some colleges appear with aliases)
  const seen = new Set<string>();
  return NIRF_COLLEGES
    .filter(c => {
      if (seen.has(c.name)) return false;
      const matches = c.name.toLowerCase().includes(lower);
      if (matches) seen.add(c.name);
      return matches;
    })
    .slice(0, 10);
}

// ─── Score Breakdown ─────────────────────────────────────────

export interface ScoreBreakdown {
  github: number;       // 0–250
  leetcode: number;     // 0–200
  codeforces: number;   // 0–150
  linkedin: number;     // 0–200
  kaggle: number;       // 0–100
  coursera: number;     // 0–25
  activity: number;     // 0–25
  profile: number;      // 0–50 (college NIRF + bio)
}

// ─── Orbi Score Document ─────────────────────────────────────

export interface OrbiScoreDoc {
  userId: string;
  score: number;           // 0–1000
  level: number;           // 1–500
  percentile: number;      // 30–99.9
  rankTier: RankTier;
  xpToNextLevel: number;
  xpInCurrentLevel: number;
  breakdown: ScoreBreakdown;
  badges: BadgeId[];
  streakDays: number;
  longestStreak: number;
  connectedPlatforms: ConnectedPlatform[];
  platformData: {
    github?: GitHubData;
    linkedin?: LinkedInData;
    leetcode?: LeetCodeData;
    codeforces?: CodeforcesData;
    kaggle?: KaggleData;
    coursera?: CourseraData;
  };
  profileData?: ProfileData;
  lastCalculated: Timestamp | string;
  createdAt: Timestamp | string;
  updatedAt: Timestamp | string;
}

// ─── Badge Definitions ───────────────────────────────────────

export const BADGE_DEFINITIONS: Record<BadgeId, {
  name: string;
  description: string;
  icon: string;
  color: string;
}> = {
  top_coder: {
    name: 'Top Coder',
    description: 'Solved 200+ problems on competitive platforms',
    icon: '⚡',
    color: '#FFD700',
  },
  ai_builder: {
    name: 'AI Builder',
    description: 'Active Kaggle contributor with notebooks and competitions',
    icon: '🧠',
    color: '#A855F7',
  },
  open_source_hero: {
    name: 'Open Source Hero',
    description: '50+ PRs and 500+ stars on GitHub',
    icon: '🌟',
    color: '#22D3EE',
  },
  streak_master: {
    name: 'Streak Master',
    description: 'Maintained a 30-day activity streak',
    icon: '🔥',
    color: '#F97316',
  },
  community_leader: {
    name: 'Community Leader',
    description: '100+ followers on GitHub',
    icon: '👥',
    color: '#3B82F6',
  },
  problem_solver: {
    name: 'Problem Solver',
    description: 'Solved 50+ hard problems on LeetCode',
    icon: '🧩',
    color: '#EF4444',
  },
  full_stack: {
    name: 'Full Stack',
    description: 'Proficient in 5+ languages on GitHub',
    icon: '🛠️',
    color: '#10B981',
  },
  data_wizard: {
    name: 'Data Wizard',
    description: 'Kaggle Expert tier or above',
    icon: '📊',
    color: '#8B5CF6',
  },
  rising_star: {
    name: 'Rising Star',
    description: 'Reached Level 50 within first month',
    icon: '🚀',
    color: '#EC4899',
  },
  elite_dev: {
    name: 'Elite Dev',
    description: 'Achieved Master rank or above',
    icon: '💎',
    color: '#06B6D4',
  },
};

// ─── Rank Tier Config (Percentile-based) ────────────────────

export const RANK_TIERS: { tier: RankTier; minPercentile: number; color: string; gradient: string }[] = [
  { tier: 'Captain',        minPercentile: 0,    color: '#8B7355', gradient: 'from-amber-800 to-amber-600' },
  { tier: 'Major',          minPercentile: 65,   color: '#C0C0C0', gradient: 'from-slate-400 to-slate-300' },
  { tier: 'Colonel',        minPercentile: 75,   color: '#FFD700', gradient: 'from-yellow-500 to-amber-400' },
  { tier: 'Brigadier',      minPercentile: 80,   color: '#E5E4E2', gradient: 'from-cyan-300 to-teal-400' },
  { tier: 'Major General',  minPercentile: 85,   color: '#50C878', gradient: 'from-emerald-400 to-green-500' },
  { tier: 'Marshall',       minPercentile: 90,   color: '#B9F2FF', gradient: 'from-blue-400 to-cyan-300' },
  { tier: 'Master',         minPercentile: 95,   color: '#A855F7', gradient: 'from-purple-500 to-violet-400' },
  { tier: 'Grand Master',   minPercentile: 99,   color: '#FF6B6B', gradient: 'from-red-500 to-orange-500' },
];

// ─── Scoring Weights ─────────────────────────────────────────

const WEIGHTS = {
  github: {
    repos:          { max: 50,  cap: 50 },    // up to 50 repos → 50 pts
    stars:          { max: 50,  cap: 500 },   // up to 500 stars → 50 pts
    commits:        { max: 50,  cap: 1000 },  // up to 1000 commits/yr → 50 pts
    prs:            { max: 35,  cap: 200 },   // up to 200 PRs → 35 pts
    followers:      { max: 35,  cap: 200 },   // up to 200 followers → 35 pts
    streak:         { max: 30,  cap: 100 },   // up to 100-day streak → 30 pts
  },
  // subtotal max: 250

  leetcode: {
    hardSolved:     { max: 70,  cap: 80 },    // HARD most valuable: 70 pts
    mediumSolved:   { max: 40,  cap: 200 },   // medium: 40 pts
    easySolved:     { max: 15,  cap: 200 },   // easy: minimal credit
    contestRating:  { max: 55,  cap: 2500 },  // contest performance: 55 pts
    contests:       { max: 20,  cap: 50 },    // participation: 20 pts
  },
  // subtotal max: 200

  codeforces: {
    rank:           { max: 70,  cap: 1 },     // rank multiplier 0–1 (LGM=1.0)
    problemsSolved: { max: 40,  cap: 500 },
    contests:       { max: 20,  cap: 100 },
    maxRating:      { max: 20,  cap: 2400 },  // peak performance bonus
  },
  // subtotal max: 150

  linkedin: {
    role:           { max: 60,  cap: 1 },     // role multiplier 0–1 (founder = 1.0)
    experience:     { max: 40,  cap: 15 },    // years of experience, capped at 15
    certifications: { max: 25,  cap: 10 },
    connections:    { max: 20,  cap: 500 },
    endorsements:   { max: 25,  cap: 50 },
    completeness:   { max: 30,  cap: 1 },     // ratio: 0–1
  },
  // subtotal max: 200

  kaggle: {
    tier:           { max: 35,  cap: 5 },     // Novice=1, ..., Grandmaster=5
    goldMedals:     { max: 25,  cap: 10 },    // gold most valuable
    silverMedals:   { max: 10,  cap: 15 },    // silver
    bronzeMedals:   { max: 5,   cap: 20 },    // bronze minimal
    notebooks:      { max: 10,  cap: 50 },
    competitions:   { max: 15,  cap: 20 },
  },
  // subtotal max: 100

  coursera: {
    certifications: { max: 15, cap: 10 },
    specializations:{ max: 10, cap: 5 },
  },
  // subtotal max: 25

  activity: {
    streakDays:     { max: 15, cap: 30 },
    consistency:    { max: 10, cap: 1 },      // 0–1 ratio
  },
  // subtotal max: 25

  profile: {
    college:        { max: 35, cap: 1 },      // NIRF rank → 0–1 multiplier
    bio:            { max: 15, cap: 1 },      // filled bio = 1.0
  },
  // subtotal max: 50
};
// TOTAL MAX = 250+200+150+200+100+25+25+50 = 1000

// ─── Scoring Functions ───────────────────────────────────────

function clampScore(value: number, max: number, cap: number): number {
  return Math.min(value / cap, 1) * max;
}

export function calculateGitHubScore(data: GitHubData | undefined): number {
  if (!data) return 0;
  const w = WEIGHTS.github;
  return Math.round(
    clampScore(data.publicRepos, w.repos.max, w.repos.cap) +
    clampScore(data.totalStars, w.stars.max, w.stars.cap) +
    clampScore(data.totalCommits, w.commits.max, w.commits.cap) +
    clampScore(data.totalPRs, w.prs.max, w.prs.cap) +
    clampScore(data.followers, w.followers.max, w.followers.cap) +
    clampScore(data.contributionStreak, w.streak.max, w.streak.cap)
  );
}

export function calculateLeetCodeScore(data: LeetCodeData | undefined): number {
  if (!data) return 0;
  const w = WEIGHTS.leetcode;
  // Hard > Medium > Easy — no double-counting via totalSolved
  return Math.round(
    clampScore(data.hardSolved, w.hardSolved.max, w.hardSolved.cap) +
    clampScore(data.mediumSolved, w.mediumSolved.max, w.mediumSolved.cap) +
    clampScore(data.easySolved, w.easySolved.max, w.easySolved.cap) +
    clampScore(data.contestRating, w.contestRating.max, w.contestRating.cap) +
    clampScore(data.contestsAttended, w.contests.max, w.contests.cap)
  );
}

// ─── Codeforces Rank Scoring ─────────────────────────────────
// Maps CF rank string to a 0–1 multiplier (Legendary GM = 1.0)

const CF_RANK_MAP: Record<string, number> = {
  'newbie':                  0.05,
  'pupil':                   0.15,
  'specialist':              0.30,
  'expert':                  0.50,
  'candidate master':        0.65,
  'master':                  0.80,
  'international master':    0.90,
  'grandmaster':             0.95,
  'international grandmaster': 0.98,
  'legendary grandmaster':   1.0,
};

export function calculateCodeforcesScore(data: CodeforcesData | undefined): number {
  if (!data) return 0;
  const w = WEIGHTS.codeforces;
  const rankMultiplier = CF_RANK_MAP[data.rank?.toLowerCase()] || 0.05;
  return Math.round(
    clampScore(rankMultiplier, w.rank.max, w.rank.cap) +
    clampScore(data.problemsSolved, w.problemsSolved.max, w.problemsSolved.cap) +
    clampScore(data.contestsParticipated, w.contests.max, w.contests.cap) +
    clampScore(data.maxRating, w.maxRating.max, w.maxRating.cap)
  );
}

// ─── LinkedIn Role Scoring ────────────────────────────────────
// Founder/CEO/MD → highest score, scales down to Student

const ROLE_SCORE_MAP: Record<string, number> = {
  founder:  1.0,   // Founder, Co-Founder, Owner
  cxo:      0.85,  // CEO, CTO, CFO, COO, MD
  vp:       0.7,   // VP, SVP, EVP
  director: 0.55,  // Director, Head of
  manager:  0.4,   // Manager, Team Lead
  senior:   0.3,   // Senior Engineer/Designer/etc.
  mid:      0.2,   // Mid-level
  entry:    0.1,   // Entry-level, Junior
  student:  0.05,  // Student, Intern
};

export function calculateLinkedInScore(data: LinkedInData | undefined): number {
  if (!data) return 0;
  const w = WEIGHTS.linkedin;

  // Role/Seniority (founder/CEO/MD gets maximum here)
  const roleMultiplier = data.isFounder ? 1.0 : (ROLE_SCORE_MAP[data.currentRole] || 0.1);
  const roleScore = clampScore(roleMultiplier, w.role.max, w.role.cap);

  // Years of experience
  const expScore = clampScore(data.yearsOfExperience || 0, w.experience.max, w.experience.cap);

  // Certifications
  const certScore = clampScore(data.certifications, w.certifications.max, w.certifications.cap);

  // Network size
  const connScore = clampScore(data.connections, w.connections.max, w.connections.cap);

  // Endorsements (was unused before — bug fix)
  const endorseScore = clampScore(data.endorsements || 0, w.endorsements.max, w.endorsements.cap);

  // Profile completeness
  const completeness =
    (data.hasHeadline ? 0.2 : 0) +
    (data.hasSummary ? 0.2 : 0) +
    Math.min(data.experienceCount / 3, 1) * 0.3 +
    Math.min(data.educationCount / 2, 1) * 0.3;
  const completeScore = clampScore(completeness, w.completeness.max, w.completeness.cap);

  return Math.round(roleScore + expScore + certScore + connScore + endorseScore + completeScore);
}

const KAGGLE_TIER_MAP: Record<string, number> = {
  'Novice': 1, 'Contributor': 2, 'Expert': 3, 'Master': 4, 'Grandmaster': 5,
};

export function calculateKaggleScore(data: KaggleData | undefined): number {
  if (!data) return 0;
  const w = WEIGHTS.kaggle;
  const tierNum = KAGGLE_TIER_MAP[data.tier] || 1;
  // Gold > Silver > Bronze medal weighting
  return Math.round(
    clampScore(tierNum, w.tier.max, w.tier.cap) +
    clampScore(data.medals.gold, w.goldMedals.max, w.goldMedals.cap) +
    clampScore(data.medals.silver, w.silverMedals.max, w.silverMedals.cap) +
    clampScore(data.medals.bronze, w.bronzeMedals.max, w.bronzeMedals.cap) +
    clampScore(data.notebooks, w.notebooks.max, w.notebooks.cap) +
    clampScore(data.competitions, w.competitions.max, w.competitions.cap)
  );
}

export function calculateCourseraScore(data: CourseraData | undefined): number {
  if (!data) return 0;
  const w = WEIGHTS.coursera;
  return Math.round(
    clampScore(data.certificationsCount, w.certifications.max, w.certifications.cap) +
    clampScore(data.specializations, w.specializations.max, w.specializations.cap)
  );
}

export function calculateActivityScore(streakDays: number, consistency: number): number {
  const w = WEIGHTS.activity;
  return Math.round(
    clampScore(streakDays, w.streakDays.max, w.streakDays.cap) +
    clampScore(consistency, w.consistency.max, w.consistency.cap)
  );
}

export function calculateProfileScore(profileData: ProfileData | undefined): number {
  if (!profileData) return 0;
  const w = WEIGHTS.profile;
  const collegeMultiplier = nirfRankToScore(profileData.nirfRank || 0, profileData.collegeType || 'other');
  const bioFilled = profileData.bio && profileData.bio.trim().length >= 20 ? 1 : 0;
  return Math.round(
    clampScore(collegeMultiplier, w.college.max, w.college.cap) +
    clampScore(bioFilled, w.bio.max, w.bio.cap)
  );
}

// ─── Main Score Calculator ───────────────────────────────────

export function calculateOrbiScore(
  platformData: OrbiScoreDoc['platformData'],
  streakDays: number,
  consistency: number,
  profileData?: ProfileData
): { score: number; breakdown: ScoreBreakdown } {
  const breakdown: ScoreBreakdown = {
    github: calculateGitHubScore(platformData.github),
    leetcode: calculateLeetCodeScore(platformData.leetcode),
    codeforces: calculateCodeforcesScore(platformData.codeforces),
    linkedin: calculateLinkedInScore(platformData.linkedin),
    kaggle: calculateKaggleScore(platformData.kaggle),
    coursera: calculateCourseraScore(platformData.coursera),
    activity: calculateActivityScore(streakDays, consistency),
    profile: calculateProfileScore(profileData),
  };

  const score = Math.min(
    1000,
    breakdown.github +
    breakdown.leetcode +
    breakdown.codeforces +
    breakdown.linkedin +
    breakdown.kaggle +
    breakdown.coursera +
    breakdown.activity +
    breakdown.profile
  );

  return { score, breakdown };
}

// ─── Level System ────────────────────────────────────────────
// Level 1–500, progressive XP curve
// XP for level L = 50 + L * 10 (so early levels are fast, later ones slower)
// Total XP at level L = sum(50 + i*10, i=1..L)

export function xpForLevel(level: number): number {
  return 50 + level * 10;
}

export function totalXpForLevel(level: number): number {
  // sum from i=1 to level of (50 + i*10) = 50*level + 10*(level*(level+1)/2)
  return 50 * level + 5 * level * (level + 1);
}

export function scoreToLevel(score: number): { level: number; xpInCurrentLevel: number; xpToNextLevel: number } {
  // Score maps linearly to total XP: 1 score point = 15 XP
  const totalXp = score * 15;
  let level = 1;
  let accumulatedXp = 0;

  while (level <= 500) {
    const needed = xpForLevel(level);
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

// ─── Rank Tier (Percentile-based) ───────────────────────

export function getRankTier(percentile: number): RankTier {
  for (let i = RANK_TIERS.length - 1; i >= 0; i--) {
    if (percentile >= RANK_TIERS[i].minPercentile) return RANK_TIERS[i].tier;
  }
  return 'Captain';
}

export function getRankConfig(tier: RankTier) {
  return RANK_TIERS.find(r => r.tier === tier) || RANK_TIERS[RANK_TIERS.length - 1];
}

// ─── Percentile (Floor at 30) ────────────────────────────────

export function calculatePercentile(userScore: number, allScores: number[]): number {
  // Solo user or no other users → top of the leaderboard
  if (allScores.length === 0) return 99.9;
  const below = allScores.filter(s => s < userScore).length;
  const rawPercentile = (below / allScores.length) * 100;
  // Floor at 30, cap at 99.9
  return Math.min(99.9, Math.max(30, Math.round(rawPercentile * 10) / 10));
}

// ─── Badge Evaluation ────────────────────────────────────────

export function evaluateBadges(
  platformData: OrbiScoreDoc['platformData'],
  score: number,
  streakDays: number,
  rankTier: RankTier
): BadgeId[] {
  const badges: BadgeId[] = [];
  const gh = platformData.github;
  const lc = platformData.leetcode;
  const kg = platformData.kaggle;

  // Top Coder: 200+ problems on competitive platforms
  const totalProblems = (lc?.totalSolved || 0) + (platformData.codeforces?.problemsSolved || 0);
  if (totalProblems >= 200) badges.push('top_coder');

  // AI Builder: Active Kaggle contributor
  if (kg && kg.notebooks >= 5 && kg.competitions >= 3) badges.push('ai_builder');

  // Open Source Hero: 50+ PRs & 500+ stars
  if (gh && gh.totalPRs >= 50 && gh.totalStars >= 500) badges.push('open_source_hero');

  // Streak Master: 30-day streak
  if (streakDays >= 30) badges.push('streak_master');

  // Community Leader: 100+ GitHub followers
  if (gh && gh.followers >= 100) badges.push('community_leader');

  // Problem Solver: 50+ hard LeetCode problems
  if (lc && lc.hardSolved >= 50) badges.push('problem_solver');

  // Full Stack: 5+ languages
  if (gh && gh.topLanguages.length >= 5) badges.push('full_stack');

  // Data Wizard: Kaggle Expert+
  if (kg && KAGGLE_TIER_MAP[kg.tier] >= 3) badges.push('data_wizard');

  // Elite Dev: Master rank+
  if (rankTier === 'Master' || rankTier === 'Grand Master') badges.push('elite_dev');

  return badges;
}

// ─── Score Max Per Category (for UI charts) ──────────────────

export const SCORE_MAXES: Record<keyof ScoreBreakdown, number> = {
  github: 250,
  leetcode: 200,
  codeforces: 150,
  linkedin: 200,
  kaggle: 100,
  coursera: 25,
  activity: 25,
  profile: 50,
};

export const PLATFORM_LABELS: Record<keyof ScoreBreakdown, string> = {
  github: 'GitHub',
  leetcode: 'LeetCode',
  codeforces: 'Codeforces',
  linkedin: 'LinkedIn',
  kaggle: 'Kaggle',
  coursera: 'Coursera',
  activity: 'Activity',
  profile: 'Profile & College',
};

export const PLATFORM_COLORS: Record<keyof ScoreBreakdown, string> = {
  github: '#22D3EE',
  leetcode: '#F97316',
  codeforces: '#3B82F6',
  linkedin: '#0A66C2',
  kaggle: '#20BEFF',
  coursera: '#0056D2',
  activity: '#10B981',
  profile: '#A855F7',
};
