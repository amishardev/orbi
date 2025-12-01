
'use client';

import { AppLayout } from '@/components/app-layout';
import { SettingsForm } from '@/components/settings/settings-form';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

export default function SettingsPage() {
    const { userData, loading } = useAuth();

    return (
        <AppLayout>
            <div className="container mx-auto max-w-4xl py-8 px-4">
                <h1 className="text-3xl font-bold font-headline tracking-tight mb-8">
                    Settings
                </h1>
                <Card>
                    <CardHeader>
                        <CardTitle>Profile Information</CardTitle>
                        <CardDescription>Update your personal details here.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading || !userData ? (
                           <div className="space-y-6">
                               <Skeleton className="h-10 w-full" />
                               <Skeleton className="h-10 w-full" />
                               <Skeleton className="h-20 w-full" />
                               <Skeleton className="h-10 w-32" />
                           </div>
                        ) : (
                           <SettingsForm currentUserData={userData} />
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}
