import * as React from 'react';
import { useState } from 'react';
import { WidgetData, ChatSession, UserProfile, ViewMode } from '../../../types';
import { useSynapse } from '../../../context/SynapseContext';
import { Camera, ChevronDown, MoreHorizontal, PenSquare, Search, Plus, MessageCircle, UserPlus, Ghost, Settings, CheckCheck, Archive, BellOff, Trash2, Lock, EyeOff, RefreshCw, X, Unlock } from 'lucide-react';
import { motion, AnimatePresence, PanInfo, useMotionValue, useTransform } from 'framer-motion';

interface Props {
    data?: WidgetData;
    onChatSelect?: (chat: ChatSession) => void;
    currentUser?: UserProfile;
    isWidget?: boolean;
}

// Initial Data
const INITIAL_CHATS: ChatSession[] = [
    { id: '1', title: 'Erin', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', members: '', messagesCount: '4+ new messages · 1h' },
    { id: '2', title: 'Jon Doliveira', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', members: '', messagesCount: '4 new messages · 3w' },
    { id: '3', title: 'Damon Robinson', image: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150', members: '', messagesCount: '4+ new messages · 5w' },
    { id: '4', title: 'Sunflower Samurai 🌻', image: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=150', members: '', messagesCount: '4+ new messages · 9w' },
    { id: '5', title: 'Garrett', image: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150', members: '', messagesCount: '2 new messages · 10w' },
    { id: '6', title: 'Sarah_V', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', members: '', messagesCount: 'Sent · 1d' },
    { id: '7', title: 'Kaito', image: 'https://images.unsplash.com/photo-1528892952291-009c663ce843?w=150', members: '', messagesCount: 'Seen · 2h' },
    { id: '8', title: 'Neo_Tokyo', image: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?w=150', members: '', messagesCount: 'Typing...' },
];

const FAVORITES = [
    { id: 'f1', name: 'Erin', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150' },
    { id: 'f2', name: 'Jon', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150' },
    { id: 'f3', name: 'Damon', image: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=150' },
    { id: 'f4', name: 'Kaito', image: 'https://images.unsplash.com/photo-1528892952291-009c663ce843?w=150' },
    { id: 'f5', name: 'Sarah', image: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150' },
];

type TabType = 'Primary' | 'General' | 'Requests';
type GalleryViewMode = 'inbox' | 'hidden' | 'deleted';

// --- Swipeable Row Component ---
interface SwipeableChatRowProps {
    chat: ChatSession; 
    onSelect?: (c: ChatSession) => void; 
    onHide?: (id: string) => void; 
    onDelete?: (id: string) => void;
    onRestore?: (id: string) => void;
    viewMode: GalleryViewMode;
}

const SwipeableChatRow: React.FC<SwipeableChatRowProps> = ({ 
    chat, 
    onSelect, 
    onHide, 
    onDelete, 
    onRestore,
    viewMode 
}) => {
    const x = useMotionValue(0);
    const backgroundOpacity = useTransform(x, [-100, 0, 100], [1, 0, 1]);
    const deleteOpacity = useTransform(x, [-150, -50], [1, 0]);
    const hideOpacity = useTransform(x, [50, 150], [0, 1]);

    const handleDragEnd = (event: any, info: PanInfo) => {
        if (viewMode !== 'inbox') {
             x.set(0);
             return;
        }

        if (info.offset.x < -100 && onDelete) {
            onDelete(chat.id as string);
        } else if (info.offset.x > 100 && onHide) {
            onHide(chat.id as string);
        } else {
            // Reset position
            x.set(0);
        }
    };

    return (
        <motion.div 
            layout
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="relative overflow-hidden mb-1"
        >
            {/* Background Actions Layer */}
            {viewMode === 'inbox' && (
                <motion.div 
                    style={{ opacity: backgroundOpacity }}
                    className="absolute inset-0 flex items-center justify-between px-6 pointer-events-none z-0"
                >
                    {/* Left Side (Swipe Right) -> Hide */}
                    <motion.div style={{ opacity: hideOpacity }} className="flex items-center gap-2 text-emerald-400 font-bold">
                        <EyeOff size={24} />
                        <span className="text-sm">HIDE</span>
                    </motion.div>

                    {/* Right Side (Swipe Left) -> Delete */}
                    <motion.div style={{ opacity: deleteOpacity }} className="flex items-center gap-2 text-red-500 font-bold">
                        <span className="text-sm">DELETE</span>
                        <Trash2 size={24} />
                    </motion.div>
                </motion.div>
            )}

            {/* Foreground Chat Item */}
            <motion.div
                style={{ x }}
                drag={viewMode === 'inbox' ? "x" : false}
                dragConstraints={{ left: 0, right: 0 }}
                onDragEnd={handleDragEnd}
                onClick={() => onSelect && onSelect(chat)}
                whileDrag={{ scale: 1.02, cursor: 'grabbing' }}
                className="relative z-10 bg-black flex items-center justify-between px-6 py-4 active:bg-white/5 transition-colors cursor-pointer group border-b border-white/5"
            >
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <img src={chat.image} className="w-16 h-16 rounded-[20px] object-cover bg-white/5 pointer-events-none" alt={chat.title} />
                        {viewMode === 'deleted' && (
                            <div className="absolute inset-0 bg-red-500/20 rounded-[20px] flex items-center justify-center">
                                <Trash2 size={20} className="text-white" />
                            </div>
                        )}
                        {viewMode === 'hidden' && (
                            <div className="absolute inset-0 bg-emerald-500/20 rounded-[20px] flex items-center justify-center">
                                <Lock size={20} className="text-white" />
                            </div>
                        )}
                    </div>
                    <div className="flex flex-col gap-1 pointer-events-none">
                        <span className="text-white text-[16px] font-medium leading-tight">{chat.title}</span>
                        {viewMode === 'deleted' ? (
                            <span className="text-red-400 text-[12px] font-normal">30 days remaining</span>
                        ) : (
                            <span className="text-white/50 text-[14px] font-normal">{chat.messagesCount}</span>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    {/* Actions for Hidden/Deleted views */}
                    {(viewMode === 'hidden' || viewMode === 'deleted') && onRestore ? (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onRestore(chat.id as string); }}
                            className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-white transition-colors"
                        >
                            <RefreshCw size={18} />
                        </button>
                    ) : (
                        <button 
                            className="text-white/40 hover:text-white transition-colors p-2 rounded-full hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                            <Camera size={24} strokeWidth={1.5} />
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
};


const GalleryWidget: React.FC<Props> = ({ data, onChatSelect, currentUser, isWidget = false }) => {
  const { createOrGetDirectChat, setActiveView } = useSynapse();
  
  // Data State
  const [activeChats, setActiveChats] = useState<ChatSession[]>(INITIAL_CHATS);
  const [hiddenChats, setHiddenChats] = useState<ChatSession[]>([]);
  const [deletedChats, setDeletedChats] = useState<ChatSession[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState<TabType>('Primary');
  const [showOptions, setShowOptions] = useState(false);
  const [viewMode, setViewMode] = useState<GalleryViewMode>('inbox');
  
  // Security State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [authError, setAuthError] = useState(false);

  const handleCompose = () => alert("New Message (Placeholder)");
  const handleNoteClick = (user: string) => alert(`Viewing profile of ${user}`);
  const handleAddFavorite = () => alert("Add Favorite (Placeholder)");

  // --- Actions ---

  const handleChatSelectInternal = (chat: ChatSession) => {
      // Direct messages in Studio link to Fuse (P2P Mesh)
      createOrGetDirectChat(chat.title);
      setActiveView(ViewMode.FUSE);
      if (onChatSelect) onChatSelect(chat);
  };

  const hideChat = (id: string) => {
      const chatToHide = activeChats.find(c => c.id === id);
      if (chatToHide) {
          setActiveChats(prev => prev.filter(c => c.id !== id));
          setHiddenChats(prev => [...prev, chatToHide]);
      }
  };

  const deleteChat = (id: string) => {
      const chatToDelete = activeChats.find(c => c.id === id);
      if (chatToDelete) {
          setActiveChats(prev => prev.filter(c => c.id !== id));
          setDeletedChats(prev => [...prev, chatToDelete]);
      }
  };

  const restoreChat = (id: string) => {
      // Find where it is
      const fromHidden = hiddenChats.find(c => c.id === id);
      const fromDeleted = deletedChats.find(c => c.id === id);

      if (fromHidden) {
          setHiddenChats(prev => prev.filter(c => c.id !== id));
          setActiveChats(prev => [fromHidden, ...prev]);
      } else if (fromDeleted) {
          setDeletedChats(prev => prev.filter(c => c.id !== id));
          setActiveChats(prev => [fromDeleted, ...prev]);
      }
  };

  const handleAccessHidden = () => {
      if (isUnlocked) {
          setViewMode('hidden');
          setShowOptions(false);
      } else {
          setShowPasswordModal(true);
          setShowOptions(false);
      }
  };

  const verifyPassword = () => {
      if (passwordInput === '1234') { // Mock password
          setIsUnlocked(true);
          setShowPasswordModal(false);
          setPasswordInput('');
          setAuthError(false);
          setViewMode('hidden');
      } else {
          setAuthError(true);
          // Shake effect could go here
      }
  };

  // --- WIDGET MODE (HOME SCREEN) ---
  if (isWidget) {
      return (
        <div className="w-full h-full flex flex-col p-6 overflow-hidden">
            {/* Widget Header */}
            <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                    <MessageCircle size={20} className="text-white" />
                    <h3 className="text-xl font-bold text-white tracking-tight font-display uppercase tracking-widest">Messages</h3>
                </div>
                <span className="text-[10px] font-black text-[#5eead4] bg-[#5eead4]/10 border border-[#5eead4]/20 px-2 py-1 rounded-lg">{activeChats.length} Active</span>
            </div>

            {/* Quick Grid Display */}
            <div className="grid grid-cols-4 gap-4 flex-1 content-start">
                {activeChats.slice(0, 8).map((chat) => (
                    <div 
                        key={chat.id} 
                        className="flex flex-col items-center gap-2 group cursor-pointer"
                        onClick={() => handleChatSelectInternal(chat)}
                    >
                        <div className="w-full aspect-square relative">
                            <div className="absolute inset-0 bg-white/5 border border-white/5 rounded-[18px] overflow-hidden group-hover:border-[#5eead4]/50 group-hover:bg-white/10 transition-all duration-300 shadow-sm">
                                <img 
                                    src={chat.image} 
                                    className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-110 transition-all duration-500" 
                                    alt={chat.title} 
                                />
                            </div>
                            <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#5eead4] border-2 border-[#111] rounded-full shadow-[0_0_5px_#5eead4]"></div>
                        </div>
                        <span className="text-[9px] font-black text-white/50 uppercase tracking-widest truncate w-full text-center group-hover:text-white transition-colors">
                            {chat.title}
                        </span>
                    </div>
                ))}
            </div>
        </div>
      );
  }

  // --- FULL VIEW MODE (INBOX) ---

  const getDisplayChats = () => {
      if (viewMode === 'hidden') return hiddenChats;
      if (viewMode === 'deleted') return deletedChats;
      return activeChats; // Default inbox
  };

  const getHeaderTitle = () => {
      if (viewMode === 'hidden') return 'Hidden';
      if (viewMode === 'deleted') return 'Deleted';
      return 'Messages';
  };

  return (
    <div className="w-full h-full flex flex-col bg-black text-white pt-12 pb-24 font-sans overflow-y-auto no-scrollbar relative">
      
      {/* Password Modal */}
      <AnimatePresence>
        {showPasswordModal && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-black/80 backdrop-blur-md"
                    onClick={() => setShowPasswordModal(false)}
                />
                <motion.div 
                    initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
                    className="relative bg-[#111] border border-white/10 rounded-3xl p-8 w-full max-w-sm flex flex-col items-center text-center shadow-2xl"
                >
                    <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6">
                        <Lock size={32} className="text-white/50" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Secure Folder</h3>
                    <p className="text-white/40 text-sm mb-6 uppercase tracking-widest text-[10px]">Enter access code</p>
                    
                    <div className="flex gap-4 mb-6 w-full">
                        <input 
                            type="password" 
                            autoFocus
                            value={passwordInput}
                            onChange={(e) => setPasswordInput(e.target.value)}
                            className={`w-full bg-white/5 border ${authError ? 'border-red-500/50 text-red-200' : 'border-white/10 text-white'} rounded-xl px-4 py-3 text-center tracking-[0.5em] text-xl focus:outline-none focus:border-[#5eead4]/50 transition-colors placeholder:tracking-normal`}
                            placeholder="...."
                            maxLength={4}
                        />
                    </div>
                    
                    <button 
                        onClick={verifyPassword}
                        className="w-full py-3 bg-white text-black font-black uppercase tracking-widest rounded-xl hover:bg-[#5eead4] transition-colors"
                    >
                        Access
                    </button>
                    {authError && <p className="text-red-500 text-[10px] font-bold uppercase tracking-widest mt-4">Invalid Signature</p>}
                </motion.div>
            </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between px-6 mb-4 relative z-50">
          <div className="flex items-center gap-2">
            {viewMode !== 'inbox' && (
                <button onClick={() => setViewMode('inbox')} className="p-1 hover:bg-white/10 rounded-full mr-1">
                    <X size={24} />
                </button>
            )}
            <h1 className="text-3xl font-display font-black uppercase tracking-tighter flex items-center gap-2">
                {getHeaderTitle()}
                {viewMode === 'hidden' && <Lock size={20} className="text-white/30" />}
                {viewMode === 'deleted' && <Trash2 size={20} className="text-white/30" />}
            </h1>
          </div>

          <div className="flex items-center gap-6 relative">
              <div className="relative">
                  <button 
                    onClick={() => setShowOptions(!showOptions)} 
                    className={`hover:opacity-70 transition-all p-2 rounded-full ${showOptions ? 'bg-white/10 text-white' : 'text-white/80'}`}
                  >
                    <MoreHorizontal size={28} />
                  </button>
                  
                  <AnimatePresence>
                    {showOptions && (
                        <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowOptions(false)} />
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute right-0 top-12 w-60 bg-[#1A1A1A] border border-white/10 rounded-xl shadow-2xl z-50 flex flex-col py-1 overflow-hidden"
                            >
                                <button className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-[11px] font-black uppercase tracking-widest text-white/80 hover:text-white transition-colors text-left w-full">
                                    <CheckCheck size={16} /> Mark all as read
                                </button>
                                
                                <button 
                                    onClick={handleAccessHidden}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-[11px] font-black uppercase tracking-widest text-white/80 hover:text-white transition-colors text-left w-full border-t border-white/5"
                                >
                                    <EyeOff size={16} /> Hidden Chats
                                    {isUnlocked && <Unlock size={12} className="ml-auto text-[#5eead4]" />}
                                </button>
                                
                                <button 
                                    onClick={() => { setViewMode('deleted'); setShowOptions(false); }}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-[11px] font-black uppercase tracking-widest text-white/80 hover:text-white transition-colors text-left w-full"
                                >
                                    <Trash2 size={16} /> Recently Deleted
                                </button>
                                
                                <div className="h-px bg-white/5 my-1" />
                                <button className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 text-[11px] font-black uppercase tracking-widest text-white/80 hover:text-white transition-colors text-left w-full">
                                    <Settings size={16} /> Chat settings
                                </button>
                            </motion.div>
                        </>
                    )}
                  </AnimatePresence>
              </div>

              {viewMode === 'inbox' && (
                <button onClick={handleCompose} className="hover:opacity-70 transition-opacity p-1">
                    <PenSquare size={26} />
                </button>
              )}
          </div>
      </div>

      {/* Favorites / Quick Access Row (Only in Inbox) */}
      {viewMode === 'inbox' && (
          <div className="flex gap-5 overflow-x-auto px-6 pb-6 scrollbar-hide mb-2 shrink-0">
              {FAVORITES.map((fav) => (
                  <button 
                    key={fav.id} 
                    onClick={() => handleNoteClick(fav.name)}
                    className="flex flex-col items-center gap-2 shrink-0 group"
                  >
                      <div className="relative w-[76px] h-[76px]">
                          <div className="w-full h-full rounded-[24px] overflow-hidden border border-white/10 group-active:scale-95 transition-transform bg-white/5">
                            <img src={fav.image} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" alt={fav.name} />
                          </div>
                          <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-emerald-500 rounded-full border-[3px] border-black"></div>
                      </div>
                      <span className="text-[10px] font-black text-white/60 uppercase tracking-widest group-hover:text-white transition-colors">{fav.name}</span>
                  </button>
              ))}
              
              <button 
                onClick={handleAddFavorite}
                className="flex flex-col items-center gap-2 shrink-0 group"
              >
                 <div className="w-[76px] h-[76px] rounded-[24px] border border-white/10 flex items-center justify-center bg-white/5 group-hover:bg-white/10 group-active:scale-95 transition-all">
                    <Plus size={32} className="text-white/30 group-hover:text-white transition-colors" />
                 </div>
                 <span className="text-[10px] font-black text-white/30 uppercase tracking-widest group-hover:text-white transition-colors">Add</span>
              </button>
          </div>
      )}

      {/* Tabs (Only in Inbox) */}
      {viewMode === 'inbox' && (
        <div className="flex items-center gap-2 px-6 mb-4 shrink-0 border-b border-white/5">
                {['Primary', 'General', 'Requests'].map(tab => (
                    <button 
                        key={tab}
                        onClick={() => setActiveTab(tab as TabType)}
                        className={`flex-1 pb-3 text-[10px] font-black uppercase tracking-[0.2em] transition-colors relative ${activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
                    >
                        {tab}
                        {activeTab === tab && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5eead4] rounded-full mx-8 shadow-[0_0_8px_#5eead4]"></div>
                        )}
                    </button>
                ))}
        </div>
      )}

      {/* Message List */}
      <div className="flex flex-col flex-1 min-h-[300px]">
          <AnimatePresence mode="popLayout">
              {getDisplayChats().length > 0 ? (
                  getDisplayChats().map((chat) => (
                    <SwipeableChatRow 
                        key={chat.id}
                        chat={chat}
                        onSelect={handleChatSelectInternal}
                        onHide={hideChat}
                        onDelete={deleteChat}
                        onRestore={restoreChat}
                        viewMode={viewMode}
                    />
                ))
              ) : (
                <motion.div 
                    initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-48 text-white/30 gap-3"
                >
                    {viewMode === 'inbox' && <Ghost size={32} />}
                    {viewMode === 'hidden' && <Lock size={32} />}
                    {viewMode === 'deleted' && <Trash2 size={32} />}
                    <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
                        {viewMode === 'inbox' && 'No signals detected'}
                        {viewMode === 'hidden' && 'Sector encrypted'}
                        {viewMode === 'deleted' && 'Memory purged'}
                    </span>
                </motion.div>
              )}
          </AnimatePresence>
      </div>
    </div>
  );
};

export default GalleryWidget;




