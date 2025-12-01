'use client';

import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Loader2, UserPlus, X } from 'lucide-react';
import { useDebounce } from '@/hooks/use-debounce';

interface User {
  uid: string;
  username: string;
  displayName: string;
  photoURL?: string;
}

interface UserSearchBoxProps {
  onSelect: (user: User) => void;
  onRemove: (uid: string) => void;
  selectedUsers: User[];
  excludeIds?: string[];
  placeholder?: string;
}

export function UserSearchBox({
  onSelect,
  onRemove,
  selectedUsers,
  excludeIds = [],
  placeholder = 'Search users...'
}: UserSearchBoxProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 300);

  const searchUsers = httpsCallable<
    { q: string; limit: number },
    { users: User[] }
  >(getFunctions(), 'searchUsersForAdd');

  useEffect(() => {
    async function performSearch() {
      if (!debouncedSearch) {
        setResults([]);
        return;
      }

      setLoading(true);
      try {
        const result = await searchUsers({
          q: debouncedSearch,
          limit: 10
        });

        // Filter out already selected users and excluded IDs
        const filteredUsers = result.data.users.filter(
          user => 
            !selectedUsers.some(selected => selected.uid === user.uid) &&
            !excludeIds.includes(user.uid)
        );

        setResults(filteredUsers);
      } catch (error) {
        console.error('Error searching users:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }

    performSearch();
  }, [debouncedSearch, selectedUsers, excludeIds]);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder={placeholder}
          className="w-full"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Search Results */}
      {searchTerm && (
        <ScrollArea className="h-[200px] rounded-md border">
          <div className="p-4 space-y-2">
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                {loading ? 'Searching...' : 'No users found'}
              </p>
            ) : (
              results.map((user) => (
                <div
                  key={user.uid}
                  className="flex items-center justify-between p-2 rounded-lg hover:bg-accent"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.photoURL} />
                      <AvatarFallback>
                        {user.displayName?.[0] || user.username[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium text-sm">
                        {user.displayName || user.username}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        @{user.username}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onSelect(user)}
                  >
                    <UserPlus className="h-4 w-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      )}

      {/* Selected Users */}
      {selectedUsers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selectedUsers.map(user => (
            <Badge
              key={user.uid}
              variant="secondary"
              className="flex items-center gap-1 pl-2"
            >
              <Avatar className="h-4 w-4">
                <AvatarImage src={user.photoURL} />
                <AvatarFallback>
                  {user.displayName?.[0] || user.username[0]}
                </AvatarFallback>
              </Avatar>
              <span className="text-xs">{user.displayName || user.username}</span>
              <button
                onClick={() => onRemove(user.uid)}
                className="ml-1 hover:text-destructive rounded-full p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}