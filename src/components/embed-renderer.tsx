'use client';
import type { EmbedData } from '@/lib/types';
import Image from 'next/image';

const YouTubeEmbed = ({ embed }: { embed: EmbedData }) => {
  if (!embed.videoId) return <WebsiteEmbed embed={embed} />;
  const embedUrl = `https://www.youtube.com/embed/${embed.videoId}`;
  return (
    <div className="rounded-lg overflow-hidden border">
      <div className="aspect-video">
        <iframe
          width="100%"
          height="100%"
          src={embedUrl}
          title={embed.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      <div className="p-3 bg-secondary/30">
        <p className="font-semibold text-sm truncate">{embed.title}</p>
        <p className="text-xs text-muted-foreground">{embed.author}</p>
      </div>
    </div>
  );
};

const SpotifyEmbed = ({ embed }: { embed: EmbedData }) => {
  if (!embed.embedUrl) return <WebsiteEmbed embed={embed} />;
  return (
    <div className="rounded-lg overflow-hidden">
      <iframe
        src={embed.embedUrl}
        width="100%"
        height="152"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        loading="lazy"
        className="border-0"
      ></iframe>
    </div>
  );
};

const AppleMusicEmbed = ({ embed }: { embed: EmbedData }) => {
  if (!embed.embedUrl) return <WebsiteEmbed embed={embed} />;
  return (
    <div className="rounded-lg overflow-hidden">
      <iframe
        allow="autoplay *; encrypted-media *; fullscreen *"
        height="150"
        className="w-full"
        sandbox="allow-forms allow-popups allow-same-origin allow-scripts allow-storage-access-by-user-activation allow-top-navigation-by-user-activation"
        src={embed.embedUrl}
      ></iframe>
    </div>
  );
};

const ImageEmbed = ({ embed }: { embed: EmbedData }) => {
  return (
    <div className="rounded-lg overflow-hidden border relative">
      <Image
        src={embed.url}
        alt={embed.title || 'Embedded image'}
        width={500}
        height={300}
        className="w-full h-auto object-contain"
      />
    </div>
  );
};

const VideoEmbed = ({ embed }: { embed: EmbedData }) => {
  return (
    <div className="rounded-lg overflow-hidden border">
      <video controls className="w-full bg-black">
        <source src={embed.url} />
        Your browser does not support the video tag.
      </video>
    </div>
  );
};

const WebsiteEmbed = ({ embed }: { embed: EmbedData }) => {
  return (
    <a
      href={embed.url}
      target="_blank"
      rel="noopener noreferrer"
      className="block rounded-lg border bg-card hover:bg-secondary/50 transition-colors"
    >
      <div className="flex">
        {embed.imageUrl && (
          <div className="flex-shrink-0 w-32 h-full relative">
            <Image
              src={embed.imageUrl}
              alt={embed.title || 'Website preview'}
              fill
              className="object-cover rounded-l-lg"
            />
          </div>
        )}
        <div className="p-4 flex-1 overflow-hidden">
          <p className="font-semibold text-sm truncate">{embed.title || new URL(embed.url).hostname}</p>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{embed.description}</p>
          <p className="text-xs text-muted-foreground mt-2 uppercase">{new URL(embed.url).hostname}</p>
        </div>
      </div>
    </a>
  );
};

export default function EmbedRenderer({ embed }: { embed: EmbedData }) {
  if (!embed) return null;

  switch (embed.type) {
    case 'youtube':
      return <YouTubeEmbed embed={embed} />;
    case 'spotify':
      return <SpotifyEmbed embed={embed} />;
    case 'applemusic':
      return <AppleMusicEmbed embed={embed} />;
    case 'image':
      return <ImageEmbed embed={embed} />;
    case 'video':
      return <VideoEmbed embed={embed} />;
    case 'instagram':
    case 'website':
    case 'error':
      return <WebsiteEmbed embed={embed} />;
    default:
      return null;
  }
}
