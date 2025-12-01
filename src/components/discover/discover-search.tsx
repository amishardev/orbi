
'use client';

import { useState, useEffect, useTransition } from 'react';
import { db } from '@/lib/firebase-client';
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import type { User } from '@/lib/types';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { UserCard } from '@/components/discover/user-card';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '../ui/card';

function UserCardSkeleton() {
    return (
        <div className="flex items-center gap-4 p-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2 flex-1">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
            </div>
            <Skeleton className="h-10 w-24 rounded-full" />
        </div>
    );
}

export function DiscoverSearch() {
  const { authUser, userData } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSearching, startSearchTransition] = useTransition();

  // Fetch all users once
  useEffect(() => {
    async function fetchAllUsers() {
      if (!db || !authUser?.uid) return;
      setLoading(true);
      try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('userId', '!=', authUser.uid));
        const querySnapshot = await getDocs(q);
        const users = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User));
        setAllUsers(users);
        setFilteredUsers(users);
      } catch (error) {
        console.error("Error fetching users: ", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAllUsers();
  }, [authUser?.uid]);

  // Filter users based on search query
  useEffect(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();
    
    startSearchTransition(() => {
        if (trimmedQuery === '') {
            setFilteredUsers(allUsers);
        } else {
            const results = allUsers.filter(user => 
                (user.searchKeywords || []).some(keyword => keyword.startsWith(trimmedQuery))
            );
            setFilteredUsers(results);
        }
    });

  }, [searchQuery, allUsers]);

  return (
    <div>
      <div className="relative mb-8">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search by name or username..."
          className="pl-10 h-12"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {loading || isSearching ? (
          <>
            <UserCardSkeleton />
            <UserCardSkeleton />
            <UserCardSkeleton />
            <UserCardSkeleton />
          </>
        ) : filteredUsers.length > 0 ? (
          filteredUsers.map(user => (
            <UserCard 
                key={user.id} 
                user={user} 
                currentUserData={userData}
            />
          ))
        ) : (
          <Card className="text-center p-8">
            <h3 className="text-xl font-semibold">No users found</h3>
            <p className="text-muted-foreground mt-2">
              Try adjusting your search.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
