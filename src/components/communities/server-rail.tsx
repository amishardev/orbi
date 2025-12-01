'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Plus } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Community } from '@/lib/types';

interface ServerRailProps {
    communities: Community[];
    activeId: string | null;
    onSelect: (id: string) => void;
    onCreateCommunity: () => void;
}

export function ServerRail({ communities, activeId, onSelect, onCreateCommunity }: ServerRailProps) {
    return (
        <div className="w-[72px] bg-slate-900 flex flex-col items-center py-3 space-y-2 h-full overflow-y-auto scrollbar-hide border-r border-white/10 shrink-0">
            <TooltipProvider delayDuration={0}>
                {communities.map((community) => {
                    const isActive = community.id === activeId;
                    return (
                        <Tooltip key={community.id}>
                            <TooltipTrigger asChild>
                                <div className="relative group flex items-center justify-center w-full">
                                    {/* Active Indicator Pill */}
                                    <div
                                        className={cn(
                                            "absolute left-0 w-1 bg-white rounded-r-full transition-all duration-200 ease-in-out",
                                            isActive ? "h-10" : "h-2 group-hover:h-5 opacity-0 group-hover:opacity-100"
                                        )}
                                    />

                                    {/* Icon */}
                                    <button
                                        onClick={() => onSelect(community.id)}
                                        className={cn(
                                            "relative h-12 w-12 flex items-center justify-center transition-all duration-200 ease-in-out overflow-hidden bg-slate-700 hover:bg-primary text-slate-200 hover:text-white",
                                            isActive ? "rounded-[16px] bg-primary text-white" : "rounded-[24px] hover:rounded-[16px]"
                                        )}
                                    >
                                        <Avatar className="h-full w-full rounded-none">
                                            <AvatarImage src={community.iconUrl} className="object-cover" />
                                            <AvatarFallback className="bg-primary/10 text-primary font-medium">
                                                {community.name.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        {/* Unread Badge - Mocked for now, will implement real logic later */}
                                        {community.unreadCount && community.unreadCount > 0 && community.id !== activeId && (
                                            <div className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 border-2 border-background flex items-center justify-center text-[10px] font-bold text-white">
                                                {community.unreadCount > 9 ? '9+' : community.unreadCount}
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="font-semibold bg-black text-white border-none shadow-xl ml-2">
                                {community.name}
                            </TooltipContent>
                        </Tooltip>
                    );
                })}

                {/* Separator */}
                <div className="w-8 h-[2px] bg-slate-700/50 rounded-full mx-auto my-2" />

                {/* Create Button */}
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className="relative group flex items-center justify-center w-full">
                            <button
                                onClick={onCreateCommunity}
                                className="h-12 w-12 flex items-center justify-center rounded-[24px] bg-slate-700 text-green-500 hover:bg-green-600 hover:text-white hover:rounded-[16px] transition-all duration-200 ease-in-out"
                            >
                                <Plus size={24} />
                            </button>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-semibold bg-black text-white border-none shadow-xl ml-2">
                        Create a Community
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    );
}
