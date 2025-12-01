'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Image as ImageIcon, Smile, Send } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, limit, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import type { Community, CommunityMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { uploadMedia } from '@/app/actions/upload';
import { useToast } from '@/hooks/use-toast';
import { ChatInput } from './chat-input/chat-input';
import { ChatHeader } from './chat-header';
import { useReadReceipts } from '@/hooks/use-read-receipts';

interface ChatAreaProps {
    community: Community;
    isInfoPanelOpen: boolean;
    onToggleInfoPanel: () => void;
}

// ... inside component
export function ChatArea({ community, isInfoPanelOpen, onToggleInfoPanel }: ChatAreaProps) {
    const { authUser } = useAuth();
    const { toast } = useToast();
    const [messages, setMessages] = useState<CommunityMessage[]>([]);
    // Removed newMessage state as it's handled in ChatInput
    const [replyingToMessage, setReplyingToMessage] = useState<{ id: string; senderName: string; textPreview: string } | null>(null);
    const [isSending, setIsSending] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [shouldAutoScroll, setShouldAutoScroll] = useState(true);

    const { seenByMap, markChannelAsRead } = useReadReceipts(community.id);

    // Real-time listener
    useEffect(() => {
        if (!community.id) return;

        const q = query(
            collection(db, 'communities', community.id, 'messages'),
            orderBy('createdAt', 'asc'),
            limit(100)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as CommunityMessage[];

            setMessages(msgs);
        });

        return () => unsubscribe();
    }, [community.id]);

    // Mark channel as read when new messages arrive
    useEffect(() => {
        if (messages.length > 0) {
            const lastMessage = messages[messages.length - 1];
            markChannelAsRead(lastMessage.id);
        }
    }, [messages, community.id]);

    // Auto-scroll logic
    useEffect(() => {
        if (shouldAutoScroll && scrollRef.current) {
            const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [messages, shouldAutoScroll]);

    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
        // If user scrolls up, disable auto-scroll. If at bottom, enable it.
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 50;
        setShouldAutoScroll(isAtBottom);
    };

    // ... existing code ...

    const handleSendMessage = async (text: string) => {
        if ((!text.trim()) || !authUser || isSending) return;

        const textToSend = text.trim();
        setIsSending(true);

        try {
            const messageData: any = {
                text: textToSend,
                senderId: authUser.uid,
                senderName: authUser.displayName || 'User',
                senderAvatar: authUser.photoURL || '',
                createdAt: serverTimestamp(),
                type: 'text',
                user: {
                    displayName: authUser.displayName || 'User',
                    photoURL: authUser.photoURL || ''
                }
            };

            if (replyingToMessage) {
                messageData.replyTo = replyingToMessage;
            }

            await addDoc(collection(db, 'communities', community.id, 'messages'), messageData);

            // Update last message on community doc - separate try/catch to not block message sending
            try {
                await updateDoc(doc(db, 'communities', community.id), {
                    lastMessageAt: serverTimestamp()
                });
            } catch (updateError) {
                console.warn("Failed to update community lastMessageAt:", updateError);
                // Suppress error for user as message was sent successfully
            }

            setReplyingToMessage(null); // Clear reply state after sending

        } catch (error) {
            console.error("Error sending message:", error);
            toast({
                title: "Error",
                description: "Failed to send message.",
                variant: "destructive"
            });
        } finally {
            setIsSending(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !authUser) return;

        try {
            // Check if it's a video
            if (file.type.startsWith('video/')) {
                // Check size limit (20MB)
                if (file.size > 20 * 1024 * 1024) {
                    toast({
                        variant: 'destructive',
                        title: 'File too large',
                        description: 'Video size must be less than 20MB for chats.',
                    });
                    return;
                }

                const loadingToast = toast({
                    title: "Uploading Video",
                    description: "Optimizing Video Storage...",
                });

                const { uploadVideo } = await import('@/lib/uploadUtils');
                const videoUrl = await uploadVideo(file);

                loadingToast.dismiss();

                await addDoc(collection(db, 'communities', community.id, 'messages'), {
                    text: 'Sent a video',
                    videoUrl: videoUrl,
                    senderId: authUser.uid,
                    senderName: authUser.displayName || 'User',
                    senderAvatar: authUser.photoURL || '',
                    createdAt: serverTimestamp(),
                    type: 'video',
                    user: {
                        displayName: authUser.displayName || 'User',
                        photoURL: authUser.photoURL || ''
                    }
                });

                toast({
                    title: "Success",
                    description: "Video uploaded successfully!",
                });

            } else {
                // Existing image upload logic
                const formData = new FormData();
                formData.append('media', file);
                const uploadResult = await uploadMedia(formData);

                if (uploadResult?.url) {
                    await addDoc(collection(db, 'communities', community.id, 'messages'), {
                        text: 'Sent an image',
                        imageUrl: uploadResult.url,
                        senderId: authUser.uid,
                        senderName: authUser.displayName || 'User',
                        senderAvatar: authUser.photoURL || '',
                        createdAt: serverTimestamp(),
                        type: 'image',
                        user: {
                            displayName: authUser.displayName || 'User',
                            photoURL: authUser.photoURL || ''
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Error uploading media:", error);
            toast({
                title: "Error",
                description: "Failed to upload media.",
                variant: "destructive"
            });
        }
    };

    const scrollToMessage = (messageId: string) => {
        const element = document.getElementById(`message-${messageId}`);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            element.classList.add('bg-primary/10');
            setTimeout(() => element.classList.remove('bg-primary/10'), 2000);
        }
    };

    return (
        <div className="flex flex-col h-full bg-background">
            <ChatHeader
                community={community}
                isInfoPanelOpen={isInfoPanelOpen}
                onToggleInfoPanel={onToggleInfoPanel}
            />

            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollRef} onScrollCapture={handleScroll}>
                <div className="space-y-4 pb-4">
                    {messages.map((msg, index) => {
                        const isMe = msg.senderId === authUser?.uid;
                        const showHeader = index === 0 || messages[index - 1].senderId !== msg.senderId || (msg.createdAt && messages[index - 1].createdAt && (msg.createdAt.toMillis() - messages[index - 1].createdAt!.toMillis() > 300000)); // 5 mins

                        return (
                            <div key={msg.id} id={`message-${msg.id}`} className={cn("flex gap-3 group relative transition-colors duration-500 rounded-lg p-1", isMe ? "flex-row-reverse" : "")}>
                                {showHeader ? (
                                    <Avatar className="h-10 w-10 mt-0.5 cursor-pointer hover:opacity-80 transition-opacity">
                                        <AvatarImage src={msg.senderAvatar} />
                                        <AvatarFallback>{msg.senderName[0]}</AvatarFallback>
                                    </Avatar>
                                ) : (
                                    <div className="w-10" /> // Spacer
                                )}

                                <div className={cn("flex flex-col max-w-[70%]", isMe ? "items-end" : "items-start")}>
                                    {showHeader && (
                                        <div className="flex items-baseline gap-2 mb-1">
                                            <span className="font-semibold text-sm hover:underline cursor-pointer">{msg.senderName}</span>
                                            <span className="text-[10px] text-muted-foreground">
                                                {msg.createdAt ? formatDistanceToNow(msg.createdAt.toDate(), { addSuffix: true }) : 'Just now'}
                                            </span>
                                        </div>
                                    )}

                                    {/* Reply Button (Visible on Hover) */}
                                    <button
                                        onClick={() => setReplyingToMessage({
                                            id: msg.id,
                                            senderName: msg.senderName,
                                            textPreview: msg.text.substring(0, 50) + (msg.text.length > 50 ? '...' : '')
                                        })}
                                        className={cn(
                                            "absolute top-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full bg-secondary hover:bg-secondary/80 text-secondary-foreground shadow-sm z-10",
                                            isMe ? "-left-8" : "-right-8"
                                        )}
                                        title="Reply"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></svg>
                                    </button>

                                    <div className={cn(
                                        "px-4 py-2 rounded-2xl text-sm shadow-sm relative group/msg",
                                        isMe
                                            ? "bg-primary text-primary-foreground rounded-tr-none"
                                            : "bg-card border rounded-tl-none"
                                    )}>
                                        {/* Quoted Reply Block */}
                                        {msg.replyTo && (
                                            <div
                                                className="mb-2 p-2 rounded bg-black/10 dark:bg-white/10 border-l-2 border-primary/50 text-xs cursor-pointer hover:opacity-80"
                                                onClick={() => scrollToMessage(msg.replyTo!.id)}
                                            >
                                                <div className="font-semibold opacity-75 mb-0.5">{msg.replyTo.senderName}</div>
                                                <div className="opacity-60 truncate">{msg.replyTo.textPreview}</div>
                                            </div>
                                        )}

                                        {msg.type === 'image' && msg.imageUrl ? (
                                            <img
                                                src={msg.imageUrl}
                                                alt="Attachment"
                                                className="max-w-full rounded-lg mb-1 cursor-pointer hover:opacity-90"
                                                loading="lazy"
                                            />
                                        ) : msg.type === 'video' && msg.videoUrl ? (
                                            <video
                                                src={msg.videoUrl}
                                                controls
                                                className="max-w-full rounded-lg mb-1"
                                            />
                                        ) : (
                                            <p className="whitespace-pre-wrap break-words">{msg.text}</p>
                                        )}
                                    </div>

                                    {/* Seen By Avatars */}
                                    {(() => {
                                        const viewers = seenByMap[msg.id]?.filter(u => u.userId !== authUser?.uid) || [];
                                        if (viewers.length === 0) return null;

                                        return (
                                            <div className={cn(
                                                "flex mt-1",
                                                isMe ? "justify-end mr-1" : "justify-start ml-1"
                                            )}>
                                                <div className="flex -space-x-1.5">
                                                    {viewers.slice(0, 3).map((user) => (
                                                        <Avatar key={user.userId} className="h-4 w-4 border-2 border-background ring-2 ring-background z-0 hover:z-10 transition-all">
                                                            <AvatarImage src={user.userAvatar} />
                                                            <AvatarFallback className="text-[6px]">{user.username[0]}</AvatarFallback>
                                                        </Avatar>
                                                    ))}
                                                    {viewers.length > 3 && (
                                                        <div className="h-4 w-4 rounded-full bg-muted flex items-center justify-center text-[8px] border-2 border-background ring-2 ring-background z-10 font-bold text-muted-foreground">
                                                            +{viewers.length - 3}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })()}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </ScrollArea>

            {/* Input Area */}
            <ChatInput
                onSendMessage={handleSendMessage}
                onUploadImage={handleImageUpload}
                placeholder={`Message #${community.name}`}
                isSending={isSending}
                replyTo={replyingToMessage}
                onCancelReply={() => setReplyingToMessage(null)}
            />
        </div>
    );
}
