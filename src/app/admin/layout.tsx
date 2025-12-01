'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged } from 'firebase/auth';
import { adminAuth } from '@/lib/admin-login-client';
import { AdminSidebar } from '@/components/admin/AdminSidebar';
import { Loader2 } from 'lucide-react';

export default function AdminLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [loading, setLoading] = useState(true);
    const [authorized, setAuthorized] = useState(false);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        // Skip check for login page to avoid loop
        if (pathname === '/admin/login') {
            setLoading(false);
            setAuthorized(true);
            return;
        }

        const unsubscribe = onAuthStateChanged(adminAuth, (user) => {
            if (user) {
                setAuthorized(true);
            } else {
                setAuthorized(false);
                router.push('/admin/login');
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [pathname, router]);

    if (loading) {
        return (
            <div className="flex h-screen w-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    // If on login page, render children (the login form) without sidebar
    if (pathname === '/admin/login') {
        return <>{children}</>;
    }

    if (!authorized) {
        return null; // Will redirect
    }

    return (
        <div className="flex h-screen w-full bg-muted/40">
            <AdminSidebar />
            <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14 w-full">
                <main className="grid flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 overflow-auto">
                    {children}
                </main>
            </div>
        </div>
    );
}
