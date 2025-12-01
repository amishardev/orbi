# Orbi Vanity URL System Implementation

## Overview

This document describes the comprehensive vanity URL system implemented for Orbi, providing stable public profile links at `orbie.com/p/<username>` with atomic username management and case-insensitive uniqueness enforcement.

## Architecture

### Dual Firestore Collections

#### 1. `/users/{uid}` Collection
Stores complete user profile data:
```typescript
{
  id: string;                    // User UID
  name: string;                  // Display name
  username: string;              // Canonical lowercase username
  username_lowercase: string;    // Redundant field for compatibility
  displayName_lowercase: string; // Lowercase display name for search
  avatar: string;                // Profile picture URL
  email?: string;                // User email
  bio?: string;                  // User biography
  headline?: string;             // Professional headline
  followers: string[];           // Array of follower UIDs
  following: string[];           // Array of following UIDs
  work: WorkExperience[];        // Work history
  education: Education[];        // Education history
  interests: string[];           // User interests
  skills: string[];              // User skills
  coverPhoto?: string;           // Banner image URL
  createdAt: Timestamp;          // Account creation time
  updatedAt: Timestamp;          // Last update time
}
```

#### 2. `/usernames/{username}` Collection
Maps usernames to user IDs for O(1) lookups:
```typescript
{
  uid: string;           // User UID this username belongs to
  createdAt: Timestamp;  // When username was claimed
  updatedAt: Timestamp;  // Last update time
}
```

### Username Validation Rules

#### Format Requirements
- **Length**: 3-30 characters
- **Characters**: Alphanumeric plus dots (.) and underscores (_)
- **Case**: Case-insensitive (stored as lowercase)
- **Restrictions**:
  - No consecutive dots or underscores
  - Cannot start or end with dots or underscores
  - Cannot be reserved names

#### Reserved Usernames
The system protects these reserved usernames:
```
admin, api, p, assets, www, support, null, undefined, root, system, 
user, users, profile, profiles, account, accounts, settings, config, 
help, about, contact, terms, privacy, legal, blog, news, feed, home, 
login, signup, register, auth, oauth, callback, verify, reset, forgot, 
dashboard, console, panel, manage, management, moderator, mod, staff, 
team, official, orbi, orbie, app, mobile, web, site, website, service, 
services, status, health, ping, test, testing, dev, development, 
staging, prod, production, beta, alpha, demo, example, sample, placeholder
```

## Implementation Components

### 1. Username Utilities (`src/lib/username.ts`)

#### Core Functions
- `validateUsername(username: string)`: Format and reserved name validation
- `checkUsernameAvailability(username: string)`: Case-insensitive availability check
- `createUsernameMapping(uid, newUsername, oldUsername?)`: Atomic username creation/update
- `resolveUsername(username: string)`: Username to UID resolution
- `getUsernameByUid(uid: string)`: UID to username lookup

#### Atomic Operations
All username operations use Firestore transactions to prevent race conditions:
```typescript
await runTransaction(db, async (transaction) => {
  // 1. Check new username availability
  // 2. Update user document
  // 3. Create new username mapping
  // 4. Clean up old username mapping
});
```

### 2. Vanity URL Routes

#### Client-Side Route (`src/app/p/[username]/page.tsx`)
Handles `/p/<username>` routes with:
- Username resolution via Firestore lookup
- Automatic redirect to `/profile/<username>`
- Loading states and error handling
- 404 handling for non-existent usernames

#### Server-Side Resolution (Cloud Functions)
The `resolveUsername` HTTP function provides:
- Server-side username resolution
- 302 redirects to profile pages
- Custom 404 pages with suggestions
- Caching headers for performance

### 3. Cloud Functions (`functions/src/index.ts`)

#### `createUsername` (Callable)
Atomic username creation/update with:
- Authentication verification
- Format validation
- Reserved name checking
- Case-insensitive collision prevention
- Automatic cleanup of old mappings

#### `resolveUsername` (HTTP)
Vanity URL resolution with:
- Path parsing for `/p/<username>` routes
- Username validation and lookup
- 302 redirects to profile pages
- Custom 404 pages with user-friendly messages
- CORS support and caching headers

#### `checkUsernameAvailability` (Callable)
Real-time availability checking for:
- Username format validation
- Case-insensitive collision detection
- Reserved name checking
- Instant feedback for user interfaces

### 4. Firestore Security Rules (`firestore.rules`)

#### Username Protection
- **Public reads**: Anyone can resolve usernames
- **Authenticated creates**: Only for own UID
- **No updates**: Usernames can only be deleted and recreated
- **Validation**: Server-side format and reserved name checking
- **Ownership**: Users can only delete their own mappings

#### User Profile Security
- **Public reads**: Profiles are publicly viewable
- **Authenticated writes**: Users can only modify their own profiles
- **Data validation**: Ensures required fields and proper structure

### 5. Firebase Hosting Configuration (`firebase.json`)

#### URL Rewrites
```json
{
  "rewrites": [
    {
      "source": "/p/**",
      "function": "resolveUsername"
    },
    {
      "source": "**",
      "destination": "/index.html"
    }
  ]
}
```

#### Caching Strategy
- **Vanity URLs**: 5-minute browser cache, 10-minute CDN cache
- **Profile pages**: Standard SPA caching
- **Function responses**: Optimized for performance

## User Experience Features

### 1. Profile Navigation
- Updated navigation to use valid usernames
- Fallback to existing usernames when user data unavailable
- Seamless integration with existing profile system

### 2. LinkedIn-Style Profiles
- Professional banner and profile pictures
- Follower/following counts with real-time updates
- Work experience, education, skills, and interests
- Real-time post loading and interactions
- Follow/unfollow functionality with atomic updates

### 3. Error Handling
- Graceful 404 pages with search suggestions
- Loading states during username resolution
- Toast notifications for follow/unfollow actions
- Comprehensive error messages for validation failures

## SEO and Social Sharing

### Open Graph Meta Tags
Profile pages include optimized meta tags for social sharing:
- Dynamic titles with user names
- Profile pictures as og:image
- User bios as descriptions
- Canonical URLs for SEO

### URL Structure
- **Vanity URLs**: `orbie.com/p/<username>`
- **Profile URLs**: `orbie.com/profile/<username>`
- **Canonical**: Both resolve to the same profile content

## Performance Optimizations

### 1. Database Indexing
Optimized Firestore indexes for:
- Username lookups by UID
- User posts by userId and createdAt
- Efficient follower/following queries

### 2. Caching Strategy
- **Client-side**: React state management and real-time listeners
- **Server-side**: Cloud Function response caching
- **CDN**: Firebase Hosting edge caching

### 3. Real-time Updates
- Firestore listeners for live profile updates
- Atomic transactions for consistency
- Optimistic UI updates for better UX

## Security Considerations

### 1. Username Hijacking Prevention
- Atomic transactions prevent race conditions
- Case-insensitive uniqueness enforcement
- Reserved name protection
- Ownership validation in security rules

### 2. Data Validation
- Client-side and server-side validation
- Firestore security rules enforcement
- Input sanitization and format checking

### 3. Rate Limiting
- Cloud Functions have built-in rate limiting
- Firestore security rules prevent abuse
- Client-side debouncing for availability checks

## Testing Checklist

### Atomic Operations
- [x] Username creation with collision detection
- [x] Case-insensitive uniqueness (Amish == amish)
- [x] Reserved name protection
- [x] Old username cleanup during updates
- [x] Transaction rollback on failures

### URL Resolution
- [x] `/p/<username>` redirects to `/profile/<username>`
- [x] Case-insensitive username resolution
- [x] 404 handling for non-existent usernames
- [x] Loading states during resolution

### Social Features
- [x] Follow/unfollow with real-time updates
- [x] Follower/following count accuracy
- [x] Profile data real-time synchronization
- [x] Post loading and interactions

### Security
- [x] Authentication required for username creation
- [x] Users can only modify their own usernames
- [x] Reserved names cannot be claimed
- [x] Case-insensitive collision prevention

## Deployment Instructions

### 1. Firestore Setup
```bash
# Deploy security rules
firebase deploy --only firestore:rules

# Deploy indexes
firebase deploy --only firestore:indexes
```

### 2. Cloud Functions
```bash
# Install dependencies
cd functions
npm install

# Deploy functions
firebase deploy --only functions
```

### 3. Hosting Configuration
```bash
# Deploy hosting rules and rewrites
firebase deploy --only hosting
```

### 4. Environment Variables
Ensure these environment variables are set:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

## Future Enhancements

### 1. Custom Domains
- Support for custom domain vanity URLs
- DNS configuration for subdomains
- SSL certificate management

### 2. Analytics
- Username resolution tracking
- Popular profile analytics
- Social sharing metrics

### 3. Advanced Features
- Username history and transfers
- Premium username reservations
- Bulk username operations for admins

## Troubleshooting

### Common Issues

#### 1. Username Not Resolving
- Check Firestore `/usernames/{username}` document exists
- Verify Cloud Function deployment
- Check Firebase Hosting rewrites configuration

#### 2. Case Sensitivity Issues
- Ensure all usernames stored as lowercase
- Verify client-side normalization
- Check security rules validation

#### 3. Transaction Failures
- Monitor Cloud Function logs
- Check Firestore quotas and limits
- Verify network connectivity

#### 4. 404 Errors
- Verify username exists in database
- Check URL format and encoding
- Ensure proper routing configuration

This comprehensive vanity URL system provides a robust, scalable solution for stable public profile links with enterprise-grade security and performance optimizations.