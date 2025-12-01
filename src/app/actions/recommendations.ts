
'use server';

import { recommendUsers } from '@/ai/flows/recommend-users-flow';
import { adminDb } from '@/lib/firebase-server';
import { FieldValue } from 'firebase-admin/firestore';

/**
 * Generates and stores recommendations for all users.
 * This is designed to be run as a scheduled job.
 */
export async function generateRecommendationsForAllUsers() {
  try {
    const usersSnapshot = await adminDb.collection('users').get();
    const userIds = usersSnapshot.docs.map((doc) => doc.id);

    console.log(`Generating recommendations for ${userIds.length} users.`);

    for (const uid of userIds) {
      try {
        const recommendations = await recommendUsers({ uid });

        if (recommendations.length > 0) {
          const recommendationsData = {
            updatedAt: FieldValue.serverTimestamp(),
            items: recommendations,
          };
          await adminDb
            .collection('recommendations')
            .doc(uid)
            .set(recommendationsData, { merge: true });
            
          console.log(`Successfully stored ${recommendations.length} recommendations for user ${uid}.`);
        } else {
          console.log(`No new recommendations generated for user ${uid}.`);
        }
      } catch (error) {
        console.error(`Failed to generate recommendations for user ${uid}:`, error);
      }
    }
    
    return { success: true, message: `Processed ${userIds.length} users.` };

  } catch (error) {
    console.error('An error occurred during the recommendation generation batch job:', error);
    return { success: false, error: 'Batch job failed.' };
  }
}
