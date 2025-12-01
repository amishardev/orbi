import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    // Only run on /admin routes
    if (request.nextUrl.pathname.startsWith('/admin')) {
        // Allow access to login page
        if (request.nextUrl.pathname === '/admin/login') {
            return NextResponse.next();
        }

        // For other admin routes, we rely on the Client-Side Auth Guard in layout.tsx
        // because we are using a separate Firebase project for Auth which doesn't share
        // cookies with the main domain easily in this setup without custom cookie management.
        // The Layout will redirect to /admin/login if not authenticated.
    }

    return NextResponse.next();
}

export const config = {
    matcher: '/admin/:path*',
};
