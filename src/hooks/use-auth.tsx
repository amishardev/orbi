
'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
  useCallback,
} from 'react';
import {
  onAuthStateChanged,
  type User as AuthUser,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase-client';
import { useRouter, usePathname } from 'next/navigation';
import { doc, getDoc, setDoc, serverTimestamp, type Timestamp, updateDoc, writeBatch, increment, collection, query, where, getDocs, limit, arrayUnion, arrayRemove } from 'firebase/firestore';
import type { User, Notification, FriendRequest } from '@/lib/types';
import { followUserAction, unfollowUserAction, acceptFriendRequestAction } from '@/app/actions/relationships';

type SignUpData = {
  email: string;
  password: string;
  username: string;
  displayName: string;
  interests?: string;
  relationshipStatus?: string;
  profilePictureUrl?: string;
  coverPhotoUrl?: string;
};


interface AuthContextType {
  authUser: AuthUser | null;
  userData: User | null;
  loading: boolean;
  signUpWithEmail: (data: SignUpData) => Promise<any>;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: Partial<User & { newProfilePicture?: string, newCoverPhoto?: string }>) => Promise<void>;
  followUser: (targetUserId: string) => Promise<void>;
  unfollowUser: (targetUserId: string) => Promise<void>;
  acceptFriendRequest: (request: FriendRequest) => Promise<void>;
  declineFriendRequest: (requestId: string) => Promise<void>;
  cancelFriendRequest: (requestId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchUserData = useCallback(async (uid: string) => {
    const userRef = doc(db, 'users', uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const dbUser = {
        id: userSnap.id,
        ...userSnap.data(),
        photoURL: userSnap.data().photoURL || `https://picsum.photos/seed/${userSnap.id}/200/200`
      } as User;
      setUserData(dbUser);
      return dbUser;
    }
    return null;
  }, []);

  const updateUserStatus = useCallback(async (uid: string, isOnline: boolean) => {
    if (!uid || !db) return;
    const userRef = doc(db, 'users', uid);
    try {
      // Use setDoc with merge to prevent "No document to update" error
      // This ensures the document exists even if it's just status fields
      await setDoc(userRef, {
        isOnline: isOnline,
        lastSeen: serverTimestamp(),
      }, { merge: true });
    } catch (error) {
      console.error("Error updating user status:", error);
    }
  }, []);

  useEffect(() => {
    if (!auth) {
      console.warn("Firebase Auth not initialized");
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoading(true);
      if (user) {
        setAuthUser(user);
        await updateUserStatus(user.uid, true);
        let dbUser = await fetchUserData(user.uid);

        // Auto-repair: If user exists in Auth but has no (or incomplete) Firestore doc
        if (!dbUser || !dbUser.username) {
          // DELAY AUTO-REPAIR to avoid race condition with SignUpWizard
          // SignUpWizard creates the user doc *after* Auth creation.
          // If we repair too fast, we overwrite the intended data or cause early redirect.
          setTimeout(async () => {
            // Re-fetch to see if it was created in the meantime
            const freshUserSnap = await getDoc(doc(db, 'users', user.uid));
            if (freshUserSnap.exists()) {
              const freshData = { id: freshUserSnap.id, ...freshUserSnap.data() } as User;
              setUserData(freshData);
              return;
            }

            console.warn("User document missing or incomplete. Attempting auto-repair...");
            const userRef = doc(db, 'users', user.uid);
            const notificationsRef = doc(db, 'notifications', user.uid);
            const batch = writeBatch(db);

            const username = user.displayName?.replace(/\s+/g, '').toLowerCase() || user.email?.split('@')[0] || `user${user.uid.substring(0, 5)}`;
            const displayName = user.displayName || user.email?.split('@')[0] || 'User';

            const newUserDoc: any = {
              userId: user.uid,
              email: user.email || '',
              username: username,
              username_lowercase: username.toLowerCase(),
              displayName: displayName,
              displayName_lowercase: displayName.toLowerCase(),
              bio: 'New to Orbi! ✨',
              joinDate: serverTimestamp(),
              photoURL: user.photoURL || `https://picsum.photos/seed/${user.uid}/200/200`,
              coverPhoto: `https://picsum.photos/seed/cover-${user.uid}/1200/400`,
              postsCount: 0,
              followersCount: 0,
              followingCount: 0,
              profileVisibility: 'public',
              allowMessages: true,
              isVerified: false,
              interests: [],
              relationshipStatus: 'prefer-not-to-say',
              searchKeywords: [username.toLowerCase(), displayName.toLowerCase()],
              followers: [],
              following: [],
              isOnline: true,
              lastSeen: serverTimestamp(),
            };

            batch.set(userRef, newUserDoc, { merge: true });

            try {
              await batch.commit();
              setUserData({ id: user.uid, ...newUserDoc } as User);
            } catch (err) {
              console.error("Auto-repair failed:", err);
            }
          }, 3000); // Wait 3 seconds
        }

        if (dbUser) {
          setUserData(dbUser);
          // Sync auth profile with DB if needed
          if (user.displayName !== dbUser.displayName || user.photoURL !== dbUser.photoURL) { // Changed from dbUser.profilePicture
            await updateProfile(user, {
              displayName: dbUser.displayName,
              photoURL: dbUser.photoURL, // Changed from dbUser.profilePicture
            });
          }
        } else {
          setUserData(null);
        }

      } else {
        if (authUser) {
          updateUserStatus(authUser.uid, false);
        }
        setAuthUser(null);
        setUserData(null);
      }
      setLoading(false);
    });

    const handleVisibilityChange = () => {
      if (auth.currentUser) {
        updateUserStatus(auth.currentUser.uid, document.visibilityState === 'visible');
      }
    };

    const handleBeforeUnload = () => {
      if (auth.currentUser) {
        updateUserStatus(auth.currentUser.uid, false);
      }
    };

    window.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);


    return () => {
      unsubscribe();
      window.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [fetchUserData, updateUserStatus, authUser]);

  useEffect(() => {
    if (loading) return;

    const isAuthPage = ['/login', '/signup'].includes(pathname);
    const isPublicPage = ['/landing', '/'].includes(pathname);
    const isFriendsPage = pathname === '/friends';

    if (authUser && userData && (isAuthPage || isPublicPage)) {
      router.replace('/home');
    } else if (!authUser && !isAuthPage && !isPublicPage && !pathname.startsWith('/admin')) {
      router.replace('/landing');
    }
  }, [authUser, userData, loading, pathname, router]);

  const createUserData = async (user: AuthUser, data: Omit<SignUpData, 'email' | 'password'>) => {
    const { displayName, username, interests, relationshipStatus, profilePictureUrl, coverPhotoUrl } = data;
    const photoURL = profilePictureUrl || `https://picsum.photos/seed/${user.uid}/200/200`;
    const coverURL = coverPhotoUrl || `https://picsum.photos/seed/cover-${user.uid}/1200/400`;

    if (displayName !== user.displayName || photoURL !== user.photoURL) {
      await updateProfile(user, { displayName, photoURL });
    }

    // Check if username is unique
    const usersRef = collection(db, 'users');
    const usernameQuery = query(usersRef, where('username_lowercase', '==', username.toLowerCase()), limit(1));
    const usernameSnapshot = await getDocs(usernameQuery);

    if (!usernameSnapshot.empty) {
      const error: any = new Error('Username is already taken.');
      error.code = 'auth/username-already-in-use';
      throw error;
    }

    // Create search keywords
    const nameParts = displayName.toLowerCase().split(' ').filter(Boolean);
    const searchKeywords = Array.from(new Set([
      username.toLowerCase(),
      ...nameParts,
      ...nameParts.flatMap(part => {
        const keywords = [];
        for (let i = 1; i <= part.length; i++) {
          keywords.push(part.substring(0, i));
        }
        return keywords;
      }),
    ]));


    const userRef = doc(db, 'users', user.uid);
    const notificationsRef = doc(db, 'notifications', user.uid);

    const batch = writeBatch(db);

    const newUserDoc: Omit<User, 'id'> = {
      userId: user.uid,
      email: user.email!,
      username: username,
      username_lowercase: username.toLowerCase(),
      displayName: displayName,
      displayName_lowercase: displayName.toLowerCase(),
      bio: 'New to Orbi! ✨',
      joinDate: serverTimestamp() as Timestamp,
      photoURL: photoURL,
      coverPhoto: coverURL,
      postsCount: 0,
      followersCount: 0,
      followingCount: 0,
      profileVisibility: 'public',
      allowMessages: true,
      isVerified: false,
      interests: interests ? interests.split(',').map(i => i.trim()) : [],
      relationshipStatus: relationshipStatus || 'prefer-not-to-say',
      searchKeywords: searchKeywords,
      followers: [],
      following: [],
      isOnline: true,
      lastSeen: serverTimestamp() as Timestamp,
    };

    batch.set(userRef, newUserDoc);
    batch.set(notificationsRef, { unreadCount: 0 });

    try {
      await batch.commit();
      return { id: user.uid, ...newUserDoc } as User;
    } catch (error) {
      console.error("Failed to create user document:", error);
      throw new Error("Failed to save user profile. Please try again.");
    }
  }


  const signUpWithEmail = async (data: SignUpData) => {
    const { email, password, ...profileData } = data;
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    const createdData = await createUserData(user, profileData);

    setAuthUser(user);
    setUserData(createdData);

    return userCredential;
  }

  const signInWithEmail = async (email: string, password: string) => {
    return await signInWithEmailAndPassword(auth, email, password);
  }


  const signOut = async () => {
    try {
      if (authUser) {
        await updateUserStatus(authUser.uid, false);
      }
      await firebaseSignOut(auth);
      router.push('/landing');
    } catch (error) {
      console.error('Error signing out', error);
    }
  };

  const updateUserProfile = async (data: Partial<User & { newProfilePicture?: string, newCoverPhoto?: string }>) => {
    if (!authUser || !db || !userData) {
      throw new Error("You must be logged in to update your profile.");
    }

    const { newProfilePicture, newCoverPhoto, ...restOfData } = data;

    // Check if username is being changed and if it's unique
    if (restOfData.username && restOfData.username.toLowerCase() !== userData.username_lowercase) {
      const usersRef = collection(db, 'users');
      const usernameQuery = query(usersRef, where('username_lowercase', '==', restOfData.username.toLowerCase()), limit(1));
      const usernameSnapshot = await getDocs(usernameQuery);
      if (!usernameSnapshot.empty) {
        throw new Error('This username is already taken. Please choose another one.');
      }
    }

    const userRef = doc(db, 'users', authUser.uid);
    const updateData: { [key: string]: any } = {};

    // Only add fields to updateData if they are explicitly in restOfData
    if (restOfData.displayName) {
      updateData.displayName = restOfData.displayName;
      updateData.displayName_lowercase = restOfData.displayName.toLowerCase();
    }
    if (restOfData.username) {
      updateData.username = restOfData.username;
      updateData.username_lowercase = restOfData.username.toLowerCase();
    }
    if (restOfData.bio !== undefined) updateData.bio = restOfData.bio;
    if (typeof restOfData.interests === 'string') {
      updateData.interests = (restOfData.interests as string).split(',').map((i: string) => i.trim());
    } else if (Array.isArray(restOfData.interests)) {
      updateData.interests = restOfData.interests;
    }

    if (restOfData.relationshipStatus) updateData.relationshipStatus = restOfData.relationshipStatus;
    if (restOfData.email) updateData.email = restOfData.email;


    if (newProfilePicture) updateData.photoURL = newProfilePicture;
    if (newCoverPhoto) updateData.coverPhoto = newCoverPhoto;

    if (Object.keys(updateData).length > 0) {
      await updateDoc(userRef, updateData);
    }

    // Update Firebase Auth profile
    const authProfileUpdate: { displayName?: string, photoURL?: string } = {};
    if (updateData.displayName && updateData.displayName !== authUser.displayName) {
      authProfileUpdate.displayName = updateData.displayName;
    }
    if (newProfilePicture && newProfilePicture !== authUser.photoURL) {
      authProfileUpdate.photoURL = newProfilePicture;
    }

    if (Object.keys(authProfileUpdate).length > 0) {
      await updateProfile(authUser, authProfileUpdate);
    }

    // Refresh local user data
    await fetchUserData(authUser.uid);
  };

  const createNotification = async (batch: any, targetUserId: string, notificationData: Omit<Notification, 'id' | 'timestamp' | 'isRead'>) => {
    if (targetUserId === authUser?.uid) return; // Don't notify yourself

    const notificationsColRef = collection(db, 'notifications', targetUserId, 'items');
    const userNotificationsRef = doc(db, 'notifications', targetUserId);

    const newNotifRef = doc(notificationsColRef);
    batch.set(newNotifRef, {
      ...notificationData,
      id: newNotifRef.id,
      isRead: false,
      timestamp: serverTimestamp(),
    });

    batch.update(userNotificationsRef, {
      unreadCount: increment(1)
    });
  };

  const followUser = async (targetUserId: string) => {
    if (!authUser?.uid || !userData || authUser.uid === targetUserId) return;

    try {
      const idToken = await authUser.getIdToken();
      await followUserAction(targetUserId, idToken);

      // Manually update local state for immediate UI feedback
      setUserData(prev => prev ? ({
        ...prev,
        following: [...(prev.following || []), targetUserId],
        followingCount: (prev.followingCount || 0) + 1,
      }) : null);
    } catch (error) {
      console.error("Error following user: ", error);
    }
  };

  const unfollowUser = async (targetUserId: string) => {
    if (!authUser?.uid || !userData || authUser.uid === targetUserId) return;

    try {
      const idToken = await authUser.getIdToken();
      await unfollowUserAction(targetUserId, idToken);

      // Manually update local state for immediate UI feedback
      setUserData(prev => prev ? ({
        ...prev,
        following: (prev.following || []).filter(id => id !== targetUserId),
        followingCount: Math.max(0, (prev.followingCount || 0) - 1),
      }) : null);
    } catch (error) {
      console.error("Error unfollowing user: ", error);
    }
  };

  const acceptFriendRequest = async (request: FriendRequest) => {
    if (!authUser?.uid || !userData) return;

    try {
      const idToken = await authUser.getIdToken();
      await acceptFriendRequestAction(request.id, request.fromUserId, idToken);

      // Update local state
      setUserData(prev => prev ? ({
        ...prev,
        friends: [...(prev.friends || []), request.fromUserId]
      }) : null);
    } catch (error) {
      console.error("Error accepting friend request:", error);
    }
  };

  const declineFriendRequest = async (requestId: string) => {
    if (!authUser?.uid) return;
    try {
      await updateDoc(doc(db, 'friend_requests', requestId), {
        status: 'declined'
      });
    } catch (error) {
      console.error("Error declining friend request:", error);
    }
  };

  const cancelFriendRequest = async (requestId: string) => {
    if (!authUser?.uid) return;
    try {
      // Deleting the request is cleaner for cancellation
      await updateDoc(doc(db, 'friend_requests', requestId), {
        status: 'cancelled' // or deleteDoc
      });
      // actually let's just update status to keep history or delete?
      // For now update status.
    } catch (error) {
      console.error("Error cancelling friend request:", error);
    }
  };

  const value = {
    authUser,
    userData,
    loading,
    signOut,
    signUpWithEmail,
    signInWithEmail,
    updateUserProfile,
    followUser,
    unfollowUser,
    acceptFriendRequest,
    declineFriendRequest,
    cancelFriendRequest
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

