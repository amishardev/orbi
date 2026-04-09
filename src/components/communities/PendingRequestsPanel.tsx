'use client';

import { useState, useEffect } from 'react';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Check, X, UserPlus, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface JoinRequest {
    id: string;
    userId: string;
    displayName: string;
    username: string;
    photoURL: string;
    requestedAt: { _seconds: number };
    status: string;
}

interface PendingRequestsPanelProps {
    communityId: string;
    isAdmin: boolean;
}

export function PendingRequestsPanel({ communityId, isAdmin }: PendingRequestsPanelProps) {
    const [requests, setRequests] = useState<JoinRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
    const { toast } = useToast();

    const fetchRequests = async () => {
        if (!isAdmin) return;

        setLoading(true);
        try {
            const functions = getFunctions();
            const getPending = httpsCallable<
                { communityId: string },
                { requests: JoinRequest[] }
            >(functions, 'getPendingJoinRequests');

            const result = await getPending({ communityId });
            setRequests(result.data.requests);
        } catch (error) {
            console.error('Error fetching requests:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRequests();
    }, [communityId, isAdmin]);

    const handleProcess = async (requestId: string, action: 'approve' | 'reject') => {
        setProcessingIds(prev => new Set(prev).add(requestId));

        try {
            const functions = getFunctions();
            const process = httpsCallable<
                { requestId: string; action: 'approve' | 'reject' },
                { success: boolean }
            >(functions, 'processCommunityJoinRequest');

            await process({ requestId, action });

            // Remove from list
            setRequests(prev => prev.filter(r => r.id !== requestId));

            toast({
                title: action === 'approve' ? 'User approved!' : 'Request rejected',
                description: action === 'approve'
                    ? 'The user has been added to the community.'
                    : 'The join request has been declined.'
            });
        } catch (error: any) {
            console.error('Error processing request:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to process request',
                variant: 'destructive'
            });
        } finally {
            setProcessingIds(prev => {
                const next = new Set(prev);
                next.delete(requestId);
                return next;
            });
        }
    };

    const formatDate = (timestamp: { _seconds: number }) => {
        const date = new Date(timestamp._seconds * 1000);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (!isAdmin) return null;

    if (loading) {
        return (
            <div className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Pending Requests
                </h3>
                <div className="flex items-center justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
            </div>
        );
    }

    if (requests.length === 0) {
        return (
            <div className="p-4">
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    Pending Requests
                </h3>
                <p className="text-sm text-muted-foreground text-center py-4">
                    No pending requests
                </p>
            </div>
        );
    }

    return (
        <div className="p-4">
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Pending Requests
                <span className="ml-auto bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                    {requests.length}
                </span>
            </h3>

            <ScrollArea className="max-h-[200px]">
                <div className="space-y-2">
                    {requests.map((request) => (
                        <div
                            key={request.id}
                            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={request.photoURL} />
                                    <AvatarFallback>{request.displayName?.[0] || 'U'}</AvatarFallback>
                                </Avatar>
                                <div className="min-w-0">
                                    <p className="text-sm font-medium truncate">{request.displayName}</p>
                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {formatDate(request.requestedAt)}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-1 ml-2">
                                {processingIds.has(request.id) ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-green-500 hover:text-green-600 hover:bg-green-500/10"
                                            onClick={() => handleProcess(request.id, 'approve')}
                                        >
                                            <Check className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                            onClick={() => handleProcess(request.id, 'reject')}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
