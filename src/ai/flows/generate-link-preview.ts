'use server';
/**
 * @fileOverview A flow for generating rich link previews.
 *
 * - generateLinkPreview - A function that takes a URL and returns structured embed data.
 * - GenerateLinkPreviewInput - The input type for the function.
 * - EmbedData - The return type for the function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateLinkPreviewInputSchema = z.object({
  url: z.string().url(),
});
export type GenerateLinkPreviewInput = z.infer<typeof GenerateLinkPreviewInputSchema>;

const EmbedDataSchema = z.object({
  url: z.string().url(),
  type: z.enum(['website', 'youtube', 'image', 'video', 'loading', 'error', 'spotify', 'applemusic', 'instagram']),
  title: z.string().optional(),
  description: z.string().optional(),
  imageUrl: z.string().url().optional(),
  author: z.string().optional(),
  videoId: z.string().optional(),
  embedUrl: z.string().url().optional(),
});
export type EmbedData = z.infer<typeof EmbedDataSchema>;

function classifyUrl(url: string): 'youtube' | 'image' | 'video' | 'website' | 'spotify' | 'applemusic' | 'instagram' {
  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;
    const path = urlObj.pathname;

    if (domain.includes('youtube.com') || domain.includes('youtu.be')) {
      return 'youtube';
    }
    if (domain.includes('spotify.com')) {
      return 'spotify';
    }
    if (domain.includes('music.apple.com')) {
      return 'applemusic';
    }
    if (domain.includes('instagram.com')) {
      return 'instagram';
    }
    if (path.match(/\.(jpg|jpeg|png|gif|webp|svg)$/i)) {
      return 'image';
    }
    if (path.match(/\.(mp4|webm|mov|ogg)$/i)) {
      return 'video';
    }
    return 'website';
  } catch (error) {
    return 'website';
  }
}

async function getYouTubeEmbed(url: string): Promise<EmbedData> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const response = await fetch(oembedUrl);
  if (!response.ok) {
    throw new Error('Failed to fetch YouTube oEmbed data');
  }
  const data = await response.json();
  const videoIdRegex = /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^?&]+)/;
  const match = url.match(videoIdRegex);

  return {
    url,
    type: 'youtube',
    title: data.title,
    author: data.author_name,
    imageUrl: data.thumbnail_url,
    videoId: match ? match[1] : undefined,
  };
}

async function getSpotifyEmbed(url: string): Promise<EmbedData> {
  const oembedUrl = `https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`;
  const response = await fetch(oembedUrl);
  if (!response.ok) {
    throw new Error('Failed to fetch Spotify oEmbed data');
  }
  const data = await response.json();

  // The Spotify oEmbed response gives us an HTML snippet. We need to extract the src.
  const srcRegex = /src="([^"]+)"/;
  const match = data.html.match(srcRegex);
  const embedUrl = match ? match[1] : undefined;

  return {
    url,
    type: 'spotify',
    title: data.title,
    imageUrl: data.thumbnail_url,
    embedUrl: embedUrl,
  };
}

async function getAppleMusicEmbed(url: string): Promise<EmbedData> {
  const urlObj = new URL(url);
  urlObj.hostname = 'embed.music.apple.com';
  const embedUrl = urlObj.toString();

  // Use Genkit to extract metadata as Apple Music doesn't have a public oEmbed API.
  const { output } = await ai.generate({
    prompt: `Extract the title and a artwork image URL from the following Apple Music URL for an embed. URL: ${url}`,
    output: {
      schema: z.object({
        title: z.string().optional().describe('The main title of the song or album.'),
        imageUrl: z.string().url().optional().describe('A direct URL to the artwork image (e.g., og:image).'),
      }),
    },
    model: 'googleai/gemini-1.5-flash',
  });

  return {
    url,
    type: 'applemusic',
    embedUrl,
    ...output,
  };
}

async function getInstagramEmbed(url: string): Promise<EmbedData> {
  const { output } = await ai.generate({
    prompt: `Extract metadata from the following Instagram URL for a link preview. URL: ${url}`,
    output: {
      schema: z.object({
        title: z.string().optional().describe("The post author's username, formatted like 'Post by @username'."),
        description: z.string().optional().describe('A snippet or the full text of the post caption.'),
        imageUrl: z.string().url().optional().describe('A direct URL to the main image or video thumbnail of the post.'),
      }),
    },
    model: 'googleai/gemini-1.5-flash',
  });

  return {
    url,
    type: 'instagram',
    ...output,
  };
}


async function getWebsiteEmbed(url: string): Promise<EmbedData> {
  const { output } = await ai.generate({
    prompt: `Extract the title, description, and a relevant image URL from the following website URL for a link preview. URL: ${url}`,
    output: {
      schema: z.object({
        title: z.string().optional().describe('The main title of the page.'),
        description: z.string().optional().describe('A short, compelling description of the page content.'),
        imageUrl: z.string().url().optional().describe('A direct URL to a relevant preview image (e.g., og:image).'),
      }),
    },
    model: 'googleai/gemini-1.5-flash',
  });

  return {
    url,
    type: 'website',
    ...output,
  };
}

export async function generateLinkPreview(input: GenerateLinkPreviewInput): Promise<EmbedData> {
  return generateLinkPreviewFlow(input);
}

const generateLinkPreviewFlow = ai.defineFlow(
  {
    name: 'generateLinkPreviewFlow',
    inputSchema: GenerateLinkPreviewInputSchema,
    outputSchema: EmbedDataSchema,
  },
  async ({ url }) => {
    const type = classifyUrl(url);

    try {
      switch (type) {
        case 'youtube':
          return await getYouTubeEmbed(url);
        case 'spotify':
          return await getSpotifyEmbed(url);
        case 'applemusic':
          return await getAppleMusicEmbed(url);
        case 'instagram':
          return await getInstagramEmbed(url);
        case 'image':
          return { url, type: 'image', title: 'Image' } as EmbedData;
        case 'video':
          return { url, type: 'video', title: 'Video' } as EmbedData;
        case 'website':
          return await getWebsiteEmbed(url);
        default:
          throw new Error('Unsupported URL type');
      }
    } catch (error) {
      console.error(`Failed to generate embed for ${url}:`, error);
      return {
        url,
        type: 'error',
        title: 'Unable to generate preview',
        description: 'The content could not be loaded.',
      } as EmbedData;
    }
  }
);
