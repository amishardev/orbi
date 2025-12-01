'use client';

import { useParams, redirect, notFound } from 'next/navigation';
import { useEffect, useState } from 'react';
import { resolveUsername } from '@/lib/username';
import { Skeleton } from '@/components/ui/skeleton';

export default function VanityProfilePage() {
  const params = useParams();
  const username = typeof params.username === 'string' ? params.username : '';
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!username) {
      notFound();
      return;
    }

    const resolveAndRedirect = async () => {
      try {
        const result = await resolveUsername(username);
        
        if (result.error || !result.uid) {
          notFound();
          return;
        }

        // Redirect to the actual profile page
        redirect(`/profile/${username}`);
      } catch (error) {
        console.error('Error resolving vanity URL:', error);
        notFound();
      } finally {
        setLoading(false);
      }
    };

    resolveAndRedirect();
  }, [username]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  return null;
}