'use client';

import React, { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Community } from '@/lib/types';
import { CreateCommunityModal } from './create-community-modal';

interface CommunitySidebarProps {
    communities: Community[];
    activeId: string | null;
    onSelect: (id: string) => void;
}

export function CommunitySidebar({ communities, activeId, onSelect }: CommunitySidebarProps) {
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    return (
        <div className="w-[72px] flex flex-col items-center py-4 gap-4 bg-card border-r border-border overflow-y-auto no-scrollbar">
            <TooltipProvider delayDuration={0}>
                {communities.map((community) => (
                    <Tooltip key={community.id}>
                        <TooltipTrigger asChild>
                            <div className="relative group flex items-center justify-center w-full">
                                {/* Active Indicator Pill */}
                                <div
                                    className={cn(
                                        "absolute left-0 w-1 bg-primary rounded-r-full transition-all duration-200",
                                        activeId === community.id ? "h-10" : "h-2 group-hover:h-5 opacity-0 group-hover:opacity-100"
                                    )}
                                />

                                <button
                                    onClick={() => onSelect(community.id)}
                                    className={cn(
                                        "relative h-12 w-12 rounded-[24px] group-hover:rounded-[16px] transition-all duration-200 overflow-hidden ring-offset-2 ring-offset-background focus:outline-none focus:ring-2 focus:ring-primary",
                                        activeId === community.id && "rounded-[16px] ring-2 ring-primary"
                                    )}
                                >
                                    <Avatar className="h-full w-full rounded-none">
                                        <AvatarImage
                                            src={community.iconUrl?.includes('cloudinary')
                                                ? community.iconUrl.replace('/upload/', '/upload/w_100,h_100,c_fill,q_auto,f_auto/')
                                                : community.iconUrl}
                                            alt={community.name}
                                            className="object-cover"
                                        />
                                        <AvatarFallback className="bg-primary/10 text-primary font-bold rounded-none">
                                            {community.name.substring(0, 2).toUpperCase()}
                                        </AvatarFallback>
                                    </Avatar>
                                </button>
                            </div>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="font-semibold">
                            {community.name}
                        </TooltipContent>
                    </Tooltip>
                ))}

                {/* Create New Community Button */}
                <div className="mt-2 w-8 h-[2px] bg-border rounded-full" />

                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="group flex items-center justify-center w-full">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-12 w-12 rounded-[24px] group-hover:rounded-[16px] group-hover:bg-green-500 group-hover:text-white transition-all duration-200 bg-secondary text-green-500"
                                onClick={() => setIsCreateModalOpen(true)}
                            >
                                <Plus size={24} />
                            </Button>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-semibold">
                        Create a Community
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>

            <CreateCommunityModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}
