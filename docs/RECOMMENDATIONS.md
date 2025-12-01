# Recommendation System

## Overview
The Orbi recommendation system provides personalized user suggestions based on shared interests, mutual connections, and activity levels. It uses a hybrid approach with server-side pre-computation and client-side fallback for small user bases or development environments.

## Architecture

### Server-Side Generation
- Daily scheduled Cloud Function generates recommendations for all active users
- Scores based on:
  - Shared interests (+2 points per match)
  - Relationship status match (+3 points)
  - Mutual connections (+5 points per mutual)
  - Recent activity (+4 points if active in last 7 days)
  - Small userbase boost (+1 point when total users ≤ 20)
- Results stored in `recommendations/{userId}` collection

### Client-Side Component
- Real-time updates via Firestore subscription
- Fallback computation for development/small userbase
- Efficient UI with loading states and empty states
- Follow/unfollow integration

## Deployment Steps

1. Deploy Cloud Function:
```bash
cd functions
npm install
npm run build
firebase deploy --only functions:scheduledGenerateRecommendations
```

2. Set up Service Account:
- Ensure the Firebase service account has necessary permissions
- Required roles:
  - `datastore.user`
  - `cloudscheduler.jobRunner`

3. Create Firestore Indexes:
```bash
firebase deploy --only firestore:indexes
```

Required indexes:
- Collection: users
  - Fields:
    1. isBanned (ASCENDING)
    2. lastActive (DESCENDING)

## Configuration

Key parameters in `functions/src/generateRecommendations.ts`:
```typescript
const CONFIG = {
  TOP_N: 20,                    // Recommendations per user
  CANDIDATE_LIMIT: 200,         // Max users to process
  ACTIVE_WINDOW_DAYS: 7,       // Recent activity window
  BATCH_SIZE: 500,             // Firestore batch size
  WEIGHTS: {
    SHARED_INTEREST: 2,
    RELATIONSHIP_STATUS: 3,
    MUTUAL_CONNECTION: 5,
    RECENT_ACTIVITY: 4,
    SMALL_USER_BOOST: 1,
  }
};
```

## Development

### Local Testing
1. Run function locally:
```bash
firebase emulators:start --only functions
```

2. Trigger function manually:
```bash
firebase functions:shell
await scheduledGenerateRecommendations()
```

### Monitoring
- Check function logs: `firebase functions:log`
- Monitor Firestore quotas in Firebase Console
- Watch for high-frequency writes in large user bases

### Cost Considerations
- Daily computation scales with user count
- Consider adjusting schedule for larger user bases
- Use `CANDIDATE_LIMIT` to control processing time
- Monitor Firestore read/write operations

## Security

### Firestore Rules
- Recommendations are read-only for the target user
- Only Cloud Functions can write recommendations
- User document validation prevents abuse

### Best Practices
- Keep scoring algorithm in sync between server/client
- Handle missing data gracefully
- Respect user privacy settings
- Monitor for gaming attempts

## Future Improvements
- Add collaborative filtering
- Implement content-based recommendations
- Add user embeddings for similarity
- Cache frequently accessed recommendations
- Add A/B testing framework