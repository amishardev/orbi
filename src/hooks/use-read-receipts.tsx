import { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { useAuth } from './use-auth';

export interface ReadReceipt {
    userId: string;
    username: string;
    userAvatar: string;
    lastReadMessageId: string;
    lastReadTimestamp: any;
}

export function useReadReceipts(communityId: string) {
    const { authUser } = useAuth();
    const [readReceipts, setReadReceipts] = useState<Record<string, ReadReceipt>>({});
    const [seenByMap, setSeenByMap] = useState<Record<string, ReadReceipt[]>>({});

    useEffect(() => {
        if (!communityId) return;

        const q = query(collection(db, 'communities', communityId, 'readReceipts'));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const receipts: Record<string, ReadReceipt> = {};
            const newSeenByMap: Record<string, ReadReceipt[]> = {};

            snapshot.forEach((doc) => {
                const data = doc.data() as ReadReceipt;
                receipts[data.userId] = data;

                // Group by message ID
                if (data.lastReadMessageId) {
                    if (!newSeenByMap[data.lastReadMessageId]) {
                        newSeenByMap[data.lastReadMessageId] = [];
                    }
                    newSeenByMap[data.lastReadMessageId].push(data);
                }
            });

            setReadReceipts(receipts);
            setSeenByMap(newSeenByMap);
        });

        return () => unsubscribe();
    }, [communityId]);

    const markChannelAsRead = async (messageId: string) => {
        if (!authUser || !communityId || !messageId) return;

        // Check if we already marked this message as read to avoid unnecessary writes
        const currentReceipt = readReceipts[authUser.uid];
        if (currentReceipt?.lastReadMessageId === messageId) return;

        try {
            await setDoc(doc(db, 'communities', communityId, 'readReceipts', authUser.uid), {
                userId: authUser.uid,
                username: authUser.displayName || 'User',
                userAvatar: authUser.photoURL || '',
                lastReadMessageId: messageId,
                lastReadTimestamp: serverTimestamp()
            });
        } catch (error) {
            console.error("Error marking channel as read:", error);
        }
    };

    return { seenByMap, markChannelAsRead };
}
