'use client';

import React from 'react';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Community } from '@/lib/types';

interface ChatHeaderProps {
    community: Community;
    isInfoPanelOpen: boolean;
    onToggleInfoPanel: () => void;
}

export function ChatHeader({ community, isInfoPanelOpen, onToggleInfoPanel }: ChatHeaderProps) {
    return (
        <div className="h-14 border-b border-border flex items-center justify-between px-4 bg-card/30 backdrop-blur-sm shadow-sm">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-3">
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={community.iconUrl} alt={community.name} />
                        <AvatarFallback>{community.name[0]}</AvatarFallback>
                    </Avatar>
                    <h2 className="font-bold text-foreground truncate max-w-[200px] sm:max-w-md">
                        {community.name}
                    </h2>
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={onToggleInfoPanel}
                    className={`text-muted-foreground hover:text-foreground transition-colors ${isInfoPanelOpen ? 'bg-secondary text-foreground' : ''}`}
                    title="Community Info"
                >
                    <Info size={20} />
                </Button>
            </div>
        </div>
    );
}
