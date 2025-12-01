'use server';

/**
 * @fileOverview A community suggestion AI agent.
 *
 * - suggestRelevantCommunities - A function that suggests communities to a user.
 * - SuggestRelevantCommunitiesInput - The input type for the suggestRelevantCommunities function.
 * - SuggestRelevantCommunitiesOutput - The return type for the suggestRelevantCommunities function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SuggestRelevantCommunitiesInputSchema = z.object({
  profileData: z
    .string()
    .describe('The user profile data including information like interests, skills, education, and work experience.'),
  activityHistory: z
    .string()
    .describe('The user activity history including communities joined, posts, comments, and interactions.'),
  existingCommunities: z
    .string()
    .describe('A list of the user\'s existing communities and a short description of each one.'),
});
export type SuggestRelevantCommunitiesInput = z.infer<
  typeof SuggestRelevantCommunitiesInputSchema
>;

const SuggestRelevantCommunitiesOutputSchema = z.object({
  suggestedCommunities: z
    .array(z.string())
    .describe('A list of suggested community names based on the user profile and activity.'),
});
export type SuggestRelevantCommunitiesOutput = z.infer<
  typeof SuggestRelevantCommunitiesOutputSchema
>;

export async function suggestRelevantCommunities(
  input: SuggestRelevantCommunitiesInput
): Promise<SuggestRelevantCommunitiesOutput> {
  return suggestRelevantCommunitiesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestRelevantCommunitiesPrompt',
  input: {schema: SuggestRelevantCommunitiesInputSchema},
  output: {schema: SuggestRelevantCommunitiesOutputSchema},
  prompt: `You are an AI assistant specializing in community recommendations.

  Based on the user's profile data, activity history, and existing communities, suggest communities that the user might be interested in joining. Provide a list of community names.

  Profile Data: {{{profileData}}}
  Activity History: {{{activityHistory}}}
  Existing Communities: {{{existingCommunities}}}

  Suggested Communities:`,
});

const suggestRelevantCommunitiesFlow = ai.defineFlow(
  {
    name: 'suggestRelevantCommunitiesFlow',
    inputSchema: SuggestRelevantCommunitiesInputSchema,
    outputSchema: SuggestRelevantCommunitiesOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
