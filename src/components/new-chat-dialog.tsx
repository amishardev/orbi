
'use client';
import { useState, useEffect, useTransition, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, Search } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useChat } from '@/hooks/use-chat';
import { db } from '@/lib/firebase-client';
import { collection, query, getDocs, limit, startAt, endAt, orderBy } from 'firebase/firestore';
import type { User, Chat } from '@/lib/types';
import { Skeleton } from './ui/skeleton';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface NewChatDialogProps {
}

export function NewChatDialog({ }: NewChatDialogProps) {
  const { authUser } = useAuth();
  const { createOrGetChat, chats } = useChat();
  const router = useRouter();
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isSearching, startSearchTransition] = useTransition();
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const existingChatUserIds = useMemo(() => {
    if (!authUser) return new Set();
    return new Set(chats.flatMap(chat => chat.participants).filter(id => id !== authUser.uid));
  }, [chats, authUser]);


  useEffect(() => {
    const searchUsers = async () => {
      if (!authUser?.uid) return;

      startSearchTransition(async () => {
        try {
          const usersRef = collection(db, 'users');
          let q;

          if (searchQuery.trim() === '') {
            // Fetch newest users as suggestion if no search query
            // Using joinDate ensures we get results even if lastSeen is missing
            q = query(
              usersRef,
              orderBy('joinDate', 'desc'),
              limit(20)
            );
          } else {
            // Search by name
            q = query(
              usersRef,
              orderBy('displayName_lowercase'),
              startAt(searchQuery.toLowerCase()),
              endAt(searchQuery.toLowerCase() + '\uf8ff'),
              limit(20)
            );
          }

          const querySnapshot = await getDocs(q);
          const users = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as User))
            .filter(user => user.id !== authUser.uid);

          setSearchResults(users);
        } catch (error) {
          console.error("Error searching for users:", error);
          setSearchResults([]);
        }
      });
    };

    searchUsers();
  }, [searchQuery, authUser?.uid]);

  const handleUserSelect = async (userId: string) => {
    try {
      const chatId = await createOrGetChat(userId);
      setIsOpen(false);
      setSearchQuery('');
      router.push(`/messages?chatId=${chatId}`);
    } catch (error) {
      console.error("Error creating or getting chat:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="rounded-full">
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>New Message</DialogTitle>
        </DialogHeader>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="mt-4 space-y-2 h-[300px] overflow-y-auto">
          {isSearching ? (
            <div className="space-y-3 p-2">
              <UserSearchResultSkeleton />
              <UserSearchResultSkeleton />
              <UserSearchResultSkeleton />
            </div>
          ) : searchResults.length > 0 ? (
            <>
              {!searchQuery && (
                <p className="text-xs font-medium text-muted-foreground px-2 mb-2">Suggested</p>
              )}
              {searchResults.map(user => (
                <div
                  key={user.id}
                  onClick={() => handleUserSelect(user.id)}
                  className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-secondary transition-colors"
                >
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage
                      src={user.photoURL?.includes('cloudinary') ? user.photoURL.replace('/upload/', '/upload/w_100,h_100,c_fill,q_auto,f_auto/') : user.photoURL}
                      alt={user.displayName}
                    />
                    <AvatarFallback>{user.displayName[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold leading-none">{user.displayName}</p>
                    <p className="text-sm text-muted-foreground">@{user.username}</p>
                  </div>
                </div>
              ))}
            </>
          ) : (
            <div className="text-center text-muted-foreground p-8">
              {searchQuery ? 'No users found.' : 'No suggested users found.'}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function UserSearchResultSkeleton() {
  return (
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-full" />
      <div className="space-y-1">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-24" />
      </div>
    </div>
  )
}
