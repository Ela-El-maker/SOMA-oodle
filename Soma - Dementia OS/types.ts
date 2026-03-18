export type Role = 'user' | 'model' | 'system' | 'guest';

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  isEncrypted?: boolean; 
  senderName?: string; 
  ttl?: number; // Time to live in seconds (for Fuse)
  expiresAt?: number;
  readAt?: number; // New: When the message was first viewed
  reactions?: Record<string, string>; // UserID -> Emoji
  likes?: number; // For resonance calculation
  resonance?: number; // 0-100 score managed by SOMA
}

export interface Channel {
  id: string;
  name: string;
  type: 'text' | 'voice' | 'announcement';
  isPublic?: boolean; 
  messages: Message[];
}

export interface NetworkNode {
  id: string;
  name: string;
  icon: string; 
  color: string;
  channels: Channel[];
}

export interface FuseChat {
  id: string;
  peerName: string;
  avatar?: string; // New: For Instagram-style lists
  messages: Message[];
  lastActive: number;
  defaultTtl: number;
  isConnected: boolean;
  isTyping?: boolean; // UI state
  isPinned?: boolean;
}

// --- NEW SOCIAL TYPES ---
export interface Comment {
    id: string;
    author: string;
    text: string;
    timestamp: number;
    likes: number;
    userVote?: 'up' | 'down' | null;
}

export interface Playlist {
    id: string;
    name: string;
    itemIds: string[]; // IDs of SocialPosts
    createdAt: number;
}

export interface SocialPost {
    id: string;
    author: string;
    type: 'aspect' | 'slop' | 'art'; // 'art' maps to the "Create" feed
    mediaUrl: string; 
    caption: string;
    likes: number;
    likedByMe?: boolean;
    comments: number;
    commentsList?: Comment[];
    
    resonance: number; 
    userVote?: 'up' | 'down' | null; // Tracks the user's specific vote direction
    
    // AI Detection Fields
    aiConfidence?: number; // 0.0 to 1.0
    aiTag?: 'AI' | 'PAI' | 'LAI' | null;
    
    timestamp: number;
}

export interface Mind {
    id: string;
    name: string;
    description: string;
    members: number;
    tags: string[];
    activityScore: number;
    highlight: string;
}

export interface SynapseChat {
    id: string;
    title: string;
    messages: Message[];
    timestamp: number;
}

// --- NEW FLUX (Flux CLONE) TYPES ---
export interface FluxPost {
    id: string;
    author: string;
    handle: string;
    avatar?: string;
    content: string;
    timestamp: number;
    likes: number;
    reposts: number;
    replies: number;
    likedByMe?: boolean;
    repostedByMe?: boolean;
    
    // Media
    attachments?: string[]; // Array of image URLs (Base64 or Remote)

    // Integration Fields
    linkedContentId?: string; // ID of a BrainRot post, Archive item, or other FluxPost (for reposts)
    linkedContentType?: 'brainrot' | 'archive' | 'flux';

    // Comments/Replies (BrainRot Style)
    repliesList?: Comment[];
}

// --- NEW LEARN TYPES ---
export interface LearningResource {
    id: string;
    title: string;
    author: string;
    category: 'art' | 'code' | 'philosophy' | 'survival';
    content: string;
    codeSnippet?: string; 
    relatedMediaIds?: string[]; 
    resonance: number; // 0-100
    userVote?: 'up' | 'down' | null; // New field for voting logic
    tags: string[];
    timestamp: number;
}

// --- STUDIO (REALITY INTERFACE) TYPES ---
export type WidgetType = 
  | 'GALLERY' 
  | 'STATS' 
  | 'INSPIRE' 
  | 'TEXT'
  | 'MEDIA'
  | 'PROJECTS' 
  | 'ACTIVITY' 
  | 'SIGNAL'   
  | 'HUB_FEED'
  | 'ASSISTANT'
  | 'METRICS'
  | 'PROFILE'
  | 'ART_DISPLAY'
  | 'ECOSYSTEM';

export type AppViewType = 'home' | 'chats' | 'profile' | 'community' | 'community-hub' | 'portfolio' | 'ecosystem' | 'profile-editor';

export interface UserProfile {
  name: string;
  role: string;
  bio: string;
  manifesto?: string;
  avatar: string;
  location: string;
  timezone: string;
  coverImage?: string;
}

export interface WidgetData {
  id: string;
  type: WidgetType;
  title: string;
  colSpan: number; // 1 to 4
  rowSpan: number; // 1 to 4
  content?: any;
  settings?: Record<string, any>;
}

export interface DashboardTheme {
  name: string;
  accent: string;
  bgStyle: string; // CSS class for gradient/bg
}

export interface GalleryItem {
  id: string;
  url: string;
  title: string;
  type: 'image' | 'video';
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  description: string;
  image: string;
  year: string;
  tags: string[];
  stats?: {
      views: number;
      likes: number;
  };
}

export interface ChatSession {
  id: string | number;
  title: string;
  image: string;
  members: string;
  messagesCount: string;
}

export interface Community {
  id: string;
  name: string;
  description: string;
  membersCount: number;
  image: string;
  isJoined: boolean;
  category: string;
  tags: string[];
}

export interface CommunityPost {
  id: string;
  author: {
    name: string;
    avatar: string;
  };
  content: string;
  image?: string;
  likes: number;
  comments: number;
  timestamp: string;
}

export enum ViewMode {
  LANDING = 'LANDING',
  SOMA = 'SOMA',
  CHATTER = 'CHATTER', 
  FUSE = 'FUSE',         
  BRAINROT = 'BRAINROT',       
  SIGNAL = 'SIGNAL',
  FLUX = 'FLUX',               // New Flux-like app
  LEARN = 'LEARN',             
  PROFILE = 'PROFILE',         // Unified Profile/Studio Dashboard
  SETTINGS = 'SETTINGS'
}

export type UserStatus = 'online' | 'idle' | 'dnd' | 'invisible';

export interface UserConfig {
  username: string;
  displayName: string;
  bio: string;
  manifesto?: string; // From Studio
  avatarUrl: string;
  bannerUrl: string; 
  location?: string; // From Studio
  timezone?: string; // From Studio
  status: UserStatus;
  notifications: boolean;
  stealthMode: boolean; 
  accentColor: string;
}



