'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Home, Search, Plus, Bell, User, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
// Wait, the user said "Opens CreatePostModal". I might need to create this if it doesn't exist, 
// or use the existing CreatePost component in a modal.
// For now I'll assume I need to create a wrapper or use a state to show it.
// Actually, I'll check if CreatePostModal exists. If not, I'll create it. 
// But first let's stick to the plan.

// I will use a placeholder for CreatePostModal trigger for now and implement the modal if needed.
// Or better, I'll implement the logic to open it.

import { useChat } from '@/hooks/use-chat'; // For unread count if available, or use a mock/context
import { useUnreadCounts } from '@/hooks/use-unread-counts';

import { CreatePostModal } from '@/components/create-post-modal';

export function MobileNavBar() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const chatId = searchParams.get('chatId');
    const { userData } = useAuth();
    const { totalUnreadCount } = useChat();
    const { notificationCount } = useUnreadCounts();
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // Hide on chat room pages (both route based and query param based)
    if ((pathname.startsWith('/messages/') && pathname !== '/messages') ||
        (pathname === '/messages' && chatId) ||
        pathname.startsWith('/communities/')) {
        return null;
    }

    const navItems = [
        { href: '/home', icon: Home, label: 'Home' },
        { href: '/messages', icon: MessageSquare, label: 'Inbox' },
        { type: 'create', icon: Plus, label: 'Create' },
        { href: '/notifications', icon: Bell, label: 'Notifications', badge: notificationCount > 0, count: notificationCount },
        { href: userData?.username ? `/profile/${userData.username}` : '#', icon: User, label: 'Profile' },
    ];

    return (
        <>
            <div className="fixed bottom-0 left-0 right-0 h-16 bg-slate-950/90 backdrop-blur-lg border-t border-slate-800 z-50 pb-[env(safe-area-inset-bottom)] md:hidden">
                <div className="flex items-center justify-around h-full px-2">
                    {navItems.map((item, index) => {
                        if (item.type === 'create') {
                            return (
                                <div key={index} className="relative -top-5">
                                    <Button
                                        size="icon"
                                        className="h-14 w-14 rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 border-4 border-slate-950"
                                        onClick={() => setIsCreateModalOpen(true)}
                                    >
                                        <Plus className="h-8 w-8 text-white" />
                                    </Button>
                                </div>
                            );
                        }

                        const Icon = item.icon;
                        const isActive = item.href === '/home'
                            ? pathname === '/home'
                            : item.href !== '#' && pathname.startsWith(item.href!);

                        return (
                            <Link
                                key={index}
                                href={item.href!}
                                className={cn(
                                    "flex flex-col items-center justify-center w-full h-full gap-1 transition-colors relative",
                                    isActive ? "text-white" : "text-slate-500 hover:text-slate-400"
                                )}
                            >
                                <div className="relative">
                                    <Icon
                                        className={cn(
                                            "h-6 w-6",
                                            isActive && "fill-current",
                                            // Fill the Bell icon if it's the notification tab and has unread items
                                            item.label === 'Notifications' && (item as any).count > 0 && "fill-current text-white"
                                        )}
                                        strokeWidth={isActive ? 2.5 : 2}
                                    />
                                    {item.badge && (
                                        <span className="absolute -top-1 -right-1 translate-x-1/3 -translate-y-1/3 flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 px-1 border-2 border-slate-950 shadow-sm z-10">
                                            {(item as any).count > 9 ? '9+' : (item as any).count || ''}
                                        </span>
                                    )}
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
            <CreatePostModal open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen} />
        </>
    );
}
