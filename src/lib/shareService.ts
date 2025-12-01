import { db } from '@/lib/firebase-client';
import {
    collection,
    doc,
    getDoc,
    setDoc,
    serverTimestamp,
    writeBatch,
    increment,
    addDoc
} from 'firebase/firestore';
import type { Post, User } from '@/lib/types';

export async function createOrGetChat(authUser: User, otherUserId: string): Promise<string> {
    // Deterministic Chat ID
    const chatId = [authUser.id, otherUserId].sort().join('_');
    const chatRef = doc(db, 'chats', chatId);

    const chatSnap = await getDoc(chatRef);
    if (chatSnap.exists()) {
        return chatSnap.id;
    }

    // Fetch other user data
    const otherUserSnap = await getDoc(doc(db, 'users', otherUserId));
    if (!otherUserSnap.exists()) {
        throw new Error('User not found');
    }
    const otherUserData = otherUserSnap.data();

    // Create new chat
    const chatData = {
        participants: [authUser.id, otherUserId],
        participantDetails: {
            [authUser.id]: {
                displayName: authUser.displayName || 'Anonymous',
                profilePicture: authUser.photoURL || '',
                username: authUser.username || 'user',
            },
            [otherUserId]: {
                displayName: otherUserData?.displayName || 'Anonymous',
                profilePicture: otherUserData?.photoURL || '',
                username: otherUserData?.username || 'user',
            },
        },
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        lastMessage: null,
        unreadCounts: {
            [authUser.id]: 0,
            [otherUserId]: 0,
        },
    };

    await setDoc(chatRef, chatData);
    return chatId;
}

export async function sharePostToTarget(
    target: { type: 'user' | 'community'; id: string },
    post: Post,
    authUser: User,
    comment?: string
) {
    const batch = writeBatch(db);
    let messagesRef;
    let parentRef; // Chat or Community doc ref
    let unreadFieldPath = '';

    const shareData = {
        postId: post.id,
        postAuthor: post.authorDisplayName || post.username || 'Unknown',
        postImage: post.mediaUrl || null,
        postText: post.caption ? post.caption.substring(0, 100) : null,
        postType: post.mediaType || 'text',
    };

    if (target.type === 'user') {
        const chatId = await createOrGetChat(authUser, target.id);
        parentRef = doc(db, 'chats', chatId);
        messagesRef = collection(parentRef, 'messages');
        unreadFieldPath = `unreadCounts.${target.id}`;
    } else {
        parentRef = doc(db, 'communities', target.id);
        messagesRef = collection(parentRef, 'messages');
        // Communities don't have per-user unread counts in the same way, usually just lastMessageAt
    }

    const newMessageRef = doc(messagesRef);

    batch.set(newMessageRef, {
        text: comment || 'Shared a post',
        senderId: authUser.id,
        createdAt: serverTimestamp(),
        type: 'post_share',
        shareData,
        // For communities, we might need extra fields
        ...(target.type === 'community' ? {
            senderName: authUser.displayName,
            senderAvatar: authUser.photoURL,
            user: {
                displayName: authUser.displayName,
                photoURL: authUser.photoURL
            }
        } : {})
    });

    // Update parent doc (lastMessage, unread count)
    const updateData: any = {
        lastMessageAt: serverTimestamp(),
        lastMessage: {
            text: comment || 'Shared a post',
            senderId: authUser.id,
            createdAt: serverTimestamp(),
        }
    };

    if (unreadFieldPath) {
        updateData[unreadFieldPath] = increment(1);
    }

    batch.update(parentRef, updateData);

    await batch.commit();
}
