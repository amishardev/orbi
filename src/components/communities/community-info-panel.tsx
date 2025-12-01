'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { UserMinus, LogOut, Settings, UserPlus, Shield, X, MoreVertical, MessageSquare, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import type { Community } from '@/lib/types';
import { doc, updateDoc, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { InviteMemberModal } from './invite-member-modal';
import { CommunitySettingsModal } from './community-settings-modal';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { motion, AnimatePresence } from 'framer-motion';

interface CommunityInfoPanelProps {
    community: Community;
    isOpen: boolean;
    onClose: () => void;
}

export function CommunityInfoPanel({ community, isOpen, onClose }: CommunityInfoPanelProps) {
    const { authUser } = useAuth();
    const { toast } = useToast();

    const isAdmin = authUser?.uid === community.createdBy || authUser?.uid === community.adminId;

    const [isInviteModalOpen, setIsInviteModalOpen] = React.useState(false);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = React.useState(false);

    const handleKickMember = async (memberId: string, memberName: string) => {
        if (!confirm(`Are you sure you want to kick ${memberName}?`)) return;

        try {
            const communityRef = doc(db, 'communities', community.id);
            await updateDoc(communityRef, {
                members: arrayRemove(memberId)
            });
            toast({
                title: "Member kicked",
                description: `${memberName} has been removed from the community.`,
            });
        } catch (error) {
            console.error("Error kicking member:", error);
            toast({
                title: "Error",
                description: "Failed to kick member. Please try again.",
                variant: "destructive"
            });
        }
    };

    const handleMakeAdmin = async (memberId: string, memberName: string) => {
        if (!confirm(`Make ${memberName} an admin?`)) return;

        try {
            await updateDoc(doc(db, 'communities', community.id), {
                adminId: memberId
            });
            toast({
                title: "Admin Updated",
                description: `${memberName} is now the admin.`,
            });
        } catch (error) {
            console.error("Error updating admin:", error);
            toast({
                title: "Error",
                description: "Failed to update admin.",
                variant: "destructive"
            });
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 320, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="h-full bg-background border-l border-border shadow-xl flex flex-col shrink-0 overflow-hidden"
                    >
                        {/* Header / Community Profile */}
                        <div className="p-6 flex flex-col items-center border-b border-border bg-card/30 pt-10 relative">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onClose}
                                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground rounded-full"
                            >
                                <X size={20} />
                            </Button>

                            <div className="relative mb-4 group">
                                <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
                                    <AvatarImage src={community.iconUrl} className="object-cover" />
                                    <AvatarFallback className="text-2xl bg-primary/10 text-primary">
                                        {community.name.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                </Avatar>
                                {isAdmin && (
                                    <Button
                                        size="icon"
                                        variant="secondary"
                                        className="absolute bottom-0 right-0 rounded-full h-8 w-8 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Edit Community Icon"
                                        onClick={() => setIsSettingsModalOpen(true)}
                                    >
                                        <Settings size={14} />
                                    </Button>
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-center break-words w-full">{community.name}</h2>
                            <p className="text-sm text-muted-foreground mt-1">
                                {community.members.length} {community.members.length === 1 ? 'member' : 'members'}
                            </p>

                            <div className="flex gap-2 mt-4 w-full">
                                <Button
                                    className="flex-1"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => setIsInviteModalOpen(true)}
                                >
                                    <UserPlus size={16} className="mr-2" />
                                    Invite
                                </Button>
                                {isAdmin && (
                                    <Button
                                        className="flex-1"
                                        size="sm"
                                        variant="outline"
                                        onClick={() => setIsSettingsModalOpen(true)}
                                    >
                                        <Settings size={16} className="mr-2" />
                                        Settings
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Members List */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <div className="px-6 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider bg-secondary/20">
                                Members
                            </div>
                            <ScrollArea className="flex-1">
                                <div className="px-4 py-2 space-y-1">
                                    {community.members.map(memberId => {
                                        const member = community.memberDetails?.[memberId];
                                        if (!member) return null;

                                        const isCreator = memberId === community.createdBy || memberId === community.adminId;
                                        const isMe = memberId === authUser?.uid;

                                        return (
                                            <div key={memberId} className="group flex items-center justify-between p-2 rounded-lg hover:bg-secondary/50 transition-colors">
                                                <div className="flex items-center gap-3 overflow-hidden">
                                                    <Avatar className="h-9 w-9 border border-border/50">
                                                        <AvatarImage src={member.photoURL} />
                                                        <AvatarFallback>{member.displayName[0]}</AvatarFallback>
                                                    </Avatar>
                                                    <div className="truncate">
                                                        <p className={cn("text-sm font-medium truncate flex items-center gap-1", isCreator && "text-primary")}>
                                                            {member.displayName}
                                                            {isCreator && <Shield size={12} className="fill-primary text-primary" />}
                                                        </p>
                                                        {isCreator && <p className="text-[10px] text-muted-foreground leading-none">Owner</p>}
                                                    </div>
                                                </div>

                                                {/* Member Actions Dropdown */}
                                                {!isMe && (
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <MoreVertical size={14} />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48 bg-slate-900 border-slate-800 text-slate-200">
                                                            <DropdownMenuItem className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800">
                                                                <MessageSquare className="mr-2 h-4 w-4" />
                                                                <span>Message Privately</span>
                                                            </DropdownMenuItem>
                                                            {isAdmin && !isCreator && (
                                                                <>
                                                                    <DropdownMenuItem
                                                                        className="cursor-pointer hover:bg-slate-800 focus:bg-slate-800"
                                                                        onClick={() => handleMakeAdmin(memberId, member.displayName)}
                                                                    >
                                                                        <ShieldCheck className="mr-2 h-4 w-4" />
                                                                        <span>Make Admin</span>
                                                                    </DropdownMenuItem>
                                                                    <DropdownMenuItem
                                                                        className="cursor-pointer text-red-500 hover:text-red-400 hover:bg-red-500/10 focus:bg-red-500/10"
                                                                        onClick={() => handleKickMember(memberId, member.displayName)}
                                                                    >
                                                                        <UserMinus className="mr-2 h-4 w-4" />
                                                                        <span>Kick Member</span>
                                                                    </DropdownMenuItem>
                                                                </>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        </div>

                        {/* Footer Actions */}
                        <div className="p-4 border-t border-border bg-secondary/10">
                            <Button variant="ghost" className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 justify-start">
                                <LogOut size={18} className="mr-2" />
                                Leave Community
                            </Button>
                        </div>
                    </motion.div>

                    <InviteMemberModal
                        isOpen={isInviteModalOpen}
                        onClose={() => setIsInviteModalOpen(false)}
                        community={community}
                    />
                    <CommunitySettingsModal
                        isOpen={isSettingsModalOpen}
                        onClose={() => setIsSettingsModalOpen(false)}
                        community={community}
                    />
                </>
            )}
        </AnimatePresence>
    );
}
