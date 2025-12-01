import { db } from './firebase-client';
import { doc, getDoc, setDoc, deleteDoc, runTransaction, serverTimestamp } from 'firebase/firestore';

// Reserved usernames that cannot be used
export const RESERVED_USERNAMES = [
  'admin', 'api', 'p', 'assets', 'www', 'support', 'null', 'undefined',
  'root', 'system', 'user', 'users', 'profile', 'profiles', 'account',
  'accounts', 'settings', 'config', 'help', 'about', 'contact', 'terms',
  'privacy', 'legal', 'blog', 'news', 'feed', 'home', 'login', 'signup',
  'register', 'auth', 'oauth', 'callback', 'verify', 'reset', 'forgot',
  'dashboard', 'console', 'panel', 'manage', 'management', 'moderator',
  'mod', 'staff', 'team', 'official', 'orbi', 'orbie', 'app', 'mobile',
  'web', 'site', 'website', 'service', 'services', 'status', 'health',
  'ping', 'test', 'testing', 'dev', 'development', 'staging', 'prod',
  'production', 'beta', 'alpha', 'demo', 'example', 'sample', 'placeholder'
];

export interface UsernameValidationResult {
  isValid: boolean;
  error?: string;
}

export interface UsernameAvailabilityResult {
  isAvailable: boolean;
  error?: string;
  existingUid?: string;
}

/**
 * Validates username format and checks against reserved names
 */
export function validateUsername(username: string): UsernameValidationResult {
  if (!username) {
    return { isValid: false, error: 'Username is required' };
  }

  // Convert to lowercase for validation
  const lowerUsername = username.toLowerCase();

  // Check length (3-30 characters)
  if (lowerUsername.length < 3) {
    return { isValid: false, error: 'Username must be at least 3 characters long' };
  }

  if (lowerUsername.length > 30) {
    return { isValid: false, error: 'Username must be no more than 30 characters long' };
  }

  // Check format: alphanumeric plus dots and underscores
  const usernameRegex = /^[a-z0-9._]+$/;
  if (!usernameRegex.test(lowerUsername)) {
    return { isValid: false, error: 'Username can only contain letters, numbers, dots, and underscores' };
  }

  // Check for consecutive dots or underscores
  if (lowerUsername.includes('..') || lowerUsername.includes('__')) {
    return { isValid: false, error: 'Username cannot contain consecutive dots or underscores' };
  }

  // Check if starts or ends with dot or underscore
  if (lowerUsername.startsWith('.') || lowerUsername.startsWith('_') || 
      lowerUsername.endsWith('.') || lowerUsername.endsWith('_')) {
    return { isValid: false, error: 'Username cannot start or end with dots or underscores' };
  }

  // Check against reserved names
  if (RESERVED_USERNAMES.includes(lowerUsername)) {
    return { isValid: false, error: 'This username is reserved and cannot be used' };
  }

  return { isValid: true };
}

/**
 * Checks if username is available (case-insensitive)
 */
export async function checkUsernameAvailability(username: string): Promise<UsernameAvailabilityResult> {
  try {
    const lowerUsername = username.toLowerCase();
    const usernameDoc = await getDoc(doc(db, 'usernames', lowerUsername));
    
    if (usernameDoc.exists()) {
      return { 
        isAvailable: false, 
        error: 'Username is already taken',
        existingUid: usernameDoc.data().uid 
      };
    }

    return { isAvailable: true };
  } catch (error) {
    console.error('Error checking username availability:', error);
    return { isAvailable: false, error: 'Failed to check username availability' };
  }
}

/**
 * Atomically creates or updates a username mapping
 */
export async function createUsernameMapping(uid: string, newUsername: string, oldUsername?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const validation = validateUsername(newUsername);
    if (!validation.isValid) {
      return { success: false, error: validation.error };
    }

    const lowerNewUsername = newUsername.toLowerCase();
    const lowerOldUsername = oldUsername?.toLowerCase();

    return await runTransaction(db, async (transaction) => {
      // Check if new username is available
      const newUsernameRef = doc(db, 'usernames', lowerNewUsername);
      const newUsernameDoc = await transaction.get(newUsernameRef);
      
      if (newUsernameDoc.exists() && newUsernameDoc.data().uid !== uid) {
        throw new Error('Username is already taken');
      }

      // Update user document with new username
      const userRef = doc(db, 'users', uid);
      const userDoc = await transaction.get(userRef);
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      // Create new username mapping
      transaction.set(newUsernameRef, {
        uid: uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Update user document
      transaction.update(userRef, {
        username: lowerNewUsername,
        username_lowercase: lowerNewUsername,
        updatedAt: serverTimestamp()
      });

      // Clean up old username mapping if it exists and is different
      if (lowerOldUsername && lowerOldUsername !== lowerNewUsername) {
        const oldUsernameRef = doc(db, 'usernames', lowerOldUsername);
        const oldUsernameDoc = await transaction.get(oldUsernameRef);
        
        // Only delete if it belongs to this user
        if (oldUsernameDoc.exists() && oldUsernameDoc.data().uid === uid) {
          transaction.delete(oldUsernameRef);
        }
      }

      return { success: true };
    });
  } catch (error) {
    console.error('Error creating username mapping:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to create username mapping' 
    };
  }
}

/**
 * Resolves a username to a user ID
 */
export async function resolveUsername(username: string): Promise<{ uid?: string; error?: string }> {
  try {
    const lowerUsername = username.toLowerCase();
    const usernameDoc = await getDoc(doc(db, 'usernames', lowerUsername));
    
    if (!usernameDoc.exists()) {
      return { error: 'Username not found' };
    }

    return { uid: usernameDoc.data().uid };
  } catch (error) {
    console.error('Error resolving username:', error);
    return { error: 'Failed to resolve username' };
  }
}

/**
 * Gets username by user ID
 */
export async function getUsernameByUid(uid: string): Promise<{ username?: string; error?: string }> {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    
    if (!userDoc.exists()) {
      return { error: 'User not found' };
    }

    const userData = userDoc.data();
    return { username: userData.username };
  } catch (error) {
    console.error('Error getting username by UID:', error);
    return { error: 'Failed to get username' };
  }
}