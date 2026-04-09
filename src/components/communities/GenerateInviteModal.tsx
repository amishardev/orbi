'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { Copy, Check, Loader2, Link as LinkIcon, Globe, Lock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface GenerateInviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    communityId: string;
    communityName: string;
}

interface GenerateResult {
    inviteCode: string;
    inviteUrl: string;
    expiresAt: string | null;
    inviteType: 'public' | 'private';
}

export function GenerateInviteModal({ isOpen, onClose, communityId, communityName }: GenerateInviteModalProps) {
    const [inviteType, setInviteType] = useState<'public' | 'private'>('public');
    const [expiry, setExpiry] = useState<string>('7');
    const [loading, setLoading] = useState(false);
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();

    const handleGenerate = async () => {
        setLoading(true);

        try {
            const functions = getFunctions();
            const generate = httpsCallable<{
                communityId: string;
                expireInDays: number | null;
                inviteType: 'public' | 'private';
            }, GenerateResult>(functions, 'generateCommunityInvite');

            const result = await generate({
                communityId,
                expireInDays: expiry === 'never' ? null : parseInt(expiry),
                inviteType
            });

            setGeneratedLink(result.data.inviteUrl);

            toast({
                title: 'Invite link created!',
                description: `${inviteType === 'public' ? 'Public' : 'Private'} invite link is ready to share.`
            });
        } catch (error: any) {
            console.error('Error generating invite:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to generate invite link',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (!generatedLink) return;

        try {
            await navigator.clipboard.writeText(generatedLink);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);

            toast({
                title: 'Copied!',
                description: 'Invite link copied to clipboard'
            });
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to copy link',
                variant: 'destructive'
            });
        }
    };

    const handleClose = () => {
        setGeneratedLink(null);
        setCopied(false);
        setInviteType('public');
        setExpiry('7');
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
            <DialogContent className="sm:max-w-md bg-background border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <LinkIcon className="h-5 w-5" />
                        Generate Invite Link
                    </DialogTitle>
                    <DialogDescription>
                        Create an invite link for {communityName}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {!generatedLink ? (
                        <>
                            {/* Invite Type Selection */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Invite Type</Label>
                                <div className="grid grid-cols-2 gap-3">
                                    <div
                                        onClick={() => setInviteType('public')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${inviteType === 'public'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-border/80'
                                            }`}
                                    >
                                        <Globe className={`h-6 w-6 ${inviteType === 'public' ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <div className="text-center">
                                            <span className="font-medium text-sm">Public</span>
                                            <p className="text-xs text-muted-foreground mt-0.5">Join instantly</p>
                                        </div>
                                    </div>

                                    <div
                                        onClick={() => setInviteType('private')}
                                        className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 cursor-pointer transition-all ${inviteType === 'private'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-border/80'
                                            }`}
                                    >
                                        <Lock className={`h-6 w-6 ${inviteType === 'private' ? 'text-primary' : 'text-muted-foreground'}`} />
                                        <div className="text-center">
                                            <span className="font-medium text-sm">Private</span>
                                            <p className="text-xs text-muted-foreground mt-0.5">Requires approval</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Expiry Selection */}
                            <div className="space-y-2">
                                <Label className="text-sm font-medium">Link Expiry</Label>
                                <Select value={expiry} onValueChange={setExpiry}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select expiry" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 day</SelectItem>
                                        <SelectItem value="7">7 days</SelectItem>
                                        <SelectItem value="30">30 days</SelectItem>
                                        <SelectItem value="never">Never expires</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Generate Button */}
                            <Button
                                onClick={handleGenerate}
                                disabled={loading}
                                className="w-full"
                            >
                                {loading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    'Generate Invite Link'
                                )}
                            </Button>
                        </>
                    ) : (
                        <>
                            {/* Generated Link Display */}
                            <div className="space-y-3">
                                <Label className="text-sm font-medium">Your Invite Link</Label>
                                <div className="flex gap-2">
                                    <Input
                                        value={generatedLink}
                                        readOnly
                                        className="font-mono text-sm bg-muted"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={handleCopy}
                                    >
                                        {copied ? (
                                            <Check className="h-4 w-4 text-green-500" />
                                        ) : (
                                            <Copy className="h-4 w-4" />
                                        )}
                                    </Button>
                                </div>

                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    {inviteType === 'public' ? (
                                        <>
                                            <Globe className="h-4 w-4" />
                                            <span>Anyone with this link can join instantly</span>
                                        </>
                                    ) : (
                                        <>
                                            <Lock className="h-4 w-4" />
                                            <span>People will need your approval to join</span>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button
                                    variant="outline"
                                    onClick={() => setGeneratedLink(null)}
                                    className="flex-1"
                                >
                                    Create Another
                                </Button>
                                <Button onClick={handleClose} className="flex-1">
                                    Done
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
