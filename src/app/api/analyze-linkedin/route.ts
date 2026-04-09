import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// Attempt to scrape basic public LinkedIn data from the profile page
async function fetchLinkedInPage(profileUrl: string): Promise<string | null> {
  try {
    // Try fetching the public profile page
    const res = await fetch(profileUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });
    if (!res.ok) return null;
    const html = await res.text();

    // Extract text content from meta tags and visible text
    // LinkedIn public profiles have useful meta tags
    const metaDesc = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/) ||
                     html.match(/<meta[^>]*property="og:description"[^>]*content="([^"]*)"/) || [];
    const metaTitle = html.match(/<meta[^>]*property="og:title"[^>]*content="([^"]*)"/) ||
                      html.match(/<title>([^<]*)<\/title>/) || [];

    // Extract JSON-LD structured data if available
    const jsonLdMatch = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    let jsonLdText = '';
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        jsonLdText = JSON.stringify(jsonLd, null, 2);
      } catch { /* ignore parse errors */ }
    }

    const profileText = [
      metaTitle[1] || '',
      metaDesc[1] || '',
      jsonLdText,
    ].filter(Boolean).join('\n\n');

    return profileText.length > 50 ? profileText : null;
  } catch {
    return null;
  }
}

function normalizeLinkedInUrl(input: string): string {
  const trimmed = input.trim().replace(/\/+$/, '');
  if (trimmed.startsWith('http')) return trimmed;
  if (trimmed.includes('linkedin.com')) return `https://${trimmed}`;
  // Assume it's just the vanity name
  return `https://www.linkedin.com/in/${trimmed}`;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { profileUrl, manualBio } = body;

    if (!profileUrl && !manualBio) {
      return NextResponse.json({ error: 'Profile URL or bio text required' }, { status: 400 });
    }

    let profileContext = '';

    // Try to fetch LinkedIn profile page first
    if (profileUrl) {
      const url = normalizeLinkedInUrl(profileUrl);
      const scraped = await fetchLinkedInPage(url);
      if (scraped) {
        profileContext = `LinkedIn Profile Data:\n${scraped}`;
      }
    }

    // If user provided manual bio/about text, use that too
    if (manualBio) {
      profileContext += `\n\nUser's self-description:\n${manualBio}`;
    }

    // If we got nothing from scraping and no manual bio, ask user for bio
    if (!profileContext.trim()) {
      return NextResponse.json({
        error: 'Could not access LinkedIn profile. Please paste your LinkedIn headline and about section below.',
        needsBio: true,
      }, { status: 422 });
    }

    // Use Gemini to analyze the profile
    const model = genai.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const prompt = `You are analyzing a professional's LinkedIn profile to score them for a career platform. 
Based on the following profile information, extract these details as accurately as possible.

${profileContext}

Return a JSON object with EXACTLY these fields (no markdown, no explanation, just raw JSON):
{
  "currentRole": one of "founder" | "cxo" | "vp" | "director" | "manager" | "senior" | "mid" | "entry" | "student",
  "roleReasoning": "brief explanation of why you chose this role level",
  "isFounder": true/false (true if they founded, co-founded, or own a company),
  "yearsOfExperience": number (estimate from their career timeline),
  "certifications": number (count of certifications mentioned),
  "connections": number (estimate, default 150 if unknown),
  "endorsements": number (estimate from profile data, default 0 if unknown),
  "experienceCount": number (number of distinct positions/roles),
  "educationCount": number (number of education entries),
  "headline": "their professional headline",
  "summary": "1-2 sentence summary of their professional profile"
}

IMPORTANT RULES for currentRole:
- "founder" = Founded/Co-Founded/Own a company, startup, or organization
- "cxo" = C-Suite titles (CEO, CTO, CFO, COO, CMO) or Managing Director (MD)
- "vp" = Vice President, SVP, EVP
- "director" = Director, Head of Department
- "manager" = Manager, Team Lead, Engineering Lead
- "senior" = Senior Engineer, Senior Designer, 5+ years experience
- "mid" = Mid-level professional, 2-5 years experience
- "entry" = Entry-level, Junior, 0-2 years experience
- "student" = Currently a student or recent graduate with no full-time experience

If someone is both a founder AND holds another title (like Founder & CEO), classify as "founder".
If someone is an MD (Managing Director) of their own company, classify as "founder".`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();

    // Parse the JSON from the response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'AI analysis failed to produce valid output' }, { status: 500 });
    }

    const analysis = JSON.parse(jsonMatch[0]);

    return NextResponse.json({
      success: true,
      analysis: {
        currentRole: analysis.currentRole || 'entry',
        isFounder: analysis.isFounder || false,
        yearsOfExperience: analysis.yearsOfExperience || 0,
        certifications: analysis.certifications || 0,
        connections: analysis.connections || 150,
        endorsements: analysis.endorsements || 0,
        experienceCount: analysis.experienceCount || 0,
        educationCount: analysis.educationCount || 0,
        headline: analysis.headline || '',
        summary: analysis.summary || '',
        roleReasoning: analysis.roleReasoning || '',
      },
    });
  } catch (err: any) {
    console.error('LinkedIn analysis error:', err);
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 });
  }
}
