'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Loader2, Users, Check, Clock, AlertCircle, Lock } from 'lucide-react';
import Link from 'next/link';

interface CommunityInfo {
    id: string;
    name: string;
    iconUrl: string;
    memberCount: number;
    description: string;
}

interface ValidateResult {
    valid: boolean;
    inviteType: 'public' | 'private';
    community: CommunityInfo;
    isAlreadyMember: boolean;
}

interface AcceptResult {
    success: boolean;
    joined?: boolean;
    requestSent?: boolean;
    alreadyMember?: boolean;
    requestPending?: boolean;
    communityId?: string;
    communityName?: string;
    message?: string;
}

export default function InvitePage() {
    const params = useParams();
    const router = useRouter();
    const inviteCode = params.inviteCode as string;
    const { authUser, loading: authLoading } = useAuth();

    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [inviteData, setInviteData] = useState<ValidateResult | null>(null);
    const [joinResult, setJoinResult] = useState<AcceptResult | null>(null);

    // Validate invite on load
    useEffect(() => {
        if (!inviteCode) return;

        const validateInvite = async () => {
            setLoading(true);
            setError(null);

            try {
                const functions = getFunctions();
                const validate = httpsCallable<{ inviteCode: string }, ValidateResult>(
                    functions,
                    'validateCommunityInvite'
                );

                const result = await validate({ inviteCode });
                setInviteData(result.data);
            } catch (err: any) {
                console.error('Error validating invite:', err);
                setError(err.message || 'Invalid or expired invite link');
            } finally {
                setLoading(false);
            }
        };

        validateInvite();
    }, [inviteCode]);

    // Handle join/request
    const handleJoin = async () => {
        if (!authUser) {
            // Redirect to login with return URL
            router.push(`/login?redirect=/gchat/invite/${inviteCode}`);
            return;
        }

        setJoining(true);
        setError(null);

        try {
            const functions = getFunctions();
            const accept = httpsCallable<{ inviteCode: string }, AcceptResult>(
                functions,
                'acceptCommunityInvite'
            );

            const result = await accept({ inviteCode });
            setJoinResult(result.data);

            // If joined successfully, redirect to community after a brief delay
            if (result.data.joined && result.data.communityId) {
                setTimeout(() => {
                    router.push(`/communities`);
                }, 1500);
            }
        } catch (err: any) {
            console.error('Error accepting invite:', err);
            setError(err.message || 'Failed to process invite');
        } finally {
            setJoining(false);
        }
    };

    // Loading state
    if (loading || authLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
                    <p className="text-muted-foreground">Loading invite...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error && !inviteData) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-xl">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="h-8 w-8 text-destructive" />
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Invalid Invite</h1>
                    <p className="text-muted-foreground mb-6">{error}</p>
                    <Link href="/communities">
                        <Button variant="outline">Browse Communities</Button>
                    </Link>
                </div>
            </div>
        );
    }

    // Success states after joining/requesting
    if (joinResult) {
        if (joinResult.joined) {
            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-xl">
                        <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                            <Check className="h-8 w-8 text-green-500" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Joined Successfully!</h1>
                        <p className="text-muted-foreground mb-6">
                            Welcome to <span className="font-semibold text-foreground">{inviteData?.community.name}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">Redirecting to community...</p>
                    </div>
                </div>
            );
        }

        if (joinResult.requestSent || joinResult.requestPending) {
            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-xl">
                        <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
                            <Clock className="h-8 w-8 text-yellow-500" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Request Sent!</h1>
                        <p className="text-muted-foreground mb-6">
                            {joinResult.message || 'Your request to join has been sent. The admin will review it shortly.'}
                        </p>
                        <Link href="/communities">
                            <Button variant="outline">Go to Communities</Button>
                        </Link>
                    </div>
                </div>
            );
        }

        if (joinResult.alreadyMember) {
            return (
                <div className="min-h-screen bg-background flex items-center justify-center p-4">
                    <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center shadow-xl">
                        <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                            <Check className="h-8 w-8 text-blue-500" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2">Already a Member</h1>
                        <p className="text-muted-foreground mb-6">
                            You're already a member of this community!
                        </p>
                        <Link href="/communities">
                            <Button>Go to Communities</Button>
                        </Link>
                    </div>
                </div>
            );
        }
    }

    // Main invite preview
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-card border border-border rounded-2xl overflow-hidden shadow-xl">
                {/* Header gradient */}
                <div className="h-24 bg-gradient-to-br from-primary/30 via-primary/20 to-background" />

                {/* Community info */}
                <div className="px-8 pb-8 -mt-12">
                    <Avatar className="h-24 w-24 border-4 border-card shadow-lg mx-auto">
                        <AvatarImage src={inviteData?.community.iconUrl} alt={inviteData?.community.name} />
                        <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                            {inviteData?.community.name?.[0] || 'C'}
                        </AvatarFallback>
                    </Avatar>

                    <div className="text-center mt-4">
                        <p className="text-sm text-muted-foreground mb-1">You've been invited to join</p>
                        <h1 className="text-2xl font-bold">{inviteData?.community.name}</h1>

                        {inviteData?.community.description && (
                            <p className="text-muted-foreground mt-2 text-sm">
                                {inviteData.community.description}
                            </p>
                        )}

                        <div className="flex items-center justify-center gap-2 mt-3 text-muted-foreground">
                            <Users className="h-4 w-4" />
                            <span className="text-sm">{inviteData?.community.memberCount} members</span>
                        </div>

                        {/* Invite type badge */}
                        {inviteData?.inviteType === 'private' && (
                            <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full bg-yellow-500/10 text-yellow-500 text-xs font-medium">
                                <Lock className="h-3 w-3" />
                                Admin approval required
                            </div>
                        )}
                    </div>

                    {/* Already member check */}
                    {inviteData?.isAlreadyMember ? (
                        <div className="mt-6 space-y-3">
                            <div className="text-center text-sm text-muted-foreground mb-4">
                                You're already a member of this community
                            </div>
                            <Link href="/communities" className="block">
                                <Button className="w-full" size="lg">
                                    Go to Communities
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="mt-6 space-y-3">
                            {error && (
                                <div className="text-sm text-destructive text-center mb-2">
                                    {error}
                                </div>
                            )}

                            <Button
                                className="w-full"
                                size="lg"
                                onClick={handleJoin}
                                disabled={joining}
                            >
                                {joining ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {inviteData?.inviteType === 'public' ? 'Joining...' : 'Sending Request...'}
                                    </>
                                ) : (
                                    <>
                                        {inviteData?.inviteType === 'public' ? 'Join Community' : 'Request to Join'}
                                    </>
                                )}
                            </Button>

                            {!authUser && (
                                <p className="text-xs text-center text-muted-foreground">
                                    You'll need to log in to join this community
                                </p>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
