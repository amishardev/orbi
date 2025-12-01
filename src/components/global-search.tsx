
'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { Search } from 'lucide-react';
import { Input } from './ui/input';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { db } from '@/lib/firebase-client';
import { collection, query, getDocs, orderBy, startAt, endAt, where } from 'firebase/firestore';
import type { User } from '@/lib/types';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from './ui/skeleton';

export function GlobalSearch() {
  const { authUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    if (trimmedQuery === '') {
      setSearchResults([]);
      setIsPopoverOpen(false);
      return;
    }

    startTransition(async () => {
      if (!authUser?.uid || !db) {
        return;
      }
      if (trimmedQuery.length > 0) {
        const usersRef = collection(db, 'users');

        // Query for username
        const usernameQuery = query(
          usersRef,
          orderBy('username_lowercase'),
          startAt(trimmedQuery),
          endAt(trimmedQuery + '\uf8ff')
        );

        // Query for display name
        const displayNameQuery = query(
          usersRef,
          orderBy('displayName_lowercase'),
          startAt(trimmedQuery),
          endAt(trimmedQuery + '\uf8ff')
        );

        const [usernameSnap, displayNameSnap] = await Promise.all([
          getDocs(usernameQuery),
          getDocs(displayNameQuery)
        ]);

        const combinedDocs: { [key: string]: User } = {};

        const processSnap = (snap: any) => {
          snap.docs.forEach((doc: any) => {
            const userData = { id: doc.id, ...doc.data() } as User;
            // Exclude current user and prevent duplicates
            if (userData.id !== authUser?.uid && !combinedDocs[userData.id]) {
              combinedDocs[userData.id] = userData;
            }
          });
        }

        processSnap(usernameSnap);
        processSnap(displayNameSnap);

        const results = Object.values(combinedDocs);

        setSearchResults(results);
        setIsPopoverOpen(results.length > 0);
      }
    });

  }, [searchQuery, authUser]);

  const handleLinkClick = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsPopoverOpen(false);
    inputRef.current?.blur();
  };

  return (
    <Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
      <PopoverTrigger asChild>
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            ref={inputRef}
            placeholder="Search users..."
            className="pl-10 rounded-full bg-secondary"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        {isPending ? (
          <div className="p-4 text-center text-sm text-muted-foreground">Searching...</div>
        ) : searchResults.length > 0 ? (
          <div className="flex flex-col gap-1 p-2">
            {searchResults.map((user) => (
              <Link
                key={user.id}
                href={`/profile/${user.username}`}
                onClick={handleLinkClick}
                className="flex items-center gap-3 p-2 rounded-md hover:bg-accent"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage src={user.photoURL} alt={user.displayName} />
                  <AvatarFallback>{user.name ? user.name[0] : 'U'}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-sm">{user.name}</p>
                  <p className="text-xs text-muted-foreground">@{user.username}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="p-4 text-center text-sm text-muted-foreground">
            No results found.
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
