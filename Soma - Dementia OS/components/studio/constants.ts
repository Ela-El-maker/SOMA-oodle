import { WidgetData, DashboardTheme, GalleryItem, UserProfile, Community, PortfolioItem } from './types';

export const INITIAL_PROFILE: UserProfile = {
  name: 'Alex Voss',
  role: 'Product Designer',
  bio: 'Building systems.',
  manifesto: 'I create. I think. I develop.',
  avatar: 'https://picsum.photos/200/200',
  location: 'Tokyo, JP',
  timezone: 'UTC+9',
  coverImage: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop'
};

export const MOCK_GALLERY: GalleryItem[] = [
  { id: '1', url: 'https://picsum.photos/400/400?random=1', title: 'Neon Dreams', type: 'image' },
  { id: '2', url: 'https://picsum.photos/400/400?random=2', title: 'Cyber Void', type: 'image' },
  { id: '3', url: 'https://picsum.photos/400/400?random=3', title: 'Tech Noir', type: 'image' },
  { id: '4', url: 'https://picsum.photos/400/400?random=4', title: 'Glitch Core', type: 'image' },
];

export const MOCK_PORTFOLIO: PortfolioItem[] = [
  {
    id: '1',
    title: "Synthetix UI",
    category: "Interface Design",
    description: "A comprehensive design system for a decentralized trading platform. Focused on high-frequency data visualization and emotional durability.",
    year: "2024",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=1000&q=80",
    tags: ["UI/UX", "Fintech", "WebGL"],
    stats: { views: 1240, likes: 342 }
  },
  {
    id: '2',
    title: "Neon Structure",
    category: "3D Art",
    description: "Exploration of brutalist architecture in a cyberpunk setting. Rendered in Octane.",
    year: "2023",
    image: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=1000&q=80",
    tags: ["3D", "Octane", "Concept"],
    stats: { views: 890, likes: 210 }
  },
  {
    id: '3',
    title: "Void Walker",
    category: "Concept Art",
    description: "Character design for an unreleased sci-fi RPG. The suit is designed to harvest moisture from the atmosphere.",
    year: "2024",
    image: "https://images.unsplash.com/photo-1515630278258-407f66498911?w=1000&q=80",
    tags: ["Concept", "Character", "Sci-Fi"],
    stats: { views: 2100, likes: 560 }
  },
  {
    id: '4',
    title: "Analog Dreams",
    category: "Photography",
    description: "A series on the juxtaposition of nature and obsolete technology. Shot on Kodak Portra 400.",
    year: "2022",
    image: "https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1000&q=80",
    tags: ["Photography", "Analog", "35mm"],
    stats: { views: 540, likes: 120 }
  },
  {
    id: '5',
    title: "Kinetic Type",
    category: "Motion",
    description: "Experimental typography reacting to audio input frequencies.",
    year: "2024",
    image: "https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=1000&q=80",
    tags: ["Motion", "Typography", "After Effects"],
    stats: { views: 3200, likes: 890 }
  },
  {
    id: '6',
    title: "Tokyo Ghost",
    category: "Photography",
    description: "Street photography series capturing the loneliness of the megacity.",
    year: "2023",
    image: "https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=1000&q=80",
    tags: ["Street", "Japan", "Night"],
    stats: { views: 1500, likes: 430 }
  }
];

export const THEMES: DashboardTheme[] = [
  { name: 'Void', accent: 'white', bgStyle: 'bg-[#050505]' },
  { name: 'Midnight', accent: 'indigo', bgStyle: 'bg-neutral-950' },
  { name: 'Nebula', accent: 'purple', bgStyle: 'bg-slate-900' },
  { name: 'Carbon', accent: 'emerald', bgStyle: 'bg-zinc-950' },
];

export const MOCK_COMMUNITIES: Community[] = [
  { 
    id: 'c1', 
    name: 'WebGL Shaders', 
    description: 'Exploring the depths of fragment shaders and raymarching techniques.', 
    membersCount: 1240, 
    image: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500', 
    isJoined: true,
    category: 'Code',
    tags: ['GLSL', 'ThreeJS', 'Art']
  },
  { 
    id: 'c2', 
    name: 'Analog Photography', 
    description: 'Film is not dead. Sharing grain, process, and darkroom secrets.', 
    membersCount: 8540, 
    image: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=500', 
    isJoined: true,
    category: 'Art',
    tags: ['35mm', 'Darkroom']
  },
  { 
    id: 'c3', 
    name: 'Cyberdeck Builders', 
    description: 'Custom hardware builds, deck aesthetics, and portable computing.', 
    membersCount: 3200, 
    image: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=500', 
    isJoined: false,
    category: 'Tech',
    tags: ['Hardware', 'Cyberpunk']
  },
  { 
    id: 'c4', 
    name: 'Tokyo Urbanists', 
    description: 'Mapping the neon streets and hidden alleys of the metropolis.', 
    membersCount: 450, 
    image: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=500', 
    isJoined: false,
    category: 'Travel',
    tags: ['Urban', 'Exploration']
  }
];

export const INITIAL_WIDGETS: WidgetData[] = [
  {
    id: 'w-profile',
    type: 'PROFILE',
    title: 'User',
    colSpan: 1,
    rowSpan: 2,
    content: {}
  },
  {
    id: 'w-art',
    type: 'ART_DISPLAY',
    title: 'Featured',
    colSpan: 2,
    rowSpan: 1,
  },
  {
    id: 'w-stats',
    type: 'STATS',
    title: 'Top 8',
    colSpan: 1,
    rowSpan: 1,
  },
  {
    id: 'w-ecosystem',
    type: 'ECOSYSTEM',
    title: 'Apps',
    colSpan: 1,
    rowSpan: 1,
  },
  {
    id: 'w-signal',
    type: 'SIGNAL',
    title: 'Status',
    colSpan: 1,
    rowSpan: 1,
  },
  {
    id: 'w-hub',
    type: 'HUB_FEED',
    title: 'Activity',
    colSpan: 1,
    rowSpan: 2,
    content: {}
  },
  {
    id: 'w-gallery',
    type: 'GALLERY',
    title: 'Messages',
    colSpan: 2,
    rowSpan: 2,
    content: {}
  },
  {
    id: 'w-assistant',
    type: 'ASSISTANT',
    title: 'AI',
    colSpan: 1,
    rowSpan: 1,
  },
];




