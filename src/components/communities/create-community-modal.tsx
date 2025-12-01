'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Loader2, Image as ImageIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { getCloudinarySignature } from '@/app/actions/community';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function CreateCommunityModal({ isOpen, onClose }: CreateCommunityModalProps) {
  const { authUser } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState('');
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Generate placeholder URL based on name
  const getPlaceholderUrl = (communityName: string) => {
    const encodedName = encodeURIComponent(communityName || 'Community');
    return `https://ui-avatars.com/api/?name=${encodedName}&background=random&size=512`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIconFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authUser || !name.trim()) return;

    setLoading(true);
    try {
      let finalIconUrl = getPlaceholderUrl(name);

      // 1. Client-Side Upload (if file selected)
      if (iconFile) {
        // Get signature from server
        const { timestamp, signature, cloudName, apiKey } = await getCloudinarySignature();

        // Upload to Cloudinary directly
        const formData = new FormData();
        formData.append('file', iconFile);
        formData.append('api_key', apiKey!);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);
        formData.append('folder', 'orbi-communities');

        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error('Failed to upload image to Cloudinary');
        }

        const data = await response.json();
        finalIconUrl = data.secure_url;
      }


      // 2. Create Community Document (Client-Side Write)
      const communityData = {
        name: name.trim(),
        iconUrl: finalIconUrl,
        createdBy: authUser.uid,
        adminId: authUser.uid,
        members: [authUser.uid],
        createdAt: serverTimestamp(),
        lastMessageAt: serverTimestamp(),
        isPublic: false,
        memberDetails: {
          [authUser.uid]: {
            displayName: authUser.displayName || 'User',
            photoURL: authUser.photoURL || ''
          }
        }
      };

      await addDoc(collection(db, 'communities'), communityData);

      toast({
        title: "Community Created!",
        description: `Welcome to ${name}.`,
      });

      onClose();
      setName('');
      setIconFile(null);
      setPreviewUrl(null);
    } catch (error: any) {
      console.error("Error creating community:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create community.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] bg-background/80 backdrop-blur-xl border-border/50">
        <DialogHeader>
          <DialogTitle>Create a Community</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group cursor-pointer">
              <div className="h-24 w-24 rounded-full bg-secondary flex items-center justify-center overflow-hidden border-2 border-dashed border-muted-foreground/50 hover:border-primary transition-colors relative">
                {previewUrl ? (
                  <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                ) : name.trim() ? (
                  <img src={getPlaceholderUrl(name)} alt="Placeholder" className="h-full w-full object-cover opacity-80" />
                ) : (
                  <div className="text-center p-2">
                    <ImageIcon className="mx-auto h-6 w-6 text-muted-foreground mb-1" />
                    <span className="text-xs text-muted-foreground">Upload Icon</span>
                  </div>
                )}

                {/* Hover Overlay */}
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <Upload className="h-6 w-6 text-white" />
                </div>
              </div>
              <input
                type="file"
                accept="image/*,image/gif"
                onChange={handleFileChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Optional. Supports JPG, PNG, GIF.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Community Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. React Developers"
              required
              className="bg-secondary/50 border-transparent focus:border-primary"
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Community
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}