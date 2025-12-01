
'use server';
/**
 * @fileOverview A user recommendation AI agent.
 *
 * - recommendUsers - A function that generates user recommendations.
 * - RecommendUsersInput - The input type for the recommendUsers function.
 * - UserRecommendation - The output type for an individual recommendation.
 */

import { ai } from '@/ai/genkit';
import { adminDb } from '@/lib/firebase-server';
import { User } from '@/lib/types';
import { z, genkit } from 'genkit';
import { getCosineSimilarity } from '@/lib/vector-utils';

export const RecommendUsersInputSchema = z.object({
  uid: z.string().describe('The ID of the user to generate recommendations for.'),
});
export type RecommendUsersInput = z.infer<typeof RecommendUsersInputSchema>;

export const UserRecommendationSchema = z.object({
  userId: z.string(),
  username: z.string(),
  score: z.number(),
  reason: z.string(),
});
export type UserRecommendation = z.infer<typeof UserRecommendationSchema>;

// Main exported function to be called by server actions
export async function recommendUsers(input: RecommendUsersInput): Promise<UserRecommendation[]> {
  return recommendUsersFlow(input);
}

// Helper to get user data from Firestore
async function getUser(uid: string): Promise<(User & { id: string }) | null> {
  const userDoc = await adminDb.collection('users').doc(uid).get();
  if (!userDoc.exists) return null;
  return { id: userDoc.id, ...(userDoc.data() as Omit<User, 'id'>) } as User;
}

// Helper to construct a text representation of a user for embedding
function getUserProfileText(user: User): string {
  return [
    user.displayName || '',
    user.bio || '',
    user.interests?.join(', ') || '',
  ]
    .join(' ')
    .trim();
}

// Helper to generate or retrieve an embedding for a user
async function getEmbedding(user: User): Promise<number[] | null> {
  const profileText = getUserProfileText(user);
  if (!profileText) return null;

  // For production, you would cache this embedding in Firestore
  // and only recompute it when the user's profile changes.
  // For this prototype, we compute it on the fly.
  const response = await ai.embed({
    embedder: 'text-embedding-004',
    content: profileText,
  });
  return response[0].embedding;
}

const recommendUsersFlow = ai.defineFlow(
  {
    name: 'recommendUsersFlow',
    inputSchema: RecommendUsersInputSchema,
    outputSchema: z.array(UserRecommendationSchema),
  },
  async ({ uid }) => {
    // 1. Get the target user and their embedding
    const targetUser = await getUser(uid);
    if (!targetUser) return [];

    const targetEmbedding = await getEmbedding(targetUser);
    if (!targetEmbedding) return [];

    // 2. Candidate Selection: Fetch a pool of potential users
    // In a real app, this would be a more sophisticated query.
    // For this prototype, we'll fetch the most recent 100 users.
    const candidatesSnapshot = await adminDb
      .collection('users')
      .orderBy('joinDate', 'desc')
      .limit(100)
      .get();

    let candidates: (User & { id: string })[] = [];
    candidatesSnapshot.forEach(doc => {
      // Exclude the target user and users without necessary data
      if (doc.id !== uid && doc.data().displayName) {
        // The 'id' property is the Firestore document ID, which is not part of the User data itself.
        // It's correctly added here and is not a duplicate.
        candidates.push({ id: doc.id, ...(doc.data() as Omit<User, 'id'>) } as User);
      }
    });

    // 3. Scoring: Score each candidate against the target user
    const scoredCandidates = await Promise.all(
      candidates.map(async (candidate) => {
        // a. Semantic similarity score (from embeddings)
        let semanticScore = 0;
        const candidateEmbedding = await getEmbedding(candidate);
        if (candidateEmbedding) {
          semanticScore = getCosineSimilarity(targetEmbedding, candidateEmbedding);
        }

        // b. Shared interests score
        const sharedInterests =
          targetUser.interests?.filter((i) => candidate.interests?.includes(i))
            .length || 0;
        const interestScore = sharedInterests > 0 ? 1 : 0; // Simple binary score

        // c. Final weighted score
        const finalScore = semanticScore * 0.7 + interestScore * 0.3;

        // d. Build the reason string
        let reason = 'Similar interests and profile.';
        if (sharedInterests > 0) {
          reason = `You both like ${targetUser.interests?.find(i => candidate.interests?.includes(i))}`;
        }

        return {
          userId: candidate.id,
          username: candidate.username,
          score: finalScore,
          reason,
        };
      })
    );

    // 4. Ranking and Selection: Sort by score and take the top 3
    const rankedCandidates = scoredCandidates
      .filter((c) => c.score > 0.3) // Filter out very low scores
      .sort((a, b) => b.score - a.score);

    return rankedCandidates.slice(0, 3);
  }
);
