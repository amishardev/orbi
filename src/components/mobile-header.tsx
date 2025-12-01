'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useUnreadCounts } from '@/hooks/use-unread-counts';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export function MobileHeader() {
    const pathname = usePathname();
    const router = useRouter();
    const { userData } = useAuth();
    const { messageCount } = useUnreadCounts();

    // Hide on chat room pages as they have their own headers
    // Also hide on desktop
    if (pathname.startsWith('/messages/') && pathname !== '/messages' || pathname.startsWith('/communities/')) {
        return null;
    }

    const isHome = pathname === '/home';
    const showBackButton = !isHome;

    return (
        <header className="fixed top-0 left-0 right-0 z-40 h-14 px-4 flex items-center justify-between bg-slate-950/80 backdrop-blur-md border-b border-slate-800 md:hidden">
            {/* Left Action */}
            <div className="w-8 flex justify-start">
                {showBackButton && (
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 -ml-2"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                )}
            </div>

            {/* Center Logo */}
            <div className="absolute left-1/2 -translate-x-1/2">
                <span className="text-xl font-bold font-headline bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                    Orbi
                </span>
            </div>

            {/* Right Action - Empty for now */}
            <div className="w-8 flex justify-end">
            </div>
        </header>
    );
}
