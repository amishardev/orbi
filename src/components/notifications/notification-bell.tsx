
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Bell } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { NotificationsSheet } from './notifications-sheet';
import { useNotifications } from '@/hooks/use-notifications';

export function NotificationBell() {
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    const { unreadCount } = useNotifications();

    return (
        <>
            <Button variant="ghost" size="icon" className="relative" onClick={() => setIsSheetOpen(true)}>
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                    <Badge variant="destructive" className="absolute -top-1 -right-1 h-5 w-5 justify-center rounded-full p-0">
                        {unreadCount}
                    </Badge>
                )}
            </Button>
            <NotificationsSheet open={isSheetOpen} onOpenChange={setIsSheetOpen} />
        </>
    )
}

    