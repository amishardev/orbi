import { z } from 'zod';

export const signupSchema = z.object({
    // Step 1: Identity
    firstName: z.string().min(1, { message: 'First name is required' }),
    lastName: z.string().min(1, { message: 'Last name is required' }),
    username: z.string().min(3, { message: 'Username must be at least 3 characters' })
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'),

    // Step 2: Credentials
    email: z.string().email({ message: 'Invalid email address' }),
    password: z.string().min(6, { message: 'Password must be at least 6 characters' }),

    // Step 3: Personal
    gender: z.string().optional(),
    relationshipStatus: z.string().optional(),

    // Step 4: Interests
    interests: z.string().optional(), // Stored as comma-separated string for now to match existing backend

    // Step 5: Branding (Files handled separately in state, but URLs stored here)
    profilePictureUrl: z.string().optional(),
    coverPhotoUrl: z.string().optional(),
});

export type SignupInputs = z.infer<typeof signupSchema>;
