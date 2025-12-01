'use client';

import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { CommunityHeader } from '@/components/communities/CommunityHeader';
import { formatDistance } from 'date-fns';
import { Community, CommunityMessage } from '@/lib/types';
import {
  listenToCommunityMessages,
  sendCommunityMessage,
} from '@/firebase/communitiesService';
import Image from 'next/image';
import { ChatInput } from '@/components/communities/chat-input/chat-input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface ChatMessageProps {
  message: CommunityMessage;
  isSameUser: boolean;
}

function ChatMessage({ message, isSameUser }: ChatMessageProps) {
  const renderContent = () => {
    switch (message.type) {
      case 'image':
        return (
          <div className="relative w-64 h-64">
            <Image
              src={message.text}
              alt="Image message"
              fill
              className="object-cover rounded-lg"
            />
          </div>
        );
      case 'gif':
        return (
          <div className="relative w-64 h-64">
            <Image
              src={message.text}
              alt="GIF message"
              fill
              className="object-cover rounded-lg"
            />
          </div>
        );
      case 'post_share':
        return (
          <div className="flex flex-col gap-2">
            {message.text && <p className="text-sm">{message.text}</p>}
            {message.shareData && (
              <div className="border rounded-lg overflow-hidden bg-secondary/30 max-w-sm">
                <div className="p-3 flex items-center gap-2 border-b border-white/5">
                  <div className="text-xs font-medium text-muted-foreground">
                    Shared a post by <span className="text-foreground">{message.shareData.postAuthor}</span>
                  </div>
                </div>
                {message.shareData.postImage && (
                  <div className="relative aspect-video w-full">
                    {message.shareData.postType === 'video' ? (
                      <video src={message.shareData.postImage} className="w-full h-full object-cover" />
                    ) : (
                      <Image
                        src={message.shareData.postImage}
                        alt="Shared post"
                        fill
                        className="object-cover"
                      />
                    )}
                  </div>
                )}
                <div className="p-3">
                  <p className="text-sm line-clamp-2">{message.shareData.postText || 'Check out this post!'}</p>
                </div>
                <a
                  href={`/home#${message.shareData.postId}`}
                  className="block w-full p-2 text-center text-xs font-medium bg-primary/10 hover:bg-primary/20 transition-colors text-primary"
                >
                  View Post
                </a>
              </div>
            )}
          </div>
        );
      default:
        return <p className="text-sm">{message.text}</p>;
    }
  };

  return (
    <div className={`flex gap-3 ${isSameUser ? 'mt-1' : 'mt-6'}`}>
      {!isSameUser && (
        <Avatar className="w-8 h-8">
          <AvatarImage src={message.user?.photoURL || undefined} />
          <AvatarFallback>
            {message.user?.displayName?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
      )}
      <div className={`flex-1 ${isSameUser ? 'ml-11' : ''}`}>
        {!isSameUser && (
          <div className="flex items-baseline gap-2 mb-1">
            <span className="font-medium">{message.user?.displayName || 'Unknown User'}</span>
            <span className="text-xs text-muted-foreground">
              {message.createdAt && formatDistance(message.createdAt.toDate(), new Date(), {
                addSuffix: true,
              })}
            </span>
          </div>
        )}
        {renderContent()}
      </div>
    </div>
  );
}

interface CommunityProps {
  community: Community;
}

export function CommunityChat({ community }: CommunityProps) {
  const { authUser } = useAuth();
  const [messages, setMessages] = useState<CommunityMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { slug } = useParams();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    if (!slug) return;

    const unsubscribe = listenToCommunityMessages(slug as string, (newMessages) => {
      setMessages(newMessages);
      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
      }, 100);
    });

    return () => unsubscribe();
  }, [slug]);

  // Function to handle image upload
  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Image size should be less than 5MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  return (
    <div className="flex flex-col h-[100dvh] md:h-full fixed inset-0 md:relative z-50 bg-background md:z-auto">
      <div className="flex-none">
        <CommunityHeader community={community} />
      </div>

      <ScrollArea className="flex-1 px-4" ref={scrollAreaRef}>
        <div className="space-y-1 pb-4">
          {messages.map((message, i) => (
            <ChatMessage
              key={message.id}
              message={message}
              isSameUser={
                !!(i > 0 &&
                  messages[i - 1].senderId === message.senderId &&
                  message.createdAt &&
                  messages[i - 1].createdAt &&
                  message.createdAt.toDate().getTime() -
                  messages[i - 1].createdAt!.toDate().getTime() <
                  5 * 60 * 1000)
              }
            />
          ))}
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              No messages yet. Start a conversation!
            </div>
          )}
        </div>
      </ScrollArea>

      <div className="flex-none p-0 bg-background pb-[env(safe-area-inset-bottom)]">
        <ChatInput
          onSendMessage={async (text) => {
            if (!authUser || !community.id) return;
            try {
              await sendCommunityMessage(community.id, {
                text: text.trim(),
                senderId: authUser.uid,
                type: 'text'
              });
            } catch (error) {
              console.error('Error sending message:', error);
            }
          }}
          onUploadImage={handleImageChange}
          placeholder="Type a message..."
        />
      </div>

      <Dialog open={!!selectedFile} onOpenChange={(open) => !open && setSelectedFile(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Image</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {selectedFile && (
              <div className="relative aspect-video w-full overflow-hidden rounded-lg border">
                <img
                  src={URL.createObjectURL(selectedFile)}
                  alt="Preview"
                  className="h-full w-full object-contain"
                />
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedFile(null)}>Cancel</Button>
              <Button onClick={async () => {
                if (!authUser || !community.id || !selectedFile) return;
                setIsLoading(true);
                try {
                  const formData = new FormData();
                  formData.append('file', selectedFile);
                  const response = await fetch('/api/upload', {
                    method: 'POST',
                    body: formData
                  });
                  const { url } = await response.json();

                  await sendCommunityMessage(community.id, {
                    text: url,
                    senderId: authUser.uid,
                    type: 'image'
                  });
                  setSelectedFile(null);
                } catch (error) {
                  console.error('Error sending image:', error);
                } finally {
                  setIsLoading(false);
                }
              }} disabled={isLoading}>
                {isLoading ? 'Sending...' : 'Send'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}