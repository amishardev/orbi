'use client';

import { useEffect } from 'react';

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { MoreHorizontal, ShieldCheck, UserCheck, Ban, Trash2 } from 'lucide-react';
import { verifyUser, verifyAgent, banUser, deleteUser } from '@/actions/admin-actions';
import { Badge } from '@/components/ui/badge';

interface User {
    uid: string;
    email: string;
    displayName: string;
    photoURL?: string;
    isVerified?: boolean;
    isAgent?: boolean;
    isDisabled?: boolean;
}

interface AdminUserTableProps {
    users: User[];
}

export function AdminUserTable({ users }: AdminUserTableProps) {
    useEffect(() => {
        console.log('[AdminUserTable] Initial Data:', users);
    }, [users]);

    const handleVerifyUser = async (uid: string) => {
        await verifyUser(uid);
    };

    const handleVerifyAgent = async (uid: string) => {
        await verifyAgent(uid);
    };

    const handleBanUser = async (uid: string) => {
        if (confirm('Are you sure you want to ban this user?')) {
            await banUser(uid);
        }
    };

    const handleDeleteUser = async (uid: string) => {
        if (confirm('Are you sure you want to PERMANENTLY delete this user? This cannot be undone.')) {
            await deleteUser(uid);
        }
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">Avatar</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Verified</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {users.map((user) => (
                        <TableRow key={user.uid}>
                            <TableCell>
                                <Avatar>
                                    <AvatarImage src={user.photoURL} alt={user.displayName} />
                                    <AvatarFallback>{user.displayName?.charAt(0)}</AvatarFallback>
                                </Avatar>
                            </TableCell>
                            <TableCell className="font-medium">
                                <div className="flex flex-col">
                                    <span>{user.displayName}</span>
                                    {user.isAgent && (
                                        <span className="text-xs text-green-600 font-semibold flex items-center gap-1">
                                            <UserCheck className="h-3 w-3" /> Agent
                                        </span>
                                    )}
                                </div>
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                                {user.isDisabled ? (
                                    <Badge variant="destructive">Banned</Badge>
                                ) : (
                                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                                )}
                            </TableCell>
                            <TableCell>
                                {user.isVerified ? (
                                    <Badge variant="secondary" className="bg-blue-50 text-blue-700 border-blue-200">
                                        <ShieldCheck className="mr-1 h-3 w-3" /> Verified
                                    </Badge>
                                ) : (
                                    <span className="text-muted-foreground text-sm">-</span>
                                )}
                            </TableCell>
                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                            <span className="sr-only">Open menu</span>
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                        <DropdownMenuItem onClick={() => handleVerifyUser(user.uid)}>
                                            <ShieldCheck className="mr-2 h-4 w-4" /> Verify User
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleVerifyAgent(user.uid)}>
                                            <UserCheck className="mr-2 h-4 w-4" /> Verify Agent
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => handleBanUser(user.uid)} className="text-red-600">
                                            <Ban className="mr-2 h-4 w-4" /> Disable Account
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDeleteUser(user.uid)} className="text-red-600">
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Account
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}
