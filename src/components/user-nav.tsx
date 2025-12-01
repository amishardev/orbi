
'use client';

import Link from 'next/link';
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
} from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/use-auth';
import { PanelLeft, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { ModeToggle } from './mode-toggle';

export function UserNav({ onSheetOpenChange }: { onSheetOpenChange: (open: boolean) => void }) {
    const { authUser, userData, signOut } = useAuth();

    const showMobileNavToggle = !authUser || !userData;

    return (
        <div className='flex items-center gap-4'>
            <div className="md:hidden">
                <Button variant="ghost" size="icon" onClick={() => onSheetOpenChange(true)}>
                    <PanelLeft className="h-6 w-6" />
                    <span className="sr-only">Toggle navigation menu</span>
                </Button>
            </div>
            {authUser && userData && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="relative h-12 w-12 rounded-full">
                            <Avatar className="h-12 w-12">
                                <AvatarImage
                                    src={userData.photoURL}
                                    alt={`Avatar of ${userData.displayName}`}
                                />
                                <AvatarFallback>
                                    {userData.displayName
                                        ?.split(' ')
                                        .map(n => n[0])
                                        .join('')}
                                </AvatarFallback>
                            </Avatar>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56" align="end" forceMount>
                        <DropdownMenuLabel className="font-normal">
                            <div className="flex flex-col space-y-1">
                                <p className="text-sm font-medium leading-none">{userData.displayName}</p>
                                <p className="text-xs leading-none text-muted-foreground">
                                    {userData.email}
                                </p>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuGroup>
                            <DropdownMenuItem asChild disabled={!userData.username}>
                                <Link href={userData.username ? `/profile/${userData.username}` : '#'}>
                                    <UserIcon className="mr-2 h-4 w-4" />
                                    My Profile
                                </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                                <Link href="/settings">
                                    <Settings className="mr-2 h-4 w-4" />
                                    Settings
                                </Link>
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                        <DropdownMenuSeparator />
                        <ModeToggle />
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={signOut}>
                            <LogOut className="mr-2 h-4 w-4" />
                            Log out
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </div>
    );
}
