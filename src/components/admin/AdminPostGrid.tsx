'use client';

import { useState } from 'react';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trash2, AlertTriangle, BadgeCheck } from 'lucide-react';
import { deletePost } from '@/actions/admin-actions';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

interface Post {
    id: string;
    content: string;
    imageURL?: string;
    authorId: string;
    authorName: string;
    authorPhotoURL?: string;
    authorIsVerified?: boolean;
    authorIsAgent?: boolean;
    createdAt: any;
}

interface AdminPostGridProps {
    posts: Post[];
}

export function AdminPostGrid({ posts }: AdminPostGridProps) {
    const [selectedPost, setSelectedPost] = useState<Post | null>(null);
    const [reason, setReason] = useState('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    const handleDelete = async () => {
        if (!selectedPost || !reason) return;

        await deletePost(selectedPost.id, reason, selectedPost.authorId);
        setIsDialogOpen(false);
        setReason('');
        setSelectedPost(null);
    };

    return (
        <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {posts.map((post) => (
                    <Card key={post.id} className="flex flex-col overflow-hidden">
                        <CardHeader className="flex flex-row items-center gap-3 p-4">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={post.authorPhotoURL} />
                                <AvatarFallback>{post.authorName?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1">
                                    <span className="text-sm font-medium">{post.authorName}</span>
                                    {post.authorIsVerified && (
                                        <BadgeCheck className="h-3 w-3 text-white fill-blue-500" />
                                    )}
                                    {post.authorIsAgent && (
                                        <BadgeCheck className="h-3 w-3 text-white fill-green-500" />
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground">
                                    {/* Handle date formatting safely */}
                                    {post.createdAt ? new Date(post.createdAt).toLocaleDateString() : 'Unknown date'}
                                </span>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 p-4 pt-0">
                            <p className="text-sm line-clamp-3 mb-2">{post.content}</p>
                            {post.imageURL && (
                                <div className="relative aspect-video w-full overflow-hidden rounded-md">
                                    <img
                                        src={post.imageURL}
                                        alt="Post content"
                                        className="object-cover w-full h-full"
                                    />
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="p-4 bg-muted/50">
                            <Button
                                variant="destructive"
                                size="sm"
                                className="w-full gap-2"
                                onClick={() => {
                                    setSelectedPost(post);
                                    setIsDialogOpen(true);
                                }}
                            >
                                <Trash2 className="h-4 w-4" />
                                Remove Post
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Remove Post</DialogTitle>
                        <DialogDescription>
                            This action will permanently delete the post and record a violation against the user.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="reason">Reason for Removal</Label>
                            <Textarea
                                id="reason"
                                placeholder="e.g. Hate speech, Spam, Nudity..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                        <Button variant="destructive" onClick={handleDelete} disabled={!reason}>
                            Confirm Removal
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
