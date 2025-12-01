'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Users,
    ShieldAlert,
    FileCheck,
    Flag,
    LogOut,
} from 'lucide-react';
import { Button } from '@/components/ui/button';


const sidebarItems = [
    {
        title: 'Dashboard',
        href: '/admin',
        icon: LayoutDashboard,
    },
    {
        title: 'User Management',
        href: '/admin/users',
        icon: Users,
    },
    {
        title: 'Post Moderation',
        href: '/admin/posts',
        icon: ShieldAlert,
    },
    {
        title: 'Verification Requests',
        href: '/admin/verification',
        icon: FileCheck,
    },
    {
        title: 'Reports',
        href: '/admin/reports',
        icon: Flag,
    },
];

import { signOut } from 'firebase/auth';
import { adminAuth } from '@/lib/admin-login-client';
import { useRouter } from 'next/navigation';

export function AdminSidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        try {
            await signOut(adminAuth);
            router.push('/admin/login');
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    return (
        <div className="flex h-screen w-64 flex-col border-r bg-card">
            <div className="flex h-14 items-center border-b px-6">
                <Link href="/admin" className="flex items-center gap-2 font-semibold">
                    <ShieldAlert className="h-6 w-6" />
                    <span>Admin Portal</span>
                </Link>
            </div>
            <div className="flex-1 overflow-auto py-4">
                <nav className="grid items-start px-4 text-sm font-medium">
                    {sidebarItems.map((item) => (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 transition-all hover:text-primary',
                                pathname === item.href
                                    ? 'bg-muted text-primary'
                                    : 'text-muted-foreground'
                            )}
                        >
                            <item.icon className="h-4 w-4" />
                            {item.title}
                        </Link>
                    ))}
                </nav>
            </div>
            <div className="border-t p-4">
                <Button
                    variant="outline"
                    className="w-full justify-start gap-2"
                    onClick={handleLogout}
                >
                    <LogOut className="h-4 w-4" />
                    Logout
                </Button>
            </div>
        </div>
    );
}
