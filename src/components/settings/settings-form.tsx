
'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useForm, type SubmitHandler, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import type { User } from '@/lib/types';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Image as ImageIcon, Film } from 'lucide-react';
import { uploadPhoto } from '@/app/actions/upload';
import { GifPicker } from '../gif-picker';


const settingsSchema = z.object({
  displayName: z.string().min(1, { message: 'Display name is required' }),
  username: z.string().min(3, { message: 'Username must be at least 3 characters' }).regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores.'),
  email: z.string().email({ message: 'Invalid email address' }),
  bio: z.string().max(500, { message: 'Bio cannot exceed 500 characters' }).optional(),
  interests: z.string().optional(),
  relationshipStatus: z.string().optional(),
});

type SettingsInputs = z.infer<typeof settingsSchema>;

interface SettingsFormProps {
  currentUserData: User;
}

export function SettingsForm({ currentUserData }: SettingsFormProps) {
  const { authUser, updateUserProfile } = useAuth();
  const { toast } = useToast();

  const [profilePreview, setProfilePreview] = useState<string | null>(currentUserData.photoURL || null);
  const [profileFile, setProfileFile] = useState<File | null>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const [profileGifUrl, setProfileGifUrl] = useState<string | null>(null);
  const [isProfileGifPickerOpen, setIsProfileGifPickerOpen] = useState(false);

  const [coverPreview, setCoverPreview] = useState<string | null>(currentUserData.coverPhoto || null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const [coverGifUrl, setCoverGifUrl] = useState<string | null>(null);
  const [isCoverGifPickerOpen, setIsCoverGifPickerOpen] = useState(false);


  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting, isDirty },
    setValue,
  } = useForm<SettingsInputs>({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      displayName: currentUserData.displayName || '',
      username: currentUserData.username || '',
      email: currentUserData.email || '',
      bio: currentUserData.bio || '',
      interests: (currentUserData.interests || []).join(', '),
      relationshipStatus: currentUserData.relationshipStatus || '',
    },
  });

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'profile' | 'cover') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onloadend = () => {
        if (type === 'profile') {
          setProfileFile(file);
          setProfilePreview(reader.result as string);
          setProfileGifUrl(null);
        } else {
          setCoverFile(file);
          setCoverPreview(reader.result as string);
          setCoverGifUrl(null); // Clear any selected GIF
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCoverGifSelect = (url: string) => {
    setCoverGifUrl(url);
    setCoverPreview(url);
    setCoverFile(null); // Clear any selected file
    setIsCoverGifPickerOpen(false);
  }

  const handleProfileGifSelect = (url: string) => {
    setProfileGifUrl(url);
    setProfilePreview(url);
    setProfileFile(null);
    setIsProfileGifPickerOpen(false);
  };


  const onSubmit: SubmitHandler<SettingsInputs> = async (data) => {
    let newProfilePicture: string | undefined = undefined;
    let newCoverPhoto: string | undefined = undefined;

    try {
      if (profileGifUrl) {
        newProfilePicture = profileGifUrl;
      } else if (profileFile) {
        const formData = new FormData();
        formData.append('photo', profileFile);
        const res = await uploadPhoto(formData, { folder: 'orbi-profiles', revalidatePathUrl: `/profile/${currentUserData.username}` });
        if (res.error) throw new Error(`Profile image upload failed: ${res.error}`);
        newProfilePicture = res.url;
      }

      if (coverGifUrl) {
        newCoverPhoto = coverGifUrl;
      } else if (coverFile) {
        const formData = new FormData();
        formData.append('photo', coverFile);
        const res = await uploadPhoto(formData, { folder: 'orbi-covers', revalidatePathUrl: `/profile/${currentUserData.username}` });
        if (res.error) throw new Error(`Cover image upload failed: ${res.error}`);
        newCoverPhoto = res.url;
      }

      await updateUserProfile({
        ...data,
        interests: data.interests ? data.interests.split(',').map(i => i.trim()).filter(Boolean) : [],
        newProfilePicture,
        newCoverPhoto,
      });

      toast({
        title: 'Profile Updated',
        description: 'Your settings have been successfully saved.',
      });
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Update Failed',
        description: error.message || 'An unexpected error occurred.',
      });
    }
  };

  const isFormDirty = isDirty || !!profileFile || !!coverFile || !!coverGifUrl || !!profileGifUrl;

  return (
    <>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="space-y-2">
          <Label>Cover Photo</Label>
          <input
            type="file"
            accept="image/*"
            ref={coverInputRef}
            onChange={(e) => handleImageSelect(e, 'cover')}
            className="hidden"
          />
          <div
            className="aspect-[3/1] w-full rounded-lg bg-muted flex items-center justify-center cursor-pointer relative overflow-hidden group"
          >
            {coverPreview ? (
              <Image src={coverPreview} alt="Cover preview" layout="fill" objectFit="cover" />
            ) : (
              <div className="text-muted-foreground flex flex-col items-center">
                <ImageIcon className="h-10 w-10" />
                <span className="text-sm mt-2">Upload Banner</span>
              </div>
            )}
            <div
              className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={() => coverInputRef.current?.click()}
            >
              <p className="text-white font-semibold">Change Cover Photo</p>
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Button type="button" variant="outline" size="sm" onClick={() => coverInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setIsCoverGifPickerOpen(true)}>
              <Film className="h-4 w-4 mr-2" />
              Choose from GIF
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <Label>Profile Picture</Label>
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              ref={profileInputRef}
              onChange={(e) => handleImageSelect(e, 'profile')}
              className="hidden"
            />
            <Avatar className="h-20 w-20">
              <AvatarImage src={profilePreview ?? undefined} alt="Profile preview" />
              <AvatarFallback>
                {currentUserData.displayName?.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => profileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" />
                Change Photo
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsProfileGifPickerOpen(true)}>
                <Film className="h-4 w-4 mr-2" />
                Choose from GIF
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="displayName">Display Name</Label>
            <Input id="displayName" {...register('displayName')} />
            {errors.displayName && <p className="text-sm text-destructive">{errors.displayName.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input id="username" {...register('username')} />
            {errors.username && <p className="text-sm text-destructive">{errors.username.message}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" {...register('email')} />
          {errors.email && <p className="text-sm text-destructive">{errors.email.message}</p>}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea id="bio" {...register('bio')} className="min-h-[100px]" />
          {errors.bio && <p className="text-sm text-destructive">{errors.bio.message}</p>}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label htmlFor="interests">Interests</Label>
            <Input id="interests" placeholder="e.g., Hiking, Reading, Coding" {...register('interests')} />
            <p className="text-xs text-muted-foreground">Separate interests with a comma.</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="relationship-status">Relationship Status</Label>
            <Controller
              name="relationshipStatus"
              control={control}
              render={({ field }) => (
                <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                  <SelectTrigger id="relationship-status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="single">Single</SelectItem>
                    <SelectItem value="in-a-relationship">In a relationship</SelectItem>
                    <SelectItem value="engaged">Engaged</SelectItem>
                    <SelectItem value="married">Married</SelectItem>
                    <SelectItem value="complicated">It's complicated</SelectItem>
                    <SelectItem value="prefer-not-to-say">Prefer not to say</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={isSubmitting || !isFormDirty}>
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </form>
      <GifPicker
        open={isCoverGifPickerOpen}
        onOpenChange={setIsCoverGifPickerOpen}
        onSelect={handleCoverGifSelect}
      />
      <GifPicker
        open={isProfileGifPickerOpen}
        onOpenChange={setIsProfileGifPickerOpen}
        onSelect={handleProfileGifSelect}
      />
    </>
  );
}
