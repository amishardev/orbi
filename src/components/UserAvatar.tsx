import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

interface UserAvatarProps {
    user: {
        displayName?: string;
        photoURL?: string;
        isVerified?: boolean;
        isAgent?: boolean;
    };
    className?: string;
    showBadges?: boolean;
}

export function UserAvatar({ user, className, showBadges = false }: UserAvatarProps) {
    const fallback = user.displayName
        ? user.displayName.split(' ').map((n) => n[0]).join('')
        : 'U';

    return (
        <div className="relative inline-block">
            <Avatar className={className}>
                <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />
                <AvatarFallback>{fallback}</AvatarFallback>
            </Avatar>
            {showBadges && (
                <div className="absolute -bottom-1 -right-1 flex gap-0.5">
                    {user.isVerified && (
                        <BadgeCheck className="h-4 w-4 text-blue-500 bg-white rounded-full" fill="currentColor" />
                    )}
                    {user.isAgent && (
                        <BadgeCheck className="h-4 w-4 text-green-500 bg-white rounded-full" fill="currentColor" />
                    )}
                </div>
            )}
        </div>
    );
}
