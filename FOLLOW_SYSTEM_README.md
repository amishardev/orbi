# Follow System Implementation

This document describes the production-safe follow system implemented for Orbi using Cloud Functions and atomic transactions.

## Architecture Overview

The follow system uses server-side Cloud Functions to ensure data consistency and prevent count spoofing. All follow/unfollow operations are handled atomically through Firestore transactions.

### Key Components

1. **Cloud Functions** (`functions/src/index.ts`)
   - `toggleFollow` - Handles follow/unfollow operations
   - `initializeUserCounts` - Backfills follower/following counts
   - `getFollowersForUI` - Provides paginated followers list

2. **Firestore Rules** (`firestore.rules`)
   - Server-only writes for followers/following subcollections
   - Client read access for UI updates

3. **React Components**
   - `useFollow` hook - Client-side follow operations
   - `FollowButton` - Follow/unfollow button with real-time updates
   - `FollowersModal` - Paginated followers list modal

## Deployment Steps

### 1. Deploy Firestore Rules

```bash
firebase deploy --only firestore:rules
```

### 2. Build and Deploy Cloud Functions

```bash
cd functions
npm run build
cd ..
firebase deploy --only functions
```

### 3. Initialize User Counts (One-time setup)

After deployment, run the initialization function to backfill existing user counts:

```javascript
// In browser console or Node.js script
import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();
const initCounts = httpsCallable(functions, 'initializeUserCounts');

// Initialize all users (force=false will skip users with existing counts)
const result = await initCounts({ force: false });
console.log(result.data);

// To force update all users (use with caution)
// const result = await initCounts({ force: true });
```

## Usage Examples

### Basic Follow Button

```tsx
import { FollowButton } from '@/components/follow-button';

function UserProfile({ userId, username }) {
  return (
    <div>
      <FollowButton 
        targetUserId={userId} 
        targetUsername={username}
        variant="default"
        size="default"
      />
    </div>
  );
}
```

### Followers Count Display

```tsx
import { FollowersCount, FollowingCount } from '@/components/follow-button';

function ProfileStats({ userId }) {
  return (
    <div className="flex gap-4">
      <FollowersCount userId={userId} />
      <FollowingCount userId={userId} />
    </div>
  );
}
```

### Followers Modal

```tsx
import { FollowersModal } from '@/components/followers-modal';
import { useState } from 'react';

function ProfilePage({ userId, username }) {
  const [showFollowers, setShowFollowers] = useState(false);

  return (
    <div>
      <button onClick={() => setShowFollowers(true)}>
        View Followers
      </button>
      
      <FollowersModal
        userId={userId}
        username={username}
        open={showFollowers}
        onOpenChange={setShowFollowers}
      />
    </div>
  );
}
```

### Manual Follow Operations

```tsx
import { useFollow } from '@/hooks/use-follow';

function CustomFollowComponent() {
  const { toggleFollow, isLoading } = useFollow();

  const handleFollow = async (targetUserId: string) => {
    const result = await toggleFollow(targetUserId);
    if (result) {
      console.log(`Action: ${result.action}`);
      console.log(`New followers count: ${result.followersCount}`);
    }
  };

  return (
    <button 
      onClick={() => handleFollow('target-user-id')}
      disabled={isLoading}
    >
      {isLoading ? 'Loading...' : 'Toggle Follow'}
    </button>
  );
}
```

## Testing Checklist

### 1. Deploy and Initialize

- [ ] Deploy Firestore rules: `firebase deploy --only firestore:rules`
- [ ] Deploy Cloud Functions: `firebase deploy --only functions`
- [ ] Run `initializeUserCounts` function
- [ ] Verify no errors in Firebase Console logs

### 2. Two-User Testing

Set up two browser sessions with different users (User A and User B):

#### Follow Flow Test
- [ ] User A clicks follow on User B's profile
- [ ] Verify `/users/B/followers/A` document is created
- [ ] Verify `/users/A/following/B` document is created
- [ ] Verify User B's `followersCount` incremented
- [ ] Verify User A's `followingCount` incremented
- [ ] Verify follow button shows "Following" state
- [ ] Verify real-time updates in both browsers

#### Unfollow Flow Test
- [ ] User A clicks unfollow (same button)
- [ ] Verify `/users/B/followers/A` document is deleted
- [ ] Verify `/users/A/following/B` document is deleted
- [ ] Verify User B's `followersCount` decremented
- [ ] Verify User A's `followingCount` decremented
- [ ] Verify follow button shows "Follow" state
- [ ] Verify real-time updates in both browsers

### 3. Edge Cases Testing

- [ ] Test rapid clicking (rate limiting should prevent spam)
- [ ] Test following yourself (should be rejected)
- [ ] Test following non-existent user (should fail gracefully)
- [ ] Test with unauthenticated user (should require login)
- [ ] Test followers modal pagination
- [ ] Test with users who have 0 followers/following

### 4. Performance Testing

- [ ] Test with users having many followers (100+)
- [ ] Verify pagination works correctly
- [ ] Check Cloud Function execution time in Firebase Console
- [ ] Monitor Firestore read/write usage

## Security Features

### Rate Limiting
- 500ms minimum between follow actions per user
- Prevents spam and abuse

### Authentication
- All functions require authenticated users
- Self-follow prevention
- User existence validation

### Data Integrity
- Atomic transactions ensure consistency
- Server-only writes prevent count spoofing
- Proper error handling and rollback

### Firestore Rules
```javascript
// Server-only writes for follow lists
match /followers/{followerId} {
  allow read: if true;
  allow write: if false; // Only Cloud Functions can write
}
match /following/{followingId} {
  allow read: if true;
  allow write: if false; // Only Cloud Functions can write
}
```

## Monitoring and Maintenance

### Cloud Function Logs
Monitor function execution in Firebase Console:
- Functions > Logs
- Look for errors in `toggleFollow`, `initializeUserCounts`, `getFollowersForUI`

### Common Issues

1. **"Permission denied" errors**
   - Check Firestore rules are deployed
   - Verify user authentication

2. **Count mismatches**
   - Run `initializeUserCounts` with `force: true`
   - Check for failed transactions in logs

3. **Rate limiting errors**
   - Normal behavior for rapid clicking
   - Users should wait 500ms between actions

### Performance Optimization

- Followers/following subcollections are indexed by `followedAt`
- Pagination uses cursor-based approach for efficiency
- Batch operations in `initializeUserCounts` (500 per batch)

## Future Enhancements

1. **Offline Support**
   - Implement optimistic updates with conflict resolution
   - Queue follow actions when offline

2. **Advanced Features**
   - Follow requests for private accounts
   - Mutual follow detection
   - Follow recommendations

3. **Analytics**
   - Track follow/unfollow patterns
   - Popular users metrics
   - Engagement analytics

## Troubleshooting

### Function Not Found
```bash
# Redeploy functions
cd functions && npm run build && cd .. && firebase deploy --only functions
```

### Permission Errors
```bash
# Redeploy rules
firebase deploy --only firestore:rules
```

### Count Inconsistencies
```javascript
// Force recalculate all counts
const initCounts = httpsCallable(functions, 'initializeUserCounts');
await initCounts({ force: true });
```

## API Reference

### toggleFollow Function
```typescript
Input: { targetUid: string }
Output: { 
  action: 'follow' | 'unfollow',
  followersCount: number,
  followingCount: number 
}
```

### getFollowersForUI Function
```typescript
Input: { 
  userId: string, 
  pageSize?: number, 
  cursor?: string 
}
Output: { 
  items: FollowerItem[], 
  nextCursor?: string 
}
```

### initializeUserCounts Function
```typescript
Input: { force?: boolean }
Output: { 
  success: boolean,
  usersProcessed: number,
  usersUpdated: number 
}
```
