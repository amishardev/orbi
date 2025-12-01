
'use client';
import React, { useState, useEffect, useMemo, Suspense, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Search, Send, MessageSquare, Plus, ArrowLeft } from 'lucide-react';
import { AppLayout } from '@/components/app-layout';
import { useAuth } from '@/hooks/use-auth';
import { useChat, useMessages } from '@/hooks/use-chat';
import type { Chat, Message, User, Community } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { Skeleton } from '@/components/ui/skeleton';
import type { Timestamp } from 'firebase/firestore';
import { doc, onSnapshot, collection, query, getDocs, limit, startAt, endAt, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { NewChatDialog } from '@/components/new-chat-dialog';
import { CommunitiesList } from '@/components/communities/CommunitiesList';

function ChatListItem({ chat, isActive, onSelect, currentUserId }: { chat: Chat, isActive: boolean, onSelect: (chatId: string) => void, currentUserId: string }) {
  const otherParticipantId = chat.participants.find(p => p !== currentUserId);
  if (!otherParticipantId) return null;

  const otherParticipant = chat.participantDetails[otherParticipantId];
  if (!otherParticipant) return null;

  const lastMessage = chat.lastMessage;
  const fallback = otherParticipant.displayName?.split(' ').map(n => n[0]).join('') || 'U';
  const unreadCount = chat.unreadCounts?.[currentUserId] || 0;

  return (
    <div
      onClick={() => onSelect(chat.id)}
      className={cn(
        'flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/50',
        isActive && 'bg-secondary'
      )}
    >
      <Avatar className="h-12 w-12 border">
        <AvatarImage
          src={otherParticipant.photoURL?.includes('cloudinary')
            ? otherParticipant.photoURL.replace('/upload/', '/upload/w_100,h_100,c_fill,q_auto,f_auto/')
            : otherParticipant.photoURL}
          alt={otherParticipant.displayName}
        />
        <AvatarFallback>{fallback}</AvatarFallback>
      </Avatar>
      <div className="flex-1 overflow-hidden">
        <div className="flex justify-between items-baseline">
          <div className="flex flex-col">
            <Link
              href={`/profile/${otherParticipant.username}`}
              className="font-semibold truncate hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {otherParticipant.displayName}
            </Link>
            <span className="text-xs text-muted-foreground">@{otherParticipant.username}</span>
          </div>
          {lastMessage?.createdAt && (
            <p className="text-xs text-muted-foreground">
              {formatDistanceToNow((lastMessage.createdAt as Timestamp).toDate(), { addSuffix: true })}
            </p>
          )}
        </div>
        <div className="flex justify-between items-center">
          <p className={cn("text-sm text-muted-foreground truncate", unreadCount > 0 && "font-bold text-foreground")}>
            {lastMessage?.text || 'No messages yet'}
          </p>
          {unreadCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
              {unreadCount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function OtherUserStatus({ userId }: { userId: string }) {
  const [otherUser, setOtherUser] = useState<User | null>(null);

  useEffect(() => {
    if (!userId) return;
    const userRef = doc(db, 'users', userId);
    const unsubscribe = onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        setOtherUser(doc.data() as User);
      }
    });
    return () => unsubscribe();
  }, [userId]);

  if (!otherUser) {
    return null;
  }

  if (otherUser.isOnline) {
    return <p className="text-sm text-green-500">Online</p>;
  }

  if (otherUser.lastSeen) {
    return (
      <p className="text-sm text-muted-foreground">
        Active {formatDistanceToNow((otherUser.lastSeen as Timestamp).toDate(), { addSuffix: true })}
      </p>
    );
  }

  return <p className="text-sm text-muted-foreground">Offline</p>;
}

import { ChatInput } from '@/components/communities/chat-input/chat-input';
import { Reply } from 'lucide-react';

// ... existing imports ...

function MessageBubble({ message, otherUser, isOwnMessage, onReply }: { message: Message, otherUser: any, isOwnMessage: boolean, onReply: (msg: Message) => void }) {
  const scrollToMessage = (id: string) => {
    const element = document.getElementById(`message-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      element.classList.add('bg-primary/10');
      setTimeout(() => element.classList.remove('bg-primary/10'), 2000);
    }
  };

  return (
    <div
      id={`message-${message.id}`}
      className={cn(
        'group flex items-end gap-2 mb-4 transition-colors duration-500',
        isOwnMessage ? 'justify-end' : 'justify-start'
      )}
    >
      {!isOwnMessage && (
        <Avatar className='h-8 w-8 mb-1'>
          <AvatarImage src={otherUser.photoURL} alt={otherUser.displayName} />
          <AvatarFallback>{otherUser.displayName[0]}</AvatarFallback>
        </Avatar>
      )}

      <div className={cn("flex flex-col max-w-xs md:max-w-md", isOwnMessage ? "items-end" : "items-start")}>
        {/* Reply Preview Block */}
        {message.replyTo && (
          <div
            className="mb-1 text-xs bg-slate-800/50 border-l-2 border-slate-500 rounded-r p-2 cursor-pointer hover:bg-slate-800 transition-colors w-full"
            onClick={() => scrollToMessage(message.replyTo!.id)}
          >
            <p className="font-semibold text-slate-400">{message.replyTo.senderName}</p>
            <p className="truncate text-slate-500">{message.replyTo.textPreview}</p>
          </div>
        )}

        <div className="relative group/bubble">
          <div
            className={cn(
              'p-3 rounded-xl shadow-sm relative',
              isOwnMessage
                ? 'bg-primary text-primary-foreground rounded-br-none'
                : 'bg-card border rounded-bl-none'
            )}
          >
            {message.type === 'post_share' && message.shareData ? (
              <div className="flex flex-col gap-2 min-w-[200px]">
                {message.text && <p className="mb-1">{message.text}</p>}
                <div className="border rounded-lg overflow-hidden bg-background/50 max-w-sm">
                  <div className="p-2 flex items-center gap-2 border-b border-white/5">
                    <div className="text-xs font-medium text-muted-foreground">
                      Shared a post by <span className="text-foreground">{message.shareData.postAuthor}</span>
                    </div>
                  </div>
                  {message.shareData.postImage && (
                    <div className="relative aspect-video w-full">
                      {message.shareData.postType === 'video' ? (
                        <video src={message.shareData.postImage} className="w-full h-full object-cover" />
                      ) : (
                        <img // Using img tag here to avoid Next.js Image component issues in this context if needed, or keep Image
                          src={message.shareData.postImage}
                          alt="Shared post"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                  )}
                  <div className="p-2">
                    <p className="text-sm line-clamp-2 text-foreground">{message.shareData.postText || 'Check out this post!'}</p>
                  </div>
                  <Link
                    href={`/home#${message.shareData.postId}`}
                    className="block w-full p-2 text-center text-xs font-medium bg-primary/10 hover:bg-primary/20 transition-colors text-primary"
                  >
                    View Post
                  </Link>
                </div>
              </div>
            ) : (
              <p>{message.text}</p>
            )}
          </div>

          {/* Reply Button */}
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "absolute top-1/2 -translate-y-1/2 h-6 w-6 opacity-0 group-hover/bubble:opacity-100 transition-opacity",
              isOwnMessage ? "-left-8" : "-right-8"
            )}
            onClick={() => onReply(message)}
          >
            <Reply size={14} />
          </Button>
        </div>
      </div>
    </div>
  )
}

function MessagesContent() {
  const { authUser } = useAuth();
  const { chats, loading: chatsLoading, createOrGetChat } = useChat();
  const searchParams = useSearchParams();
  const router = useRouter();

  const selectedChatId = searchParams.get('chatId');


  const { messages, loading: messagesLoading, sendMessage } = useMessages(selectedChatId);
  const [activeTab, setActiveTab] = useState<'personal' | 'communities'>('personal');
  const [communities, setCommunities] = useState<Community[]>([]);
  const [communitiesLoading, setCommunitiesLoading] = useState(true);
  // const [newMessage, setNewMessage] = useState(''); // Removed in favor of ChatInput state
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch Communities
  useEffect(() => {
    if (!authUser) return;
    const q = query(
      collection(db, 'communities'),
      where('members', 'array-contains', authUser.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const communitiesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Community[];
      setCommunities(communitiesData);
      setCommunitiesLoading(false);
    });
    return () => unsubscribe();
  }, [authUser]);
  const [globalSearchResults, setGlobalSearchResults] = useState<User[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [replyingToMessage, setReplyingToMessage] = useState<{ id: string; senderName: string; textPreview: string } | null>(null);

  // Global User Search
  useEffect(() => {
    const searchGlobalUsers = async () => {
      if (!searchQuery.trim()) {
        setGlobalSearchResults([]);
        return;
      }

      try {
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          orderBy('displayName_lowercase'),
          startAt(searchQuery.toLowerCase()),
          endAt(searchQuery.toLowerCase() + '\uf8ff'),
          limit(5)
        );

        const querySnapshot = await getDocs(q);
        const users = querySnapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() } as User))
          .filter(user => user.id !== authUser?.uid);

        setGlobalSearchResults(users);
      } catch (error) {
        console.error("Error searching global users:", error);
      }
    };

    const timeoutId = setTimeout(searchGlobalUsers, 300); // Debounce
    return () => clearTimeout(timeoutId);
  }, [searchQuery, authUser]);

  const filteredChats = useMemo(() => {
    if (!searchQuery.trim()) return chats;
    return chats.filter(chat => {
      const otherParticipantId = chat.participants.find(p => p !== authUser?.uid);
      if (!otherParticipantId) return false;
      const otherParticipant = chat.participantDetails[otherParticipantId];
      if (!otherParticipant) return false;

      const query = searchQuery.toLowerCase();
      return (
        otherParticipant.displayName.toLowerCase().includes(query) ||
        otherParticipant.username.toLowerCase().includes(query)
      );
    });
  }, [chats, searchQuery, authUser]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight });
    }
  }, [messages, selectedChatId]);


  const selectedChat = useMemo(() => {
    return chats.find(c => c.id === selectedChatId);
  }, [chats, selectedChatId]);

  const otherUser = useMemo(() => {
    if (!selectedChat || !authUser) return null;
    const otherUserId = selectedChat.participants.find(p => p !== authUser.uid);
    if (!otherUserId) return null;
    return { id: otherUserId, ...selectedChat.participantDetails[otherUserId] };
  }, [selectedChat, authUser]);

  const handleSelectChat = (chatId: string) => {
    router.push(`/messages?chatId=${chatId}`, { scroll: false });
  }

  const handleSendMessage = async (text: string) => {
    if (text.trim() && selectedChatId) {
      await sendMessage(text, replyingToMessage || undefined);
      setReplyingToMessage(null);
    }
  };

  const handleReply = (msg: Message) => {
    const isOwnMessage = msg.senderId === authUser?.uid;
    const senderName = isOwnMessage ? 'You' : otherUser?.displayName || 'Unknown';
    setReplyingToMessage({
      id: msg.id,
      senderName,
      textPreview: msg.text.substring(0, 50) + (msg.text.length > 50 ? '...' : '')
    });
  };

  if (!authUser) {
    return <div className="flex items-center justify-center h-full"><p>Please log in to view messages.</p></div>;
  }

  return (
    <div className="h-[calc(100vh-5rem)] flex relative">
      <aside className={cn(
        "w-full md:w-80 border-r flex flex-col bg-card",
        selectedChatId ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b flex items-center justify-between">
          <h1 className="text-2xl font-bold font-headline">Messages</h1>
          <NewChatDialog />
        </div>

        {/* TABS (Mobile Only or Both? User said Mobile Only for Tabs, but let's keep it consistent for now or hide on desktop if requested. User said "On Desktop... keep existing layout". But tabs are useful. Let's keep tabs for now as they are in the code.) */}
        <div className="px-4 pt-2 pb-0 md:hidden">
          <div className="flex p-1 bg-slate-900 rounded-lg">
            <button
              onClick={() => setActiveTab('personal')}
              className={cn(
                "flex-1 py-1.5 text-sm font-bold rounded-md transition-all",
                activeTab === 'personal' ? "bg-white text-black shadow" : "text-gray-400 hover:text-white"
              )}
            >
              Personal
            </button>
            <button
              onClick={() => setActiveTab('communities')}
              className={cn(
                "flex-1 py-1.5 text-sm font-bold rounded-md transition-all",
                activeTab === 'communities' ? "bg-white text-black shadow" : "text-gray-400 hover:text-white"
              )}
            >
              Communities
            </button>
          </div>
        </div>

        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search messages"
              className="pl-10 bg-secondary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {activeTab === 'personal' ? (
            chatsLoading ? (
              <div className="p-4 space-y-4">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (
              <>
                {filteredChats.map(chat => (
                  <ChatListItem
                    key={chat.id}
                    chat={chat}
                    isActive={chat.id === selectedChatId}
                    onSelect={handleSelectChat}
                    currentUserId={authUser.uid}
                  />
                ))}

                {/* Global Search Results */}
                {searchQuery && globalSearchResults.length > 0 && (
                  <div className="mt-4">
                    <p className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      More People
                    </p>
                    {globalSearchResults.map(user => {
                      const existingChat = chats.find(c => c.participants.includes(user.id));
                      if (existingChat) return null;

                      return (
                        <div
                          key={user.id}
                          onClick={async () => {
                            try {
                              const chatId = await createOrGetChat(user.id);
                              setSearchQuery('');
                              router.push(`/messages?chatId=${chatId}`);
                            } catch (error) {
                              console.error("Error creating chat:", error);
                            }
                          }}
                          className="flex items-center gap-3 p-4 cursor-pointer hover:bg-secondary/50"
                        >
                          <Avatar className="h-10 w-10 border">
                            <AvatarImage
                              src={user.photoURL?.includes('cloudinary') ? user.photoURL.replace('/upload/', '/upload/w_100,h_100,c_fill,q_auto,f_auto/') : user.photoURL}
                              alt={user.displayName}
                            />
                            <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 overflow-hidden">
                            <p className="font-semibold truncate">{user.displayName}</p>
                            <p className="text-xs text-muted-foreground">@{user.username}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
            )
          ) : (
            <CommunitiesList communities={communities} loading={communitiesLoading} />
          )}
        </ScrollArea>
      </aside>

      <section className={cn(
        "flex-1 flex flex-col bg-background",
        selectedChatId ? "flex fixed inset-0 z-50 md:static md:z-auto" : "hidden md:flex"
      )}>
        {selectedChat && otherUser ? (
          <>
            <div className="p-4 border-b flex items-center gap-4 bg-card">
              <Link href="/messages" className="md:hidden">
                <ArrowLeft className="h-6 w-6" />
              </Link>
              <Avatar>
                <AvatarImage src={otherUser.photoURL} alt={otherUser.displayName} />
                <AvatarFallback>
                  {otherUser.displayName.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <div>
                <Link
                  href={`/profile/${otherUser.username}`}
                  className="hover:underline"
                >
                  <h2 className="font-semibold text-lg">{otherUser.displayName}</h2>
                </Link>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">@{otherUser.username}</span>
                  <span className="text-muted-foreground">·</span>
                  <OtherUserStatus userId={otherUser.id} />
                </div>
              </div>
            </div>
            <ScrollArea className="flex-1" ref={scrollAreaRef}>
              <div className="p-6 space-y-6 bg-muted/30 h-full">
                {messagesLoading ? (
                  <div className="p-4 space-y-4">
                    <Skeleton className="h-10 w-2/3 ml-auto rounded-xl" />
                    <Skeleton className="h-10 w-2/3 rounded-xl" />
                    <Skeleton className="h-10 w-1/2 ml-auto rounded-xl" />
                  </div>
                ) : (
                  messages.map(message => (
                    <MessageBubble
                      key={message.id}
                      message={message}
                      otherUser={otherUser}
                      isOwnMessage={message.senderId === authUser.uid}
                      onReply={handleReply}
                    />
                  ))
                )}
              </div>
            </ScrollArea>
            <div className="p-0 bg-card">
              <ChatInput
                onSendMessage={handleSendMessage}
                onUploadImage={() => { }} // Placeholder for now
                replyTo={replyingToMessage}
                onCancelReply={() => setReplyingToMessage(null)}
                placeholder="Type a message..."
              />
            </div>
          </>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-4">
            <MessageSquare className="w-16 h-16 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">Your Messages</h2>
            <p className="mt-2 text-muted-foreground">Select a conversation or start a new one.</p>
          </div>
        )}
      </section>
    </div>
  );
}

export default function MessagesPage() {
  return (
    <AppLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <MessagesContent />
      </Suspense>
    </AppLayout>
  )
}
