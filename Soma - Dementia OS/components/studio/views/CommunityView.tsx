import * as React from 'react';
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Search, UserPlus, X, MapPin, Zap, ArrowLeft, ArrowUpRight } from 'lucide-react';
import { UserProfile } from '../../../types';

interface Props {
    currentUser: UserProfile;
    onBack?: () => void;
}

type TabType = 'friends' | 'followers' | 'following';

interface SocialUser {
    id: string;
    username: string;
    handle: string;
    avatar: string;
    isVerified?: boolean;
    status?: string;
    location?: string;
    interests?: string[];
}

const CommunityView: React.FC<Props> = ({ currentUser, onBack }) => {
    const [activeTab, setActiveTab] = useState<TabType>('followers');
    const [searchQuery, setSearchQuery] = useState('');

    // Mock Data
    const DATA: Record<TabType, SocialUser[]> = {
        friends: [
            { id: '1', username: 'unimaginative_artist', handle: 'unimaginative_artist', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100' },
            { id: '2', username: 'esperanzagallery', handle: 'esperanza_art', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100' },
        ],
        followers: [
            { id: '3', username: 'shaad__ansari___100k', handle: 'shad_Ansari_009', avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=100' },
            { id: '4', username: 'swooshidden', handle: 'jay +', avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100' },
            { id: '5', username: 'animalpower3008', handle: 'Myna Meis Noname', avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100' },
            { id: '6', username: 'pleinairbigbear', handle: 'Big Bear Plein Air', avatar: 'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?w=100' },
            { id: '7', username: 'joshmcf888', handle: 'Joshua P. McFall', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100' },
            { id: '8', username: 'montelyons', handle: 'Monte Lyons', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100' },
        ],
        following: [
            { id: '9', username: 'goldmom_art', handle: 'goldmom_art', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100' },
        ]
    };

    // Algorithm Recommendations
    // Filters based on shared location (from UserProfile) or random 'interests' match
    const SUGGESTIONS: SocialUser[] = [
        { id: 's1', username: 'neon_tokyo_design', handle: 'design_lab', avatar: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=100', location: 'Tokyo, JP', interests: ['Design', 'WebGL'] },
        { id: 's2', username: 'cyber_kafka', handle: 'franz_digital', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100', location: 'Berlin, DE', interests: ['Philosophy', 'AI'] },
        { id: 's3', username: 'local_glitch', handle: 'glitch_artist', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100', location: 'Tokyo, JP', interests: ['Glitch', 'Art'] },
    ];

    // Filter algorithm: Prioritize users in same location
    const matchedSuggestions = SUGGESTIONS.sort((a, b) => {
        if (a.location === currentUser.location) return -1;
        if (b.location === currentUser.location) return 1;
        return 0;
    });

    const categories = [
        { id: 'c1', title: "People you don't follow back", subtitle: "esperanzagalleryrb and 112 others", avatar: DATA.friends[1].avatar },
        { id: 'c2', title: "Deactivated accounts", subtitle: "goldmom_art", avatar: null },
    ];

    return (
        <div className="min-h-screen bg-black text-white flex flex-col font-sans pb-24">
            
            {/* Header */}
            <div className="sticky top-0 bg-black/90 backdrop-blur-md z-50 pt-12 pb-2 px-4 border-b border-white/5">
                <div className="flex items-center justify-between mb-4">
                     {onBack && (
                        <button onClick={onBack} className="p-2 -ml-2 text-white/70 hover:text-white">
                            <ArrowLeft />
                        </button>
                    )}
                    <h1 className="text-lg font-bold mx-auto">{currentUser.name.toLowerCase().replace(' ', '_')}</h1>
                    <button className="p-2 text-white/70 hover:text-white">
                        <UserPlus size={22} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center justify-center gap-8 text-sm font-medium border-b border-white/10">
                    {(['friends', 'followers', 'following'] as TabType[]).map((tab) => {
                        const count = 
                            tab === 'friends' ? 51 : 
                            tab === 'followers' ? 164 : 
                            tab === 'following' ? 85 : 0;
                            
                        return (
                            <button 
                                key={tab}
                                onClick={() => setActiveTab(tab)}
                                className={`pb-3 px-1 relative capitalize ${activeTab === tab ? 'text-white' : 'text-white/40'}`}
                            >
                                {count > 0 && <span className="mr-1">{count}</span>}
                                {tab}
                                {activeTab === tab && (
                                    <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Search */}
            <div className="px-4 py-3">
                <div className="relative bg-[#262626] rounded-xl overflow-hidden">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input 
                        type="text" 
                        placeholder="Search" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-transparent py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none placeholder:text-white/40"
                    />
                </div>
            </div>

            {/* Categories (Only on Followers/Following) */}
            {activeTab === 'followers' && !searchQuery && (
                <div className="px-4 mb-6">
                    <h3 className="text-sm font-bold mb-3">Categories</h3>
                    <div className="space-y-4">
                        {categories.map(cat => (
                             <div key={cat.id} className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/5">
                                    {cat.avatar ? (
                                        <div className="grid grid-cols-2 w-full h-full">
                                            <img src={cat.avatar} className="w-full h-full object-cover" />
                                            <div className="bg-white/5 w-full h-full"></div>
                                        </div>
                                    ) : (
                                        <div className="w-full h-full bg-[#1A1A1A]"></div>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-sm font-medium">{cat.title}</span>
                                    <span className="text-xs text-white/50">{cat.subtitle}</span>
                                </div>
                             </div>
                        ))}
                    </div>
                </div>
            )}

            {/* List */}
            <div className="flex-1 px-4 space-y-4">
                <h3 className="text-sm font-bold mb-2">All {activeTab}</h3>
                {DATA[activeTab].map((user) => (
                    <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <img src={user.avatar} className="w-12 h-12 rounded-full object-cover bg-white/10" />
                            <div className="flex flex-col">
                                <span className="text-sm font-semibold">{user.username}</span>
                                <span className="text-xs text-white/50">{user.handle}</span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                            <button 
                                className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors
                                    ${activeTab === 'friends' || activeTab === 'following' 
                                        ? 'bg-[#262626] text-white' 
                                        : 'bg-blue-600 text-white'}
                                `}
                            >
                                {activeTab === 'friends' || activeTab === 'following' ? 'Message' : 'Follow back'}
                            </button>
                            <button className="text-white/40 hover:text-white">
                                <X size={16} />
                            </button>
                        </div>
                    </div>
                ))}
                {DATA[activeTab].length === 0 && (
                    <div className="py-8 text-center text-white/40 text-sm">
                        No {activeTab} found.
                    </div>
                )}
            </div>

            {/* Find People Algorithm Section */}
            <div className="mt-8 px-4 border-t border-white/10 pt-6">
                 <div className="flex items-center gap-2 mb-4">
                    <Zap className="text-yellow-400" size={16} />
                    <h3 className="text-sm font-bold">Find people to follow</h3>
                 </div>
                 <p className="text-xs text-white/50 mb-4">
                    Based on your location ({currentUser.location}) and interests.
                 </p>
                 
                 <div className="space-y-4 pb-8">
                     {matchedSuggestions.map(user => (
                         <div key={user.id} className="flex items-center justify-between bg-white/5 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3">
                                <img src={user.avatar} className="w-10 h-10 rounded-full object-cover" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-semibold">{user.username}</span>
                                    <div className="flex items-center gap-2">
                                         {user.location === currentUser.location && (
                                            <span className="flex items-center gap-1 text-[10px] text-green-400 bg-green-400/10 px-1.5 py-0.5 rounded">
                                                <MapPin size={8} /> Nearby
                                            </span>
                                         )}
                                         <span className="text-[10px] text-white/40">{user.interests?.join(', ')}</span>
                                    </div>
                                </div>
                            </div>
                            <button className="p-2 bg-white text-black rounded-full hover:scale-110 transition-transform">
                                <ArrowUpRight size={16} />
                            </button>
                         </div>
                     ))}
                 </div>
                 
                 <button className="w-full py-3 bg-[#262626] text-white text-sm font-semibold rounded-xl">
                     See all suggestions
                 </button>
            </div>
        </div>
    );
};

export default CommunityView;




