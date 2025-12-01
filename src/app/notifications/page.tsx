
'use client';

import { AppLayout } from '@/components/app-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNotifications } from '@/hooks/use-notifications';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import type { Notification } from '@/lib/types';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { Heart, MessageCircle, UserPlus } from 'lucide-react';

function NotificationIcon({ type }: { type: Notification['type'] }) {
    switch (type) {
        case 'reaction':
            return <div className="absolute -bottom-1 -right-1 bg-red-500 rounded-full p-1 border-2 border-card"><Heart className="h-3 w-3 text-white" fill="white" /></div>;
        case 'comment':
            return <div className="absolute -bottom-1 -right-1 bg-blue-500 rounded-full p-1 border-2 border-card"><MessageCircle className="h-3 w-3 text-white" fill="white" /></div>;
        case 'follow':
            return <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-1 border-2 border-card"><UserPlus className="h-3 w-3 text-white" /></div>;
        default:
            return null;
    }
}

function NotificationItem({ notification }: { notification: Notification }) {
    return (
        <div className={cn(
            "flex items-start gap-4 p-4 rounded-lg transition-colors",
            !notification.isRead && "bg-primary/5"
        )}>
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
    )
}

export default function NotificationsPage() {
    const { notifications, loading } = useNotifications();

    return (
        <AppLayout>
            <div className="container mx-auto max-w-2xl py-8 px-4">
                <h1 className="text-3xl font-bold font-headline tracking-tight mb-8">
                    Notifications
                </h1>
                <Card>
                    <CardHeader>
                        <CardTitle>Your Notifications</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <p>Loading notifications...</p>
                        ) : notifications.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground">
                                <p>You don't have any notifications yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {notifications.map(notif => (
                                    <NotificationItem key={notif.id} notification={notif} />
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

