'use client';

import { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

interface FollowCounts {
    followersCount: number;
    followingCount: number;
    loading: boolean;
}

/**
 * Hook that provides real-time follower/following counts.
 * Prioritizes subcollections (source of truth), but falls back to array lengths
 * for legacy data that hasn't been migrated to subcollections yet.
 * 
 * Priority order:
 * 1. Subcollection size (if > 0) - new system, most accurate
 * 2. Array length (if > 0) - legacy system, accurate for existing data
 * 3. Stored counter - least reliable, can be stale
 */
export function useFollowCounts(userId: string | undefined): FollowCounts {
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        setLoading(true);

        let unsubFollowers: (() => void) | null = null;
        let unsubFollowing: (() => void) | null = null;
        let isMounted = true;

        const setupListeners = async () => {
            try {
                // First, get the user doc to check arrays (for fallback)
                const userRef = doc(db, 'users', userId);
                const userSnap = await getDoc(userRef);
                const userData = userSnap.data();

                // Array lengths are the accurate source for legacy data
                const followersArrayLength = userData?.followers?.length || 0;
                const followingArrayLength = userData?.following?.length || 0;

                const followersRef = collection(db, `users/${userId}/followers`);
                const followingRef = collection(db, `users/${userId}/following`);

                let followersLoaded = false;
                let followingLoaded = false;

                const checkLoaded = () => {
                    if (followersLoaded && followingLoaded && isMounted) {
                        setLoading(false);
                    }
                };

                // Real-time listener for followers subcollection
                unsubFollowers = onSnapshot(followersRef, (snapshot) => {
                    const subcollectionCount = snapshot.size;

                    if (isMounted) {
                        // Priority: subcollection > array > 0
                        if (subcollectionCount > 0) {
                            setFollowersCount(subcollectionCount);
                        } else if (followersArrayLength > 0) {
                            // Use array length for legacy data
                            setFollowersCount(followersArrayLength);
                        } else {
                            setFollowersCount(0);
                        }
                    }
                    followersLoaded = true;
                    checkLoaded();
                }, (error) => {
                    console.error('Error listening to followers:', error);
                    if (isMounted) {
                        setFollowersCount(followersArrayLength);
                    }
                    followersLoaded = true;
                    checkLoaded();
                });

                // Real-time listener for following subcollection
                unsubFollowing = onSnapshot(followingRef, (snapshot) => {
                    const subcollectionCount = snapshot.size;

                    if (isMounted) {
                        // Priority: subcollection > array > 0
                        if (subcollectionCount > 0) {
                            setFollowingCount(subcollectionCount);
                        } else if (followingArrayLength > 0) {
                            // Use array length for legacy data
                            setFollowingCount(followingArrayLength);
                        } else {
                            setFollowingCount(0);
                        }
                    }
                    followingLoaded = true;
                    checkLoaded();
                }, (error) => {
                    console.error('Error listening to following:', error);
                    if (isMounted) {
                        setFollowingCount(followingArrayLength);
                    }
                    followingLoaded = true;
                    checkLoaded();
                });
            } catch (error) {
                console.error('Error setting up follow count listeners:', error);
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        setupListeners();

        return () => {
            isMounted = false;
            if (unsubFollowers) unsubFollowers();
            if (unsubFollowing) unsubFollowing();
        };
    }, [userId]);

    return { followersCount, followingCount, loading };
}

/**
 * Utility function to repair user follow counts based on actual data.
 * Prefers subcollection size, falls back to array length.
 */
export async function repairFollowCounts(userId: string): Promise<{ followersCount: number; followingCount: number }> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    const userData = userSnap.data();

    const followersRef = collection(db, `users/${userId}/followers`);
    const followingRef = collection(db, `users/${userId}/following`);

    const [followersSnap, followingSnap] = await Promise.all([
        getDocs(followersRef),
        getDocs(followingRef)
    ]);

    // Use subcollection if available, otherwise use array length
    const followersCount = followersSnap.size > 0
        ? followersSnap.size
        : (userData?.followers?.length || 0);

    const followingCount = followingSnap.size > 0
        ? followingSnap.size
        : (userData?.following?.length || 0);

    // Update the user document with correct counts
    await updateDoc(userRef, {
        followersCount,
        followingCount
    });

    return { followersCount, followingCount };
}
