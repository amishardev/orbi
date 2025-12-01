# Firebase Deployment Instructions

## Prerequisites
1. Firebase CLI installed: `npm install -g firebase-tools`
2. Firebase project created at https://console.firebase.google.com

## Setup Steps

### 1. Configure Firebase Project
```bash
# Login to Firebase (interactive)
firebase login

# Initialize Firebase project (if not done)
firebase init

# Or set your project ID directly
firebase use your-actual-project-id
```

### 2. Update .firebaserc
Replace `your-project-id` in `.firebaserc` with your actual Firebase project ID.

### 3. Deploy Cloud Functions
```bash
# Deploy functions
firebase deploy --only functions

# Or deploy everything
firebase deploy
```

### 4. Deploy Firestore Rules
```bash
firebase deploy --only firestore:rules
```

## Current Issue
The "Firebase internal error" when clicking follow button occurs because:
- Cloud Functions (`toggleFollow`, `getFollowersForUI`, `initializeUserCounts`) are not deployed yet
- The client is trying to call functions that don't exist on Firebase

## Quick Fix
1. Set your actual Firebase project ID in `.firebaserc`
2. Run `firebase deploy --only functions`
3. Test the follow functionality

## Testing After Deployment
1. Click follow/unfollow buttons on user profiles
2. Check that follower counts update in real-time
3. Test the followers modal
4. Run `initializeUserCounts` function to backfill existing user counts

## Troubleshooting
- If functions fail to deploy, check `functions/package.json` dependencies
- Ensure Firebase project has Functions enabled
- Check Firebase console for function logs if errors persist
