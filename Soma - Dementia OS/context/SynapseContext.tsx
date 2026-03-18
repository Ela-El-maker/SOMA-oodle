import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { NetworkNode, FuseChat, UserConfig, UserStatus, Message, SocialPost, LearningResource, Playlist, FluxPost, ViewMode, Mind, SynapseChat, WidgetData } from '../types';

// Initial Data Seed
const INITIAL_USER_CONFIG: UserConfig = {
    username: 'User_8842',
    displayName: 'Traveler',
    bio: 'Exploring the digital frontier.',
    manifesto: 'I create. I think. I develop.',
    avatarUrl: '',
    bannerUrl: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5986?q=80&w=2000&auto=format&fit=crop',
    location: 'Tokyo, JP',
    timezone: 'UTC+9',
    status: 'online',
    notifications: true,
    stealthMode: false,
    accentColor: '#10b981'
};

const INITIAL_WIDGETS: WidgetData[] = [
    { id: 'w-profile', type: 'PROFILE', title: 'User', colSpan: 1, rowSpan: 2 },
    { id: 'w-art', type: 'ART_DISPLAY', title: 'Featured', colSpan: 2, rowSpan: 1 },
    { id: 'w-stats', type: 'STATS', title: 'Top 8', colSpan: 1, rowSpan: 1 },
    { id: 'w-ecosystem', type: 'ECOSYSTEM', title: 'Apps', colSpan: 1, rowSpan: 1 },
    { id: 'w-signal', type: 'SIGNAL', title: 'Status', colSpan: 1, rowSpan: 1 },
    { id: 'w-hub', type: 'HUB_FEED', title: 'Activity', colSpan: 1, rowSpan: 2 },
    { id: 'w-gallery', type: 'GALLERY', title: 'Messages', colSpan: 2, rowSpan: 2 },
    { id: 'w-assistant', type: 'ASSISTANT', title: 'AI', colSpan: 1, rowSpan: 1 },
];

const INITIAL_NETWORKS: NetworkNode[] = [
    {
        id: 'net-synapse',
        name: 'Synapse Mainnet',
        icon: '◈',
        color: 'bg-white text-black',
        channels: [
            {
                id: 'c-general', name: 'general', type: 'text', isPublic: false, messages: [
                    { id: 'm1', role: 'user', senderName: 'System', content: 'Welcome to Chatter.', timestamp: Date.now() }
                ]
            },
            { id: 'c-announcements', name: 'announcements', type: 'announcement', isPublic: true, messages: [] },
            {
                id: 'c-guest', name: 'public-guest-lobby', type: 'text', isPublic: true, messages: [
                    { id: 'm2', role: 'guest', senderName: 'Guest_99', content: 'Is this the entry point?', timestamp: Date.now() - 50000 },
                    { id: 'm3', role: 'user', senderName: 'Admin', content: 'Yes, scan the QR code to bridge in.', timestamp: Date.now() - 20000 }
                ]
            }
        ]
    }
];

const INITIAL_FUSE: FuseChat[] = [
    {
        id: 's1',
        peerName: 'SOMA_CORE',
        messages: [],
        lastActive: Date.now(),
        defaultTtl: 0,
        isConnected: true
    }
];

const INITIAL_SOMA_DM: Message[] = [];
const INITIAL_POSTS: SocialPost[] = [
    {
        id: 'sp1',
        author: 'NeoArchitect',
        type: 'art',
        mediaUrl: 'https://images.unsplash.com/photo-1614850523060-8da1d56ae167?w=800',
        caption: 'Metropolis expansion phase 4.',
        likes: 1240,
        comments: 42,
        resonance: 88,
        timestamp: Date.now() - 1000000,
        aiConfidence: 0.98,
        aiTag: 'AI'
    }
];
const INITIAL_FLUX: FluxPost[] = [];
const INITIAL_RESOURCES: LearningResource[] = [];
const INITIAL_PLAYLISTS: Playlist[] = [];
const INITIAL_MINDS: Mind[] = [];

interface SynapseContextType {
    activeView: ViewMode;
    setActiveView: (view: ViewMode) => void;
    isSettingsOpen: boolean;
    toggleSettings: (open: boolean) => void;
    profileFocus: string | null;
    setProfileFocus: (id: string | null) => void;
    chatterFocus: { networkId?: string, channelId?: string } | null;
    setChatterFocus: (focus: { networkId?: string, channelId?: string } | null) => void;
    isSidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;

    userConfig: UserConfig;
    updateUserConfig: (updates: Partial<UserConfig>) => void;

    networks: NetworkNode[];
    setNetworks: (networks: NetworkNode[]) => void;
    addNetwork: (network: NetworkNode) => void;
    ensureChatterSpace: (id: string, name: string, icon?: string) => NetworkNode;

    fuseChats: FuseChat[];
    setFuseChats: (chats: FuseChat[]) => void;
    addFuseChat: (chat: FuseChat) => void;
    createOrGetDirectChat: (peerName: string) => FuseChat;

    somaDMThread: Message[];
    setSomaDMThread: (msgs: Message[]) => void;

    socialPosts: SocialPost[];
    setSocialPosts: (posts: SocialPost[]) => void;

    fluxPosts: FluxPost[];
    setFluxPosts: (posts: FluxPost[]) => void;
    addFluxPost: (post: FluxPost) => void;

    learningResources: LearningResource[];
    setLearningResources: (res: LearningResource[]) => void;
    addLearningResource: (res: LearningResource) => void;

    playlists: Playlist[];
    setPlaylists: (pl: Playlist[]) => void;
    addToPlaylist: (playlistId: string, postId: string) => void;
    createPlaylist: (name: string) => void;

    minds: Mind[];
    setMinds: (minds: Mind[]) => void;

    synapseChats: SynapseChat[];
    setSynapseChats: (chats: SynapseChat[]) => void;
    activeSynapseChatId: string | null;
    setActiveSynapseChatId: (id: string | null) => void;

    widgets: WidgetData[];
    setWidgets: (widgets: WidgetData[]) => void;
    updateWidget: (id: string, updates: Partial<WidgetData>) => void;
    removeWidget: (id: string) => void;
    addWidget: (widget: WidgetData) => void;
}

const SynapseContext = createContext<SynapseContextType | undefined>(undefined);

export const SynapseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [activeView, setActiveView] = useState<ViewMode>(ViewMode.LANDING);
    const [isSettingsOpen, toggleSettings] = useState(false);
    const [profileFocus, setProfileFocus] = useState<string | null>(null);
    const [chatterFocus, setChatterFocus] = useState<{ networkId?: string, channelId?: string } | null>(null);
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const [userConfig, setUserConfigState] = useState<UserConfig>(() => {
        const saved = localStorage.getItem('synapse_user_config');
        return saved ? JSON.parse(saved) : INITIAL_USER_CONFIG;
    });

    const [networks, setNetworksState] = useState<NetworkNode[]>(() => {
        const saved = localStorage.getItem('synapse_networks');
        return saved ? JSON.parse(saved) : INITIAL_NETWORKS;
    });

    const [fuseChats, setFuseChatsState] = useState<FuseChat[]>(() => {
        const saved = localStorage.getItem('synapse_fuse');
        return saved ? JSON.parse(saved) : INITIAL_FUSE;
    });

    const [somaDMThread, setSomaDMThreadState] = useState<Message[]>(() => {
        const saved = localStorage.getItem('synapse_soma_dm');
        return saved ? JSON.parse(saved) : INITIAL_SOMA_DM;
    });

    const [socialPosts, setSocialPostsState] = useState<SocialPost[]>(() => {
        const saved = localStorage.getItem('synapse_posts');
        return saved ? JSON.parse(saved) : INITIAL_POSTS;
    });

    const [fluxPosts, setFluxPostsState] = useState<FluxPost[]>(() => {
        const saved = localStorage.getItem('synapse_flux');
        return saved ? JSON.parse(saved) : INITIAL_FLUX;
    });

    const [learningResources, setLearningResourcesState] = useState<LearningResource[]>(() => {
        const saved = localStorage.getItem('synapse_resources');
        return saved ? JSON.parse(saved) : INITIAL_RESOURCES;
    });

    const [playlists, setPlaylistsState] = useState<Playlist[]>(() => {
        const saved = localStorage.getItem('synapse_playlists');
        return saved ? JSON.parse(saved) : INITIAL_PLAYLISTS;
    });

    const [minds, setMindsState] = useState<Mind[]>(() => {
        const saved = localStorage.getItem('synapse_minds');
        return saved ? JSON.parse(saved) : INITIAL_MINDS;
    });

    const [widgets, setWidgetsState] = useState<WidgetData[]>(() => {
        const saved = localStorage.getItem('synapse_widgets');
        return saved ? JSON.parse(saved) : INITIAL_WIDGETS;
    });

    const [synapseChats, setSynapseChatsState] = useState<SynapseChat[]>(() => {
        const saved = localStorage.getItem('synapse_chat_history');
        return saved ? JSON.parse(saved) : [];
    });

    const [activeSynapseChatId, setActiveSynapseChatId] = useState<string | null>(null);

    // -- Persistence Effects --
    useEffect(() => { localStorage.setItem('synapse_user_config', JSON.stringify(userConfig)); }, [userConfig]);
    useEffect(() => { localStorage.setItem('synapse_networks', JSON.stringify(networks)); }, [networks]);
    useEffect(() => { localStorage.setItem('synapse_fuse', JSON.stringify(fuseChats)); }, [fuseChats]);
    useEffect(() => { localStorage.setItem('synapse_soma_dm', JSON.stringify(somaDMThread)); }, [somaDMThread]);
    useEffect(() => { localStorage.setItem('synapse_posts', JSON.stringify(socialPosts)); }, [socialPosts]);
    useEffect(() => { localStorage.setItem('synapse_flux', JSON.stringify(fluxPosts)); }, [fluxPosts]);
    useEffect(() => { localStorage.setItem('synapse_resources', JSON.stringify(learningResources)); }, [learningResources]);
    useEffect(() => { localStorage.setItem('synapse_playlists', JSON.stringify(playlists)); }, [playlists]);
    useEffect(() => { localStorage.setItem('synapse_minds', JSON.stringify(minds)); }, [minds]);
    useEffect(() => { localStorage.setItem('synapse_widgets', JSON.stringify(widgets)); }, [widgets]);
    useEffect(() => { localStorage.setItem('synapse_chat_history', JSON.stringify(synapseChats)); }, [synapseChats]);


    // -- Actions --
    const updateUserConfig = (updates: Partial<UserConfig>) => setUserConfigState(prev => ({ ...prev, ...updates }));
    const setNetworks = (newNetworks: NetworkNode[]) => setNetworksState(newNetworks);
    const addNetwork = (network: NetworkNode) => setNetworksState(prev => [...prev, network]);
    const setFuseChats = (chats: FuseChat[]) => setFuseChatsState(chats);
    const addFuseChat = (chat: FuseChat) => setFuseChatsState(prev => [chat, ...prev]);

    const setSynapseChats = (chats: SynapseChat[]) => setSynapseChatsState(chats);

    const setWidgets = (newWidgets: WidgetData[]) => setWidgetsState(newWidgets);
    const updateWidget = (id: string, updates: Partial<WidgetData>) => setWidgetsState(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));
    const removeWidget = (id: string) => setWidgetsState(prev => prev.filter(w => w.id !== id));
    const addWidget = (widget: WidgetData) => setWidgetsState(prev => [...prev, widget]);

    const createOrGetDirectChat = (peerName: string): FuseChat => {
        const existing = fuseChats.find(c => c.peerName === peerName);
        if (existing) return existing;

        const newChat: FuseChat = {
            id: `s-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            peerName: peerName,
            messages: [],
            lastActive: Date.now(),
            defaultTtl: 0,
            isConnected: true
        };
        setFuseChatsState(prev => [newChat, ...prev]);
        return newChat;
    };

    const setSomaDMThread = (msgs: Message[]) => setSomaDMThreadState(msgs);
    const setSocialPosts = (posts: SocialPost[]) => setSocialPostsState(posts);

    const setFluxPosts = (posts: FluxPost[]) => setFluxPostsState(posts);
    const addFluxPost = (post: FluxPost) => setFluxPostsState(prev => [post, ...prev]);

    const setLearningResources = (res: LearningResource[]) => setLearningResourcesState(res);
    const addLearningResource = (res: LearningResource) => setLearningResourcesState(prev => [res, ...prev]);
    const setPlaylists = (pl: Playlist[]) => setPlaylistsState(pl);

    const addToPlaylist = (playlistId: string, postId: string) => {
        setPlaylistsState(prev => prev.map(pl => {
            if (pl.id === playlistId) {
                if (pl.itemIds.includes(postId)) return pl; // No duplicates
                return { ...pl, itemIds: [...pl.itemIds, postId] };
            }
            return pl;
        }));
    };

    const createPlaylist = (name: string) => {
        const newPl: Playlist = {
            id: `pl-${Date.now()}`,
            name,
            itemIds: [],
            createdAt: Date.now()
        };
        setPlaylistsState(prev => [newPl, ...prev]);
    };

    const setMinds = (newMinds: Mind[]) => setMindsState(newMinds);

    const ensureChatterSpace = (id: string, name: string, icon?: string) => {
        const existing = networks.find(n => n.id === id);
        if (existing) return existing;

        const newNode: NetworkNode = {
            id,
            name,
            icon: icon || name.substring(0, 2).toUpperCase(),
            color: 'bg-zinc-800 text-white',
            channels: [
                { id: `c-${id}-general`, name: 'general', type: 'text', isPublic: true, messages: [] }
            ]
        };
        setNetworksState(prev => [...prev, newNode]);
        return newNode;
    };

    return (
        <SynapseContext.Provider value={{
            activeView,
            setActiveView,
            isSettingsOpen,
            toggleSettings,
            profileFocus,
            setProfileFocus,
            chatterFocus,
            setChatterFocus,
            isSidebarOpen,
            setSidebarOpen,
            userConfig,
            updateUserConfig,
            networks,
            setNetworks,
            addNetwork,
            ensureChatterSpace,
            fuseChats,
            setFuseChats,
            addFuseChat,
            createOrGetDirectChat,
            somaDMThread,
            setSomaDMThread,
            socialPosts,
            setSocialPosts,
            fluxPosts,
            setFluxPosts,
            addFluxPost,
            learningResources,
            setLearningResources,
            addLearningResource,
            playlists,
            setPlaylists,
            addToPlaylist,
            createPlaylist,
            minds,
            setMinds,
            synapseChats,
            setSynapseChats,
            activeSynapseChatId,
            setActiveSynapseChatId,
            widgets,
            setWidgets,
            updateWidget,
            removeWidget,
            addWidget
        }}>
            {children}
        </SynapseContext.Provider>
    );
};

export const useSynapse = () => {
    const context = useContext(SynapseContext);
    if (!context) {
        throw new Error('useSynapse must be used within a SynapseProvider');
    }
    return context;
};

