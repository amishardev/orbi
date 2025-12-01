
'use client';
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter
} from '@/components/ui/sheet';
import { Button } from '../ui/button';
import { useNotifications } from '@/hooks/use-notifications';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import type { Notification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Heart, MessageCircle, UserPlus } from 'lucide-react';
import Link from 'next/link';

interface NotificationsSheetProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}


function NotificationIcon({ type }: { type: Notification['type'] }) {
    switch (type) {
        case 'reaction':
            return <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1 border-2 border-background"><Heart className="h-3 w-3 text-white" fill="white" /></div>;
        case 'comment':
            return <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1 border-2 border-background"><MessageCircle className="h-3 w-3 text-white" fill="white" /></div>;
        case 'follow':
            return <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-background"><UserPlus className="h-3 w-3 text-white" /></div>;
        default:
            return null;
    }
}

function NotificationItem({ notification }: { notification: Notification }) {
    const targetUrl = notification.type === 'follow'
        ? `/profile/${notification.fromUsername}`
        : `/post/${notification.targetId}`;

    return (
        <Link href={targetUrl} className={cn(
            "block p-4 rounded-lg transition-colors hover:bg-secondary",
            !notification.isRead && "bg-primary/5"
        )}>
            <div className="flex items-start gap-4">
                <div className="relative">
                    <Avatar className="h-12 w-12">
                        <AvatarImage src={notification.fromUserPhotoURL} alt={notification.fromUsername} />
                        <AvatarFallback>{notification.fromUsername[0]}</AvatarFallback>
                    </Avatar>
                    <NotificationIcon type={notification.type} />
                </div>
                <div className="flex-1 pt-1">
                    <p>
                        <span className="font-semibold">{notification.fromUsername}</span>
                        {' '}
                        {notification.message}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        {formatDistanceToNow(notification.timestamp.toDate(), { addSuffix: true })}
                    </p>
                </div>
            </div>
        </Link>
    )
}

function NotificationSkeleton() {
    return (
        <div className="flex items-start gap-4 p-4">
            <Skeleton className="h-12 w-12 rounded-full" />
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-1/4" />
            </div>
        </div>
    )
}

export function NotificationsSheet({ open, onOpenChange }: NotificationsSheetProps) {
    const { notifications, loading, markAllAsRead } = useNotifications();

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent className="flex flex-col p-0">
                <SheetHeader className="p-6 pb-2">
                    <div className="flex justify-between items-center">
                        <SheetTitle>Notifications</SheetTitle>
                        <Button variant="link" size="sm" onClick={markAllAsRead}>
                            Mark all as read
                        </Button>
                    </div>
                </SheetHeader>
                <ScrollArea className="flex-1">
                    <div className="p-4 space-y-2">
                        {loading ? (
                            Array.from({ length: 5 }).map((_, i) => <NotificationSkeleton key={i} />)
                        ) : notifications.length === 0 ? (
                            <div className="text-center py-20 text-muted-foreground">
                                <p>You don't have any notifications yet.</p>
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <NotificationItem key={notif.id} notification={notif} />
                            ))
                        )}
                    </div>
                </ScrollArea>
                <SheetFooter className="p-4 border-t">
                    <Button asChild className="w-full">
                        <Link href="/notifications">View All Notifications</Link>
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}

