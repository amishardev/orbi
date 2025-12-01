'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Image as ImageIcon, Send, X, Link as LinkIcon, Video } from 'lucide-react';
import { Card } from './ui/card';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase-client';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { uploadMedia } from '@/app/actions/upload';
import { uploadVideo } from '@/lib/uploadUtils';
import Image from 'next/image';
import type { User, EmbedData } from '@/lib/types';
import { Progress } from './ui/progress';
import { useDebounce } from '@/hooks/use-debounce';
import { generateLinkPreview } from '@/ai/flows/generate-link-preview';
import { Skeleton } from './ui/skeleton';
import EmbedRenderer from './embed-renderer';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { cn } from '@/lib/utils';

const urlRegex = /(https?:\/\/[^\s]+)/g;

export function CreatePost({ user, className }: { user: User, className?: string }) {
  const { authUser } = useAuth();
  const [caption, setCaption] = useState('');
  const [isPosting, setIsPosting] = useState(false);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [linkEmbed, setLinkEmbed] = useState<EmbedData | null>(null);
  const [isFetchingPreview, setIsFetchingPreview] = useState(false);
  const debouncedCaption = useDebounce(caption, 1000);

  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [manualUrl, setManualUrl] = useState('');

  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  if (!authUser || !user) return null;

  const fetchPreview = async (url: string) => {
    setIsFetchingPreview(true);
    setLinkEmbed(null); // Clear previous embed
    try {
      const embed = await generateLinkPreview({ url });
      if (embed) {
        setLinkEmbed(embed);
      }
    } catch (error) {
      console.error("Failed to generate link preview", error);
      setLinkEmbed({ url: url, type: 'error', title: 'Could not load preview' });
    } finally {
      setIsFetchingPreview(false);
    }
  };


  useEffect(() => {
    const urls = debouncedCaption.match(urlRegex);
    if (urls && urls[0] && mediaFiles.length === 0 && !linkEmbed) {
      fetchPreview(urls[0]);
    }
  }, [debouncedCaption, mediaFiles, linkEmbed]);

  const handleManualLinkSubmit = () => {
    if (manualUrl) {
      fetchPreview(manualUrl);
    }
    setIsLinkDialogOpen(false);
    setManualUrl('');
  };


  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);

      if (mediaFiles.length + newFiles.length > 8) {
        toast({
          variant: 'destructive',
          title: 'Too many images',
          description: 'You can only upload up to 8 images.',
        });
        return;
      }

      setLinkEmbed(null);
      setMediaType('image');

      const updatedFiles = [...mediaFiles, ...newFiles];
      setMediaFiles(updatedFiles);

      newFiles.forEach(file => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setMediaPreviews(prev => [...prev, reader.result as string]);
        }
        reader.readAsDataURL(file);
      });
    }
  }

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];

      // Check size limit (300MB)
      if (file.size > 300 * 1024 * 1024) {
        toast({
          variant: 'destructive',
          title: 'File too large',
          description: 'Video size must be less than 300MB.',
        });
        return;
      }

      removeMedia();
      setLinkEmbed(null);
      setMediaFiles([file]);
      setMediaType('video');
      const reader = new FileReader();
      reader.onloadend = () => {
        setMediaPreviews([reader.result as string]);
      }
      reader.readAsDataURL(file);
    }
  }

  const removeMedia = () => {
    setMediaPreviews([]);
    setMediaFiles([]);
    setMediaType(null);
    setUploadProgress(0);
    if (imageInputRef.current) imageInputRef.current.value = '';
    if (videoInputRef.current) videoInputRef.current.value = '';
  }

  const removeSingleMedia = (index: number) => {
    setMediaPreviews(prev => prev.filter((_, i) => i !== index));
    setMediaFiles(prev => prev.filter((_, i) => i !== index));
    if (mediaFiles.length <= 1) {
      setMediaType(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  }

  const removeEmbed = () => {
    setLinkEmbed(null);
  };

  const handlePost = async () => {
    if ((!caption.trim() && mediaFiles.length === 0 && !linkEmbed) || isPosting || !authUser?.uid || !db) return;

    setIsPosting(true);
    setUploadProgress(0);

    const postData: any = {
      userId: authUser.uid,
      username: user.username || 'user',
      authorDisplayName: user.displayName || 'User',
      authorPhotoURL: user.photoURL || `https://picsum.photos/seed/${authUser.uid}/200/200`,
      caption: caption,
      createdAt: serverTimestamp(),
      reactions: {},
      commentsCount: 0,
      totalReactions: 0,
    };

    if (linkEmbed) {
      postData.embed = linkEmbed;
    }

    try {
      if (mediaFiles.length > 0) {
        if (mediaType === 'video') {
          const videoUrl = await uploadVideo(mediaFiles[0]);
          postData.mediaUrl = videoUrl;
          postData.mediaType = 'video';
        } else {
          // Handle multiple images
          const uploadPromises = mediaFiles.map(file => {
            const formData = new FormData();
            formData.append('media', file);
            return uploadMedia(formData);
          });

          const results = await Promise.all(uploadPromises);
          const urls: string[] = [];

          results.forEach(res => {
            if (res.error) throw new Error(res.error);
            if (res.url) urls.push(res.url);
          });

          if (urls.length > 0) {
            postData.mediaUrl = urls[0]; // Backward compatibility
            postData.mediaUrls = urls;
            postData.mediaType = 'image';
            // Hint from first image if available
            if (results[0].hint) {
              postData.imageHint = results[0].hint;
            }
          }
        }
      } else {
        postData.mediaUrl = null;
        postData.mediaUrls = null;
        postData.mediaType = null;
      }

      await addDoc(collection(db, 'posts'), postData);
      setCaption('');
      removeMedia();
      setLinkEmbed(null);
    } catch (error: any) {
      console.error("Error creating post: ", error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'There was an error creating your post. Please try again.',
      });
    } finally {
      setIsPosting(false);
    }
  }

  return (
    <Card className={cn("p-4 overflow-hidden", className)}>
      <div className='flex gap-4'>
        <Avatar className='h-12 w-12'>
          <AvatarImage src={user.photoURL} alt={user.displayName} />
          <AvatarFallback>
            {user.displayName
              ?.split(' ')
              .map(n => n[0])
              .join('')}
          </AvatarFallback>
        </Avatar>
        <Textarea
          placeholder="Share something..."
          rows={2}
          className="text-base border-none focus-visible:ring-0 resize-none"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          disabled={isPosting}
        />
      </div>

      <div className="mt-4 pl-16 space-y-4">
        {mediaPreviews.length > 0 && (
          <div className="flex overflow-x-auto snap-x gap-2 pb-2 scrollbar-hide">
            {mediaPreviews.map((preview, index) => (
              <div key={index} className="relative flex-none w-64 h-64 bg-slate-900 rounded-lg overflow-hidden border border-slate-700 snap-center">
                {mediaType === 'video' ? (
                  <video src={preview} controls className="w-full h-full object-contain" />
                ) : (
                  <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
                )}
                <Button
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 h-7 w-7 z-10"
                  onClick={() => removeSingleMedia(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {mediaType === 'image' && mediaFiles.length < 8 && (
              <div
                className="flex-none w-64 h-64 bg-slate-900/50 rounded-lg border border-dashed border-slate-700 flex items-center justify-center cursor-pointer hover:bg-slate-900/80 transition-colors snap-center"
                onClick={() => imageInputRef.current?.click()}
              >
                <div className="flex flex-col items-center text-muted-foreground">
                  <ImageIcon className="h-8 w-8 mb-2" />
                  <span className="text-sm font-medium">Add more</span>
                </div>
              </div>
            )}
          </div>
        )}

        {isFetchingPreview && (
          <div className="space-y-2">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}

        {linkEmbed && !isFetchingPreview && (
          <div className="relative">
            <EmbedRenderer embed={linkEmbed} />
            <Button variant="destructive" size="icon" className="absolute top-2 right-2 h-7 w-7" onClick={removeEmbed}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {isPosting && uploadProgress > 0 && <Progress value={uploadProgress} className="w-full mt-2" />}


      <div className='mt-4 flex justify-between items-center'>
        <div className='flex gap-1 text-muted-foreground'>
          <Button variant="ghost" size="sm" onClick={() => imageInputRef.current?.click()} disabled={isPosting}>
            <ImageIcon className='h-5 w-5 mr-2' />
            Image
          </Button>
          <input type="file" accept="image/*" multiple ref={imageInputRef} onChange={handleMediaSelect} className="hidden" />

          <Button variant="ghost" size="sm" onClick={() => videoInputRef.current?.click()} disabled={isPosting}>
            <Video className='h-5 w-5 mr-2' />
            Video
          </Button>
          <input type="file" accept="video/*" ref={videoInputRef} onChange={handleVideoSelect} className="hidden" />

          <AlertDialog open={isLinkDialogOpen} onOpenChange={setIsLinkDialogOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" disabled={isPosting}>
                <LinkIcon className='h-5 w-5 mr-2' />
                Embed Link
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Embed a Link</AlertDialogTitle>
                <AlertDialogDescription>
                  Paste a URL below to generate a rich preview in your post.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <div className="grid gap-2">
                <Label htmlFor="link-url" className="sr-only">URL</Label>
                <Input
                  id="link-url"
                  placeholder="https://example.com"
                  value={manualUrl}
                  onChange={(e) => setManualUrl(e.target.value)}
                />
              </div>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleManualLinkSubmit}>Embed</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <Button onClick={handlePost} disabled={isPosting || (!caption.trim() && mediaFiles.length === 0 && !linkEmbed)} className="rounded-full w-24">
          {isPosting ? 'POSTING...' : 'POST'}
        </Button>
      </div>
    </Card>
  );
}
