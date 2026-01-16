'use client';

import { useState, useEffect } from 'react';
import {
  collection,
  query,
  where,
  limit,
  getDocs,
  doc,
  getDoc,
  documentId,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { useAuth } from '@/hooks/use-auth';

export interface Recommendation {
  id: string;
  score: number;
  mutualCount: number;
  username: string;
  displayName: string;
  photoURL?: string;
  isVerified?: boolean;
  isAgent?: boolean;
}

interface UserData {
  userId?: string; // Firestore uses userId field
  username: string;
  displayName: string;
  photoURL?: string;
  tags?: string[];
  joinedCommunities?: string[];
  relationshipStatus?: string;
  followersCount?: number;
  isVerified?: boolean;
  isAgent?: boolean;
}

const WEIGHTS = {
  MUTUAL_FOLLOW: 40,
  COMMUNITY: 25,
  INTEREST: 20,
  STATUS: 10,
  POPULARITY: 10
};

export function useRecommendations() {
  const { authUser } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      if (!authUser?.uid) {
        setRecommendations([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const currentUid = authUser.uid;

        // 1. Fetch Current User Data
        const currentUserRef = doc(db, 'users', currentUid);
        const currentUserSnap = await getDoc(currentUserRef);

        if (!currentUserSnap.exists()) {
          console.error('User profile not found');
          setLoading(false);
          return;
        }

        const currentUser = currentUserSnap.data() as UserData;
        const myTags = currentUser.tags || [];
        const myCommunities = currentUser.joinedCommunities || [];
        const myStatus = currentUser.relationshipStatus;

        // 2. Fetch My Following (to exclude)
        const followingRef = collection(db, `users/${currentUid}/following`);
        // Increase limit to 1000 to handle larger following lists
        const followingSnap = await getDocs(query(followingRef, limit(1000)));
        const excludedIds = new Set<string>([currentUid]);

        followingSnap.forEach(doc => {
          excludedIds.add(doc.id);
        });

        // 3. Parallel Retrieval
        const candidatesMap = new Map<string, UserData>();

        // A. Interest Match (Tags) - Limit 20
        const interestPromise = (myTags.length > 0)
          ? getDocs(query(
            collection(db, 'users'),
            where('tags', 'array-contains-any', myTags.slice(0, 10)),
            limit(20)
          ))
          : Promise.resolve({ docs: [] });

        // B. Community Match - Limit 20
        const communityPromise = (myCommunities.length > 0)
          ? getDocs(query(
            collection(db, 'users'),
            where('joinedCommunities', 'array-contains-any', myCommunities.slice(0, 10)),
            limit(20)
          ))
          : Promise.resolve({ docs: [] });

        // C. Trending (High Followers) - Limit 20
        const trendingPromise = getDocs(query(
          collection(db, 'users'),
          orderBy('followersCount', 'desc'),
          limit(20)
        ));

        // Execute queries
        const [interestSnap, communitySnap, trendingSnap] = await Promise.all([
          interestPromise,
          communityPromise,
          trendingPromise
        ]);

        // Helper to add to map
        const addToMap = (doc: any) => {
          const data = doc.data() as UserData;
          const docId = doc.id;

          // Use doc.id as the canonical ID (this is the Firestore document ID)
          const candidateId = docId;

          // Filter: Remove self and already followed
          if (candidateId && !excludedIds.has(candidateId)) {
            candidatesMap.set(candidateId, { ...data, userId: candidateId });
          }
        };

        // Process results
        // @ts-ignore
        interestSnap.docs.forEach(addToMap);
        // @ts-ignore
        communitySnap.docs.forEach(addToMap);
        // @ts-ignore
        trendingSnap.docs.forEach(addToMap);

        // 4. Scoring (Orbi Rank)
        const candidates = Array.from(candidatesMap.values());
        const scoredCandidates = candidates.map(candidate => {
          let score = 0;
          let mutualCount = 0;

          // +25 pts: Shared Community
          const candidateCommunities = candidate.joinedCommunities || [];
          const sharedComm = candidateCommunities.filter(c => myCommunities.includes(c));
          if (sharedComm.length > 0) {
            score += 25;
          }

          // +15 pts: Shared Interest Tag
          const candidateTags = candidate.tags || [];
          const sharedTags = candidateTags.filter(t => myTags.includes(t));
          if (sharedTags.length > 0) {
            score += 15;
          }

          // +5 pts: Log10(FollowersCount)
          const followers = candidate.followersCount || 0;
          if (followers > 0) {
            score += 5 * Math.log10(followers);
          }

          return {
            id: candidate.userId || '', // Use userId field
            score,
            mutualCount,
            username: candidate.username,
            displayName: candidate.displayName,
            photoURL: candidate.photoURL,
            isVerified: candidate.isVerified,
            isAgent: candidate.isAgent
          };
        });

        // Sort and Slice
        scoredCandidates.sort((a, b) => b.score - a.score);
        setRecommendations(scoredCandidates.slice(0, 20));

      } catch (err) {
        console.error('Error fetching recommendations:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [authUser?.uid]);

  return {
    recommendations,
    loading,
    error
  };
}