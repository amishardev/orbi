
'use client';

import { AppLayout } from '@/components/app-layout';
import { DiscoverSearch } from '@/components/discover/discover-search';

export default function DiscoverPage() {
    return (
        <AppLayout>
            <div className="container mx-auto max-w-4xl py-8 px-4">
                <h1 className="text-3xl font-bold font-headline tracking-tight mb-8">
                    Discover People
                </h1>
                <DiscoverSearch />
            </div>
        </AppLayout>
    );
}
