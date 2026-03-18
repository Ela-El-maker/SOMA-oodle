import React, { useState, useMemo } from 'react';
import SignalFeed from './SignalFeed';
import SignalWatch from './SignalWatch';
import { useSynapse } from '../../context/SynapseContext';

export default function SignalApp() {
    const { socialPosts } = useSynapse();
    const [currentVideoId, setCurrentVideoId] = useState<string | null>(null);

    // Derived State
    const currentVideo = useMemo(() => socialPosts.find(p => p.id === currentVideoId), [socialPosts, currentVideoId]);
    const recommended = useMemo(() => socialPosts.filter(p => p.id !== currentVideoId), [socialPosts, currentVideoId]);

    // Handlers
    const handleVideoClick = (id: string) => {
        setCurrentVideoId(id);
        window.scrollTo(0, 0);
    };

    return (
        <div className="flex flex-col min-h-screen bg-[#060607] text-[#e0e0e0] font-sans selection:bg-[#5eead4]/30 pb-32 pt-16">
            <div className="flex flex-1 relative px-6 md:px-10">
                <main className="flex-1 w-full">
                    {currentVideoId && currentVideo ? (
                        <SignalWatch
                            video={currentVideo}
                            recommended={recommended}
                            onVideoClick={handleVideoClick}
                        />
                    ) : (
                        <SignalFeed
                            videos={socialPosts}
                            onVideoClick={handleVideoClick}
                            sidebarOpen={false}
                        />
                    )}
                </main>
            </div>
        </div>
    );
}



