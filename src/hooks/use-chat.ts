
'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { db } from '@/lib/firebase-client';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  serverTimestamp,
  doc,
  getDocs,
  limit,
  updateDoc,
  getDoc,
  setDoc,
  writeBatch,
  increment,
  type Timestamp,
  orderBy,
} from 'firebase/firestore';
import type { Chat, Message } from '@/lib/types';
import { useAuth } from './use-auth';
import { useRouter } from 'next/navigation';

interface ChatData {
  participants: string[];
  participantDetails: {
    [key: string]: {
      displayName: string;
      profilePicture: string;
      username: string;
    };
  };
  createdAt: any;
  lastMessageAt: any;
  lastMessage: null | {
    content: string;
    createdAt: any;
    senderId: string;
  };
  unreadCounts: {
    [key: string]: number;
  };
}

export function useChat() {
  const { authUser, userData } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate total unread messages
  const totalUnreadCount = useMemo(() => {
    if (!authUser?.uid) return 0;
    return chats.reduce((total, chat) => {
      const unreadCountForUser = chat.unreadCounts?.[authUser.uid] || 0;
      return total + unreadCountForUser;
    }, 0);
  }, [chats, authUser?.uid]);

  // Create or get existing chat
  const createOrGetChat = useCallback(
    async (otherUserId: string): Promise<string> => {
      if (!authUser?.uid || !userData) {
        const error = new Error('You must be logged in to create a chat');
        setError(error.message);
        throw error;
      }

      if (authUser.uid === otherUserId) {
        const error = new Error('Cannot create chat with yourself');
        setError(error.message);
        throw error;
      }

      try {
        setError(null);

        // Create a deterministic chat ID
        const chatId = [authUser.uid, otherUserId].sort().join('_');
        const chatRef = doc(db, 'chats', chatId);

        // Return existing chat if it exists
        const chatSnap = await getDoc(chatRef);
        if (chatSnap.exists()) {
          return chatSnap.id;
        }

        // Get other user's data
        const otherUserSnap = await getDoc(doc(db, 'users', otherUserId));
        if (!otherUserSnap.exists()) {
          throw new Error('Selected user not found');
        }

        const otherUserData = otherUserSnap.data();
        if (!otherUserData) {
          throw new Error('Invalid user data');
        }

        // Create chat document
        const chatData = {
          participants: [authUser.uid, otherUserId],
          participantDetails: {
            [authUser.uid]: {
              displayName: userData.displayName || 'Anonymous',
              profilePicture: userData.photoURL || '',
              username: userData.username || 'user',
            },
            [otherUserId]: {
              displayName: otherUserData.displayName || 'Anonymous',
              profilePicture: otherUserData.photoURL || '',
              username: otherUserData.username || 'user',
            },
          },
          createdAt: serverTimestamp(),
          lastMessageAt: serverTimestamp(),
          lastMessage: null,
          unreadCounts: {
            [authUser.uid]: 0,
            [otherUserId]: 0,
          },
        };

        await setDoc(chatRef, chatData);
        return chatId;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to create chat';
        setError(errorMessage);
        throw error;
      }
    },
    [authUser?.uid, userData]
  );

  useEffect(() => {
    if (!authUser?.uid) {
      setLoading(false);
      setChats([]);
      return;
    }

    setLoading(true);
    const chatsQuery = query(
      collection(db, 'chats'),
      where('participants', 'array-contains', authUser.uid)
    );

    const unsubscribe = onSnapshot(chatsQuery, (snapshot) => {
      const userChats = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Chat));

      // Sort chats on the client-side to avoid complex indexing
      userChats.sort((a, b) => {
        const aTime = a.lastMessage?.createdAt?.toMillis() || a.createdAt?.toMillis() || 0;
        const bTime = b.lastMessage?.createdAt?.toMillis() || b.createdAt?.toMillis() || 0;
        return bTime - aTime;
      });

      setChats(userChats);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching chats: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [authUser?.uid]);

  const markChatAsRead = useCallback(async (chatId: string) => {
    if (!authUser?.uid || !chatId) return;

    const chatRef = doc(db, 'chats', chatId);
    try {
      await updateDoc(chatRef, {
        [`unreadCounts.${authUser.uid}`]: 0
      });
    } catch (error) {
      console.error("Error marking chat as read:", error);
    }
  }, [authUser?.uid]);

  return { chats, loading, totalUnreadCount, createOrGetChat, markChatAsRead };
}

export function useMessages(chatId: string | null) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const { authUser } = useAuth();
  const { markChatAsRead } = useChat();

  useEffect(() => {
    if (!chatId) {
      setMessages([]);
      setLoading(false);
      return;
    }

    markChatAsRead(chatId);

    setLoading(true);
    const messagesQuery = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      const newMessages = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(newMessages);
      setLoading(false);

      if (newMessages.length > 0) {
        markChatAsRead(chatId);
      }

    }, (error) => {
      console.error("Error fetching messages: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [chatId, markChatAsRead]);

  const sendMessage = async (text: string, replyTo?: { id: string; senderName: string; textPreview: string }) => {
    if (!chatId || !text.trim() || !authUser?.uid) return;

    const chatRef = doc(db, 'chats', chatId);
    const messagesCol = collection(chatRef, 'messages');

    const chatSnap = await getDoc(chatRef);
    if (!chatSnap.exists()) return;
    const chatData = chatSnap.data();
    const otherParticipantId = chatData.participants.find((p: string) => p !== authUser.uid);

    const batch = writeBatch(db);

    const newMessageRef = doc(messagesCol); // create a new doc ref
    const messageData: any = {
      senderId: authUser.uid,
      text,
      createdAt: serverTimestamp(),
    };

    if (replyTo) {
      messageData.replyTo = replyTo;
    }

    batch.set(newMessageRef, messageData);

    batch.update(chatRef, {
      lastMessage: {
        text,
        senderId: authUser.uid,
        createdAt: serverTimestamp(),
      },
      [`unreadCounts.${otherParticipantId}`]: increment(1)
    });

    await batch.commit();
  }

  return { messages, loading, sendMessage };
}
