
import { useState, useEffect, useRef } from 'react';
import { searchGifs } from '@/lib/tenor';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import Image from 'next/image';
import { useDebounce } from '@/hooks/use-debounce';
import { Skeleton } from './ui/skeleton';

interface GifPickerProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSelect: (url: string) => void;
}

export function GifPicker({ open, onOpenChange, onSelect }: GifPickerProps) {
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounce(query, 300);
  const [gifs, setGifs] = useState<any[]>([]);
  const [nextPos, setNextPos] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const loaderRef = useRef<HTMLDivElement>(null);

  const loadGifs = async (q: string, pos: string | null = null) => {
    setLoading(true);
    try {
      const { results, next } = await searchGifs(q, 20, pos || undefined);
      setGifs(currentGifs => (pos ? [...currentGifs, ...results] : results));
      setNextPos(next);
    } catch (error) {
      console.error('Failed to load GIFs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGifs(debouncedQuery || 'trending');
  }, [debouncedQuery]);
  
  const handleLoadMore = () => {
    if (nextPos && !loading) {
      loadGifs(debouncedQuery || 'trending', nextPos);
    }
  };

  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      if (entries[0].isIntersecting) {
        handleLoadMore();
      }
    }, { threshold: 1.0 });

    if (loaderRef.current) {
      observer.observe(loaderRef.current);
    }

    return () => {
      if (loaderRef.current) {
        observer.unobserve(loaderRef.current);
      }
    };
  }, [loaderRef, handleLoadMore]);


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg h-[80vh] flex flex-col p-0">
        <DialogHeader className="p-4 border-b">
          <DialogTitle>Select a GIF</DialogTitle>
        </DialogHeader>
        <div className="p-4">
            <Input
            type="text"
            placeholder="Search GIFs..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            className="w-full"
            />
        </div>
        <ScrollArea className="flex-1 px-4">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {gifs.map(g => (
              <div
                key={g.id}
                className="aspect-square relative cursor-pointer group"
                onClick={() => onSelect(g.media_formats.gif.url)}
              >
                <Image
                  src={g.media_formats.tinygif.url}
                  alt={g.content_description}
                  layout="fill"
                  objectFit="cover"
                  className="rounded"
                />
                 <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
          <div ref={loaderRef} className="h-10 flex justify-center items-center">
            {loading && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 w-full">
                    <Skeleton className="w-full aspect-square" />
                    <Skeleton className="w-full aspect-square" />
                    <Skeleton className="w-full aspect-square" />
                </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
