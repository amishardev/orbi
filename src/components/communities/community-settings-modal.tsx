'use client';

import React, { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Upload, Search, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { uploadMedia } from '@/app/actions/upload';
import type { Community } from '@/lib/types';

interface CommunitySettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
    community: Community;
}

export function CommunitySettingsModal({ isOpen, onClose, community }: CommunitySettingsModalProps) {
    const [name, setName] = useState(community.name);
    const [description, setDescription] = useState(community.description || '');
    const [iconUrl, setIconUrl] = useState(community.iconUrl || '');
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { toast } = useToast();

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        try {
            const formData = new FormData();
            formData.append('media', file);
            const result = await uploadMedia(formData);
            if (result?.url) {
                setIconUrl(result.url);
            }
        } catch (error) {
            console.error("Upload failed:", error);
            toast({
                title: "Error",
                description: "Failed to upload image.",
                variant: "destructive"
            });
        } finally {
            setIsUploading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) return;

        setIsSaving(true);
        try {
            await updateDoc(doc(db, 'communities', community.id), {
                name: name.trim(),
                description: description.trim(),
                iconUrl: iconUrl
            });
            toast({
                title: "Success",
                description: "Community settings updated."
            });
            onClose();
        } catch (error) {
            console.error("Update failed:", error);
            toast({
                title: "Error",
                description: "Failed to update settings.",
                variant: "destructive"
            });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[500px] bg-slate-900 border-slate-800 text-white">
                <DialogHeader>
                    <DialogTitle>Community Settings</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Icon Section */}
                    <div className="flex flex-col items-center gap-4">
                        <Avatar className="h-24 w-24 border-4 border-slate-800 shadow-xl">
                            <AvatarImage src={iconUrl} />
                            <AvatarFallback className="text-2xl bg-primary/20 text-primary">
                                {name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>

                        <Tabs defaultValue="upload" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                                <TabsTrigger value="upload">Upload Image</TabsTrigger>
                                <TabsTrigger value="gif">Choose GIF</TabsTrigger>
                            </TabsList>
                            <TabsContent value="upload" className="mt-4">
                                <div className="flex justify-center">
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        accept="image/*"
                                        onChange={handleFileUpload}
                                    />
                                    <Button
                                        variant="outline"
                                        className="border-slate-700 hover:bg-slate-800 text-slate-300"
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isUploading}
                                    >
                                        {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                        Upload Icon
                                    </Button>
                                </div>
                            </TabsContent>
                            <TabsContent value="gif" className="mt-4">
                                <div className="text-center text-sm text-slate-400 p-4 border border-dashed border-slate-700 rounded-lg">
                                    GIF Picker Placeholder
                                    <br />
                                    (Integration coming soon)
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Name Input */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Community Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white"
                        />
                    </div>

                    {/* Description Input */}
                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="bg-slate-800 border-slate-700 text-white min-h-[100px]"
                            placeholder="What is this community about?"
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} className="text-slate-400 hover:text-white">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || !name.trim()} className="bg-primary hover:bg-primary/90">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
