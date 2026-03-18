import React, { useMemo } from 'react';
import { useSynapse } from '../context/SynapseContext';
import BrainRotApp from "./brainrot_module/BrainRotApp";

export const BrainRot: React.FC = () => {
    const { socialPosts } = useSynapse();

    // Filter posts for BrainRot feed
    // We prioritize 'slop', 'art', and 'aspect' types, or just use resonance sorting
    const brainRotPosts = useMemo(() => {
        // Simple resonance sort for now
        return [...socialPosts].sort((a, b) => b.resonance - a.resonance);
    }, [socialPosts]);

    return (
        <div className="h-full w-full bg-black">
            <BrainRotApp initialPosts={brainRotPosts} />
        </div>
    );
};



