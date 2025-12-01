'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { useAuth } from '@/hooks/use-auth';
import type { Recommendation } from './useRecommendationsServer';

// Simplified scoring weights for client-side fallback
const WEIGHTS = {
  SHARED_INTEREST: 2,
  RELATIONSHIP_STATUS: 3,
  MUTUAL_CONNECTION: 5,
  RECENT_ACTIVITY: 4,
};

export function useRecommendationsClientFallback(): Recommendation[] {
  const { authUser } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  useEffect(() => {
    async function fetchRecommendations() {
      if (!authUser?.uid) return;

      try {
        // Fetch current user for their interests and connections
        const userDoc = await getDoc(doc(db, 'users', authUser.uid));
        const currentUser = userDoc.data();

        if (!currentUser) return;

        // Fetch potential recommendations (limit to 10 most recently active users)
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('isBanned', '!=', true),
          orderBy('lastActive', 'desc'),
          limit(10)
        );

        const querySnapshot = await getDocs(q);
        const now = new Date();
        const activeThreshold = new Date(now.setDate(now.getDate() - 7));

        const scoredUsers = querySnapshot.docs
          .map(doc => {
            const userData = doc.data();
            if (doc.id === authUser.uid) return null;

            let score = 0;

            // Shared interests
            const sharedInterests = currentUser.interests?.filter(
              (i: string) => userData.interests?.includes(i)
            ).length ?? 0;
            score += sharedInterests * WEIGHTS.SHARED_INTEREST;

            // Relationship status match
            if (currentUser.relationshipStatus &&
              userData.relationshipStatus &&
              currentUser.relationshipStatus === userData.relationshipStatus) {
              score += WEIGHTS.RELATIONSHIP_STATUS;
            }

            // Mutual connections (simplified for client)
            const mutualCount = countMutualConnections(currentUser, userData);
            score += mutualCount * WEIGHTS.MUTUAL_CONNECTION;

            // Recent activity
            if (userData.lastActive?.toDate() > activeThreshold) {
              score += WEIGHTS.RECENT_ACTIVITY;
            }

            return {
              id: doc.id,
              score,
              mutualCount,
              lastActive: userData.lastActive?.toDate() || new Date()
            };
          })
          .filter((user): user is Recommendation => user !== null)
          .sort((a, b) => {
            if (a.score !== b.score) return b.score - a.score;
            return b.lastActive.getTime() - a.lastActive.getTime();
          });

        setRecommendations(scoredUsers);
      } catch (error) {
        console.error('Error in client fallback recommendations:', error);
        setRecommendations([]);
      }
    }

    fetchRecommendations();
  }, [authUser?.uid]);

  return recommendations;
}

function countMutualConnections(user1: any, user2: any): number {
  const user1Connections = new Set([
    ...(user1.followers || []),
    ...(user1.following || [])
  ]);

  const user2Connections = new Set([
    ...(user2.followers || []),
    ...(user2.following || [])
  ]);

  return [...user1Connections].filter(id => user2Connections.has(id)).length;
}