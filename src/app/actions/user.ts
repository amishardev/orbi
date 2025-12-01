
'use server';

// This file is no longer needed as the follow/unfollow logic
// has been moved to a callable Cloud Function in src/functions/index.ts
// for better atomicity and to resolve permission issues.
// This file can be deleted.

export async function followUserAction(followerId: string, targetUserId: string) {
    console.warn("followUserAction is deprecated. Use the 'toggleFollow' callable function instead.");
    return { error: 'This function is deprecated.' };
}


export async function unfollowUserAction(followerId: string, targetUserId: string) {
    console.warn("unfollowUserAction is deprecated. Use the 'toggleFollow' callable function instead.");
    return { error: 'This function is deprecated.' };
}
