
'use client';
import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { MessageCircle, ThumbsUp, MoreHorizontal, Trash2, Send, BadgeCheck } from 'lucide-react';
import type { Post, ReactionEmoji } from '@/lib/types';
import { db } from '@/lib/firebase-client';
import { doc, onSnapshot, getDoc, writeBatch, arrayUnion, arrayRemove, deleteDoc, collection, increment, serverTimestamp } from 'firebase/firestore';
import type { Timestamp } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { CommentsSheet } from './comments-sheet';
import { SharePostModal } from './SharePostModal';
import { cn } from '@/lib/utils';
import { Skeleton } from './ui/skeleton';
import { ReactionPicker } from './reaction-picker';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import EmbedRenderer from './embed-renderer';


function PostSkeleton() {
  return (
    <Card className="p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-full" />
        <div className="space-y-2">
          <Skeleton className="h-4 w-[250px]" />
          <Skeleton className="h-4 w-[200px]" />
        </div>
      </div>
      <Skeleton className="h-4 w-full mt-4" />
      <Skeleton className="h-4 w-3/4 mt-2" />
      <Skeleton className="aspect-video w-full mt-4 rounded-lg" />
    </Card>
  );
}

export function PostCard({ postId }: { postId: string }) {
  const { authUser, userData } = useAuth();
  const [post, setPost] = useState<Post | null>(null);
  const [userReaction, setUserReaction] = useState<ReactionEmoji | null>(null);
  const [isCommentsOpen, setIsCommentsOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [displayTimestamp, setDisplayTimestamp] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isAuthor = post?.userId === authUser?.uid;

  useEffect(() => {
    if (!postId || !db) {
      setLoading(false);
      return;
    }
    const postRef = doc(db, 'posts', postId);
    const unsubscribe = onSnapshot(postRef, (doc) => {
      if (doc.exists()) {
        const postData = { id: doc.id, ...doc.data() } as Post;
        setPost(postData);

        if (authUser && postData.reactions) {
          let reaction = null;
          for (const emoji in postData.reactions) {
            const reactionList = postData.reactions[emoji as ReactionEmoji];
            if (Array.isArray(reactionList) && reactionList.includes(authUser.uid)) {
              reaction = emoji as ReactionEmoji;
              break;
            }
          }
          setUserReaction(reaction);
        }

        if (postData.createdAt) {
          setDisplayTimestamp(`${formatDistanceToNow((postData.createdAt as Timestamp).toDate())} ago`);
        } else {
          setDisplayTimestamp('Just now');
        }
      } else {
        setPost(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [postId, authUser]);


  const handleReaction = async (selectedEmoji: ReactionEmoji) => {
    if (!authUser?.uid || !post?.id || !db || !userData) return;

    const postRef = doc(db, "posts", post.id);

    try {
      const batch = writeBatch(db);
      const postDoc = await getDoc(postRef);

      if (!postDoc.exists()) {
        throw "Post does not exist!";
      }

      const currentReactions = postDoc.data().reactions || {};
      let newReactions = { ...currentReactions };
      let previousReaction = userReaction;
      let isNewReaction = false;

      // If user is removing their reaction
      if (previousReaction === selectedEmoji) {
        newReactions[selectedEmoji] = arrayRemove(authUser.uid);
        setUserReaction(null);
      } else {
        isNewReaction = true;
        // If user had a previous reaction, remove it
        if (previousReaction) {
          newReactions[previousReaction] = arrayRemove(authUser.uid);
        }
        // Add the new reaction
        newReactions[selectedEmoji] = arrayUnion(authUser.uid);
        setUserReaction(selectedEmoji);
      }

      batch.update(postRef, { reactions: newReactions });

      // Notification Logic
      if (isNewReaction && post.userId !== authUser.uid) {
        const notificationsColRef = collection(db, 'notifications', post.userId, 'items');
        const userNotificationsRef = doc(db, 'notifications', post.userId);
        const newNotifRef = doc(notificationsColRef);

        batch.set(newNotifRef, {
          id: newNotifRef.id,
          type: 'reaction',
          fromUserId: authUser.uid,
          fromUsername: userData.username,
          fromUserPhotoURL: userData.photoURL,
          targetId: post.id,
          message: `reacted to your post`,
          metadata: {
            reactionEmoji: selectedEmoji,
          },
          isRead: false,
          timestamp: serverTimestamp(),
        });

        batch.set(userNotificationsRef, {
          unreadCount: increment(1)
        }, { merge: true });
      }

      await batch.commit();

    } catch (e) {
      console.error("Transaction failed: ", e);
    }
  }

  const handleDeletePost = async () => {
    if (!isAuthor || !post?.id || !db) return;
    const postRef = doc(db, 'posts', post.id);
    try {
      await deleteDoc(postRef);
    } catch (error) {
      console.error("Error deleting post: ", error);
    }
    setIsDeleteDialogOpen(false);
  }

  const renderReactions = () => {
    if (!post || !post.reactions) return null;

    const reactions = post.reactions || {};
    const activeEmojis: ReactionEmoji[] = [];
    let totalCount = 0;

    for (const emoji in reactions) {
      const emojiKey = emoji as ReactionEmoji;
      const reactionList = reactions[emojiKey];
      if (Array.isArray(reactionList) && reactionList.length > 0) {
        activeEmojis.push(emojiKey);
        totalCount += reactionList.length;
      }
    }

    if (totalCount === 0) return null;

    return (
      <div className="flex items-center gap-2">
        <div className="flex -space-x-2">
          {activeEmojis.map((emoji) => (
            <span
              key={emoji}
              className="w-6 h-6 flex items-center justify-center text-sm bg-background border-2 border-background rounded-full"
            >
              {emoji}
            </span>
          ))}
        </div>
        <span className="ml-1 text-muted-foreground">{totalCount} {totalCount === 1 ? 'person' : 'people'} reacted</span>
      </div>
    );
  }

  const renderCaption = (caption: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = caption.split(urlRegex);

    return parts.map((part, index) => {
      if (urlRegex.test(part)) {
        // We hide the raw URL if an embed is present for it
        if (post?.embed && post.embed.url === part) {
          return null;
        }
        return (
          <a
            key={index}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {part}
          </a>
        );
      }
      if (part.startsWith('@')) {
        const username = part.substring(1).replace(/[.,!?;:]$/, '');
        return (
          <Link
            key={index}
            href={`/profile/${username}`}
            className="text-primary hover:underline font-medium"
          >
            {part}
          </Link>
        );
      }
      return <React.Fragment key={index}>{part}</React.Fragment>;
    });
  };

  const [authorStatus, setAuthorStatus] = useState<{ isVerified: boolean; isAgent: boolean } | null>(null);

  useEffect(() => {
    if (!post?.userId) return;

    const fetchAuthorStatus = async () => {
      try {
        const userRef = doc(db, 'users', post.userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const data = userSnap.data();
          setAuthorStatus({
            isVerified: !!data.isVerified,
            isAgent: !!data.isAgent
          });
        }
      } catch (error) {
        console.error("Error fetching author status:", error);
      }
    };

    fetchAuthorStatus();
  }, [post?.userId]);

  if (loading) {
    return <PostSkeleton />;
  }

  if (!post) {
    return null;
  }

  const postAuthorUsername = post.username || 'user';
  const postAuthorName = post.authorDisplayName || post.username || 'User';
  const postAuthorAvatar = post.authorPhotoURL || `https://picsum.photos/seed/${post.userId}/200/200`;

  return (
    <>
      <Card className={`overflow-hidden shadow-sm ${post.bgColorClassName || 'bg-card'}`}>
        <CardHeader className="flex flex-row items-center gap-4 p-6">
          <Avatar className='w-12 h-12'>
            <AvatarImage src={postAuthorAvatar} alt={postAuthorName} />
            <AvatarFallback>
              {postAuthorName
                ?.split(' ')
                .map(n => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <CardTitle className="text-base font-bold flex items-center gap-1">
              <Link href={`/profile/${postAuthorUsername}`} className="hover:underline">
                {postAuthorName}
              </Link>
              {authorStatus?.isVerified && (
                <BadgeCheck className="h-4 w-4 text-white fill-blue-500" />
              )}
              {authorStatus?.isAgent && (
                <BadgeCheck className="h-4 w-4 text-white fill-green-500" />
              )}
            </CardTitle>
            <CardDescription>{displayTimestamp}</CardDescription>
          </div>
          {isAuthor && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setIsDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </CardHeader>
        <CardContent className="px-6 pb-4 space-y-4">
          {post.caption && (
            <p className="whitespace-pre-wrap">{renderCaption(post.caption)}</p>
          )}
          {post.embed && <EmbedRenderer embed={post.embed} />}
          {post.mediaUrls && post.mediaUrls.length > 1 ? (
            <div className="relative">
              <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide aspect-video rounded-lg border bg-black">
                {post.mediaUrls.map((url, index) => (
                  <div key={index} className="flex-none w-full h-full snap-center relative">
                    <Image
                      src={url}
                      alt={`Post image ${index + 1}`}
                      fill
                      className="object-contain"
                    />
                  </div>
                ))}
              </div>
              <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
                {post.mediaUrls.map((_, index) => (
                  <div
                    key={index}
                    className="w-1.5 h-1.5 rounded-full bg-white/50 backdrop-blur-sm"
                  />
                ))}
              </div>
            </div>
          ) : (post.mediaUrl || (post.mediaUrls && post.mediaUrls.length === 1)) && (
            <div className="aspect-video relative rounded-lg overflow-hidden border">
              {post.mediaType === 'image' || (post.mediaUrls && post.mediaUrls.length === 1) ? (
                <Image
                  src={post.mediaUrls ? post.mediaUrls[0] : post.mediaUrl!}
                  alt={`Post by ${postAuthorName}`}
                  fill
                  className="object-contain"
                  data-ai-hint={post.imageHint}
                />
              ) : post.mediaType === 'video' ? (
                <video
                  src={post.mediaUrl!}
                  controls
                  className="w-full h-full object-contain bg-black"
                />
              ) : null}
            </div>
          )}
        </CardContent>
        {((post.commentsCount && post.commentsCount > 0) || (post.reactions && Object.values(post.reactions).some(r => Array.isArray(r) && r.length > 0))) && (
          <div className="px-6 pb-4 flex justify-between items-center text-sm text-muted-foreground">
            {renderReactions()}
            {post.commentsCount > 0 && (
              <button
                className="hover:underline"
                onClick={() => setIsCommentsOpen(true)}
              >
                {post.commentsCount} {post.commentsCount === 1 ? 'comment' : 'comments'}
              </button>
            )}
          </div>
        )}
        <div className="px-6 pb-2">
          <div className="h-px bg-border w-full" />
        </div>
        <CardFooter className="flex justify-around p-2">
          <ReactionPicker onSelect={handleReaction}>
            <Button
              variant="ghost"
              className={cn(
                "w-full rounded-md font-semibold text-muted-foreground",
                userReaction && 'font-bold',
                userReaction === '👍' && 'text-blue-500',
                userReaction === '❤️' && 'text-red-500',
                userReaction === '😂' && 'text-yellow-500',
                userReaction === '💀' && 'text-gray-500',
                userReaction === '🔥' && 'text-orange-500',
                userReaction === '😍' && 'text-pink-500',
                userReaction === '🗿' && 'text-stone-500',
              )}
              onClick={() => handleReaction(userReaction ? userReaction : '👍')}
            >
              {userReaction ? (
                <span className="text-xl mr-2">{userReaction}</span>
              ) : (
                <ThumbsUp className="mr-2 h-5 w-5" />
              )}
              {userReaction ? 'Reacted' : 'Like'}
            </Button>
          </ReactionPicker>
          <Button variant="ghost" className='w-full rounded-md font-semibold text-muted-foreground' onClick={() => setIsCommentsOpen(true)}>
            <MessageCircle className="mr-2 h-5 w-5" />
            Comment
          </Button>
          <Button variant="ghost" className='w-full rounded-md font-semibold text-muted-foreground' onClick={() => setIsShareModalOpen(true)}>
            <Send className="mr-2 h-5 w-5" />
            Share
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePost} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {authUser && post && <CommentsSheet post={post} open={isCommentsOpen} onOpenChange={setIsCommentsOpen} />}
      {authUser && post && <SharePostModal post={post} open={isShareModalOpen} onOpenChange={setIsShareModalOpen} />}
    </>
  );
}
