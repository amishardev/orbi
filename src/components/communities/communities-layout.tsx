'use client';

import React, { useState, useEffect } from 'react';
import { ServerRail } from './server-rail';
import { CommunityInfoPanel } from './community-info-panel';
import { ChatArea } from './chat-area';
import { CreateCommunityModal } from './create-community-modal';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/use-auth';
import { collection, query, where, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import type { Community } from '@/lib/types';

export function CommunitiesLayout() {
    const { authUser } = useAuth();
    const [communities, setCommunities] = useState<Community[]>([]);
    const [activeCommunityId, setActiveCommunityId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);

    useEffect(() => {
        if (!authUser) return;

        // Listen for communities where the user is a member
        const q = query(
            collection(db, 'communities'),
            where('members', 'array-contains', authUser.uid)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const communitiesData = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as Community[];

            setCommunities(communitiesData);

            // Select first community if none selected and communities exist
            if (!activeCommunityId && communitiesData.length > 0) {
                setActiveCommunityId(communitiesData[0].id);
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, [authUser, activeCommunityId]);

    const activeCommunity = communities.find(c => c.id === activeCommunityId) || null;

    if (!authUser) return null;

    return (
        <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background">
            {/* Left Sidebar - Server Rail */}
            <ServerRail
                communities={communities}
                activeId={activeCommunityId}
                onSelect={setActiveCommunityId}
                onCreateCommunity={() => setIsCreateModalOpen(true)}
            />

            {/* Main Content Area */}
            <div className="flex-1 flex relative min-w-0">
                {/* Chat Area */}
                <div className="flex-1 flex flex-col min-w-0 bg-background z-0">
                    {activeCommunity ? (
                        <ChatArea
                            community={activeCommunity}
                            isInfoPanelOpen={isInfoPanelOpen}
                            onToggleInfoPanel={() => setIsInfoPanelOpen(!isInfoPanelOpen)}
                        />
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-muted-foreground">
                            <div className="text-center">
                                <h3 className="text-lg font-semibold mb-2">Welcome to Communities</h3>
                                <p>Join or create a community to start chatting!</p>
                                <Button
                                    className="mt-4"
                                    onClick={() => setIsCreateModalOpen(true)}
                                >
                                    Create Community
                                </Button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Right Panel - Info Drawer (Side-by-Side) */}
                {activeCommunity && (
                    <CommunityInfoPanel
                        community={activeCommunity}
                        isOpen={isInfoPanelOpen}
                        onClose={() => setIsInfoPanelOpen(false)}
                    />
                )}
            </div>

            <CreateCommunityModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
            />
        </div>
    );
}
