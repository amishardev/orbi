// Communities service - handles all Firestore operations for communities feature
import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  writeBatch,
  onSnapshot,
  deleteField,
  type DocumentData,
  type QueryDocumentSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import { db, serverTimestamp, arrayUnion, arrayRemove } from './config';
import type { Community, CommunityMessage, MessageType } from '@/lib/types';

const MESSAGES_PER_PAGE = 50;
const MESSAGE_RATE_LIMIT = { count: 5, seconds: 5 }; // 5 messages per 5 seconds

let lastMessageTimestamp: number = 0;
let messageCount: number = 0;

// Rate limiting helper
const checkRateLimit = () => {
  const now = Date.now();
  if (now - lastMessageTimestamp > MESSAGE_RATE_LIMIT.seconds * 1000) {
    // Reset if outside window
    messageCount = 1;
    lastMessageTimestamp = now;
    return true;
  }

  if (messageCount >= MESSAGE_RATE_LIMIT.count) {
    return false;
  }

  messageCount++;
  return true;
};

// Create a new community
export const createCommunity = async ({
  name,
  adminId,
  members,
  memberDetails,
  iconUrl,
  description,
  isPublic = false
}: {
  name: string;
  adminId: string;
  members: string[];
  memberDetails: {
    [userId: string]: {
      displayName: string;
      photoURL?: string | null;
    };
  };
  iconUrl: string;
  description?: string;
  isPublic?: boolean;
}): Promise<string> => {
  // Validate required fields
  if (!name || !adminId || !members || members.length === 0 || !iconUrl || !memberDetails) {
    throw new Error('Missing required fields');
  }

  if (!iconUrl.startsWith('https://') && !iconUrl.startsWith('data:image/')) {
    throw new Error('Invalid icon URL format');
  }

  // Ensure admin is in members list
  if (!members.includes(adminId)) {
    members.push(adminId);
  }

  // Validate member details match members array
  const memberIds = Object.keys(memberDetails);
  if (!memberIds.every(id => members.includes(id)) ||
    !members.every(id => memberIds.includes(id))) {
    throw new Error('Member details must match members array');
  }

  const communityData = {
    name,
    adminId,
    members,
    memberDetails,
    iconUrl,
    description,
    isPublic,
    createdAt: serverTimestamp(),
    lastMessageAt: serverTimestamp()
  };

  const docRef = await addDoc(collection(db, 'communities'), communityData);
  return docRef.id;
};

// Subscribe to all public communities and communities where user is member
export const getUserCommunities = (
  uid: string,
  callback: (communities: Community[]) => void
): Unsubscribe => {
  // Query for all communities where user is a member
  const q = query(
    collection(db, 'communities'),
    where('members', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc')
  );

  // Set up listener
  return onSnapshot(q, (snapshot) => {
    const communities = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Community));

    callback(communities);
  });
};

// Send a message in a community
export const sendCommunityMessage = async (
  communityId: string,
  { senderId, text, type = 'text' as MessageType }: {
    senderId: string;
    text: string;
    type?: MessageType;
  }
): Promise<void> => {
  // Check rate limit
  if (!checkRateLimit()) {
    throw new Error('Message rate limit exceeded. Please wait a few seconds.');
  }

  // Validate message type and content
  if (type === 'gif' || type === 'image') {
    if (!text.startsWith('https://')) {
      throw new Error('Invalid media URL');
    }
  }

  const batch = writeBatch(db);

  // Get sender info
  const userDoc = await getDoc(doc(db, 'users', senderId));
  if (!userDoc.exists()) {
    throw new Error('Sender not found');
  }

  // Add message
  const messageRef = doc(collection(db, 'communities', communityId, 'messages'));
  batch.set(messageRef, {
    senderId,
    text,
    type,
    createdAt: serverTimestamp(),
    user: {
      displayName: userDoc.data().displayName || '',
      photoURL: userDoc.data().photoURL || null
    }
  });

  // Update community lastMessageAt
  const communityRef = doc(db, 'communities', communityId);
  batch.update(communityRef, {
    lastMessageAt: serverTimestamp()
  });

  await batch.commit();
};

// Get user data
async function getUserData(userId: string) {
  const userDoc = await getDoc(doc(db, 'users', userId));
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() };
  }
  return null;
}

// Listen to messages in a community with user data
export const listenToCommunityMessages = (
  communityId: string,
  callback: (messages: CommunityMessage[]) => void
): Unsubscribe => {
  const q = query(
    collection(db, 'communities', communityId, 'messages'),
    orderBy('createdAt', 'desc'),
    limit(MESSAGES_PER_PAGE)
  );

  return onSnapshot(q, async (snapshot) => {
    // Create a map to batch user data requests
    const userPromises = new Map();

    snapshot.docs.forEach(doc => {
      const userId = doc.data().senderId;
      if (userId && !userPromises.has(userId)) {
        userPromises.set(userId, getUserData(userId));
      }
    });

    // Wait for all user data to be fetched
    const users = new Map();
    await Promise.all([...userPromises.entries()].map(async ([userId, promise]) => {
      const user = await promise;
      if (user) users.set(userId, user);
    }));

    // Construct messages with user data
    const messages = snapshot.docs.map(doc => {
      const data = doc.data();
      const user = users.get(data.senderId);
      const userObj = data.user || user || {};
      return {
        id: doc.id,
        senderId: data.senderId,
        senderName: userObj.displayName || 'Unknown',
        senderAvatar: userObj.photoURL || '',
        text: data.text,
        type: data.type || 'text',
        createdAt: data.createdAt,
        user: userObj
      } as CommunityMessage;
    }).reverse(); // Reverse to get ascending order

    callback(messages);
  });
};

// Add member to a community
export const addMember = async (communityId: string, uidToAdd: string): Promise<void> => {
  const communityRef = doc(db, 'communities', communityId);
  const userDoc = await getDoc(doc(db, 'users', uidToAdd));

  if (!userDoc.exists()) {
    throw new Error('User not found');
  }

  await updateDoc(communityRef, {
    members: arrayUnion(uidToAdd),
    [`memberDetails.${uidToAdd}`]: {
      displayName: userDoc.data().displayName || '',
      photoURL: userDoc.data().photoURL || null
    }
  });
};

// Remove member from a community
export const removeMember = async (communityId: string, uidToRemove: string): Promise<void> => {
  const communityRef = doc(db, 'communities', communityId);

  // Get current community data
  const communitySnap = await getDoc(communityRef);
  if (!communitySnap.exists()) {
    throw new Error('Community not found');
  }

  const { adminId, members } = communitySnap.data();

  // Don't allow removing the last member
  if (members.length <= 1) {
    throw new Error('Cannot remove the last member');
  }

  // Remove member and their details
  await updateDoc(communityRef, {
    members: arrayRemove(uidToRemove),
    [`memberDetails.${uidToRemove}`]: deleteField()
  });
};

// Leave a community
export const leaveCommunity = async (communityId: string, uid: string): Promise<void> => {
  await removeMember(communityId, uid);
};

// Rename a community
export const renameCommunity = async (communityId: string, newName: string): Promise<void> => {
  if (!newName || newName.trim().length === 0) {
    throw new Error('Name cannot be empty');
  }

  const communityRef = doc(db, 'communities', communityId);
  await updateDoc(communityRef, {
    name: newName.trim()
  });
};

// Delete a community
export const deleteCommunity = async (communityId: string): Promise<void> => {
  await deleteDoc(doc(db, 'communities', communityId));
};