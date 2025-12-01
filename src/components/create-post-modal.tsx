'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { CreatePost } from '@/components/create-post';
import { useAuth } from '@/hooks/use-auth';

interface CreatePostModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CreatePostModal({ open, onOpenChange }: CreatePostModalProps) {
    const { userData } = useAuth();

    if (!userData) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="p-0 border-none bg-transparent shadow-none max-w-lg w-full">
                <DialogHeader className="sr-only">
                    <DialogTitle>Create Post</DialogTitle>
                </DialogHeader>
                <CreatePost user={userData} className="block w-full" />
            </DialogContent>
        </Dialog>
    );
}
