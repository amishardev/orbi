
'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase-client';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment, type Timestamp, writeBatch } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import type { Comment, Post } from '@/lib/types';

interface CommentsSheetProps {
  post: Post;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommentsSheet({ post, open, onOpenChange }: CommentsSheetProps) {
  const { authUser, userData } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!post.id || !db || !open) return;

    const commentsQuery = query(
      collection(db, 'posts', post.id, 'comments'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(commentsQuery, (snapshot) => {
      const commentsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as Comment));
      setComments(commentsData);
    });

    return () => unsubscribe();
  }, [post.id, open]);

  const handleCommentSubmit = async () => {
    if (!newComment.trim() || !authUser?.uid || !userData || !post.id || !db) return;
    if (!newComment.trim() || !authUser?.uid || !userData || !post.id || !db) return;

    setIsSubmitting(true);
    try {
      const postRef = doc(db, 'posts', post.id);
      const commentsCollection = collection(postRef, 'comments');
      const batch = writeBatch(db);

      // Add comment
      batch.set(doc(commentsCollection), {
        userId: authUser.uid,
        username: userData.username,
        avatar: userData.photoURL,
        text: newComment,
        createdAt: serverTimestamp(),
      });

      // Increment comments count on post
      batch.update(postRef, {
        commentsCount: increment(1)
      });

      // Create notification only if not self
      if (post.userId !== authUser.uid) {
        const notificationsCollection = collection(db, 'notifications', post.userId, 'items');
        const userNotificationsRef = doc(db, 'notifications', post.userId);

        const newNotifRef = doc(notificationsCollection);
        batch.set(newNotifRef, {
          id: newNotifRef.id,
          type: 'comment',
          fromUserId: authUser.uid,
          fromUsername: userData.username,
          fromUserPhotoURL: userData.photoURL,
          targetId: post.id,
          message: `commented on your post: "${newComment.substring(0, 50)}${newComment.length > 50 ? '...' : ''}"`,
          isRead: false,
          timestamp: serverTimestamp(),
        });

        batch.set(userNotificationsRef, { unreadCount: increment(1) }, { merge: true });
      }

      await batch.commit();

      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col">
        <SheetHeader>
          <SheetTitle>Comments</SheetTitle>
        </SheetHeader>
        <ScrollArea className="flex-1 pr-4 -mr-6">
          <div className="space-y-6 py-4">
            {comments.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={comment.avatar || `https://picsum.photos/seed/${comment.userId}/200/200`} alt={comment.username} />
                  <AvatarFallback>{comment.username?.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-baseline gap-2">
                    <p className="font-semibold text-sm">{comment.username}</p>
                    {comment.createdAt && (
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow((comment.createdAt as Timestamp).toDate(), { addSuffix: true })}
                      </p>
                    )}
                  </div>
                  <p className="text-sm">{comment.text}</p>
                </div>
              </div>
            ))}
            <div ref={scrollAreaRef} />
          </div>
        </ScrollArea>
        <SheetFooter className="mt-auto pt-4 border-t">
          {authUser && userData ? (
            <div className="flex w-full items-start gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={userData.photoURL} alt={userData.displayName || ''} />
                <AvatarFallback>
                  {userData.displayName?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 relative">
                <Textarea
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  className="pr-14 min-h-[40px]"
                  disabled={isSubmitting}
                />
                <Button
                  size="icon"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8"
                  onClick={handleCommentSubmit}
                  disabled={isSubmitting || !newComment.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center w-full">
              You must be logged in to comment.
            </p>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

