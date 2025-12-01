
'use client';

import { useState, useEffect, useCallback } from 'react';
import { db } from '@/lib/firebase-client';
import {
  collection,
  query,
  onSnapshot,
  doc,
  writeBatch,
  orderBy,
  limit,
  getDocs,
  where,
  updateDoc
} from 'firebase/firestore';
import type { Notification } from '@/lib/types';
import { useAuth } from './use-auth';

export function useNotifications() {
  const { authUser } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authUser?.uid) {
      setLoading(false);
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setLoading(true);
    
    // Listener for notifications collection
    const notificationsQuery = query(
      collection(db, 'notifications', authUser.uid, 'items'),
      orderBy('timestamp', 'desc'),
      limit(50)
    );

    const unsubscribeNotifications = onSnapshot(notificationsQuery, (snapshot) => {
      const userNotifications = snapshot.docs.map(doc => doc.data() as Notification);
      setNotifications(userNotifications);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching notifications: ", error);
        setLoading(false);
    });

    // Listener for unread count
    const unreadCountRef = doc(db, 'notifications', authUser.uid);
    const unsubscribeUnreadCount = onSnapshot(unreadCountRef, (doc) => {
        setUnreadCount(doc.data()?.unreadCount || 0);
    }, (error) => {
        console.error("Error fetching unread count: ", error);
    });

    return () => {
        unsubscribeNotifications();
        unsubscribeUnreadCount();
    };
  }, [authUser?.uid]);

  const markAllAsRead = useCallback(async () => {
    if (!authUser?.uid || unreadCount === 0) return;

    const notificationsColRef = collection(db, 'notifications', authUser.uid, 'items');
    const userNotificationsRef = doc(db, 'notifications', authUser.uid);
    
    const unreadQuery = query(notificationsColRef, where('isRead', '==', false));
    
    try {
        const unreadSnapshot = await getDocs(unreadQuery);
        if (unreadSnapshot.empty) return;

        const batch = writeBatch(db);
        
        unreadSnapshot.forEach(doc => {
            batch.update(doc.ref, { isRead: true });
        });

        batch.update(userNotificationsRef, { unreadCount: 0 });

        await batch.commit();

    } catch (error) {
        console.error("Error marking all notifications as read:", error);
    }
  }, [authUser?.uid, unreadCount]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!authUser?.uid) return;
    const notifRef = doc(db, 'notifications', authUser.uid, 'items', notificationId);
    await updateDoc(notifRef, { isRead: true });
  }, [authUser?.uid]);

  return { notifications, unreadCount, loading, markAllAsRead, markAsRead };
}

    