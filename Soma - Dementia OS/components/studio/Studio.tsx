import * as React from 'react';
import { useState, useEffect } from 'react';
import DashboardCanvas from './DashboardCanvas';
import ChatDetail from './views/ChatDetail';
import CommunityView from './views/CommunityView';
import CommunityHubView from './views/CommunityHubView';
import PortfolioView from './views/PortfolioView';
import EcosystemView from './views/EcosystemView';
import ProfileEditorView from './views/ProfileEditorView';
import GalleryWidget from './widgets/GalleryWidget';
import { ProfileWidget } from './widgets/ProfileWidget';
import NavConfigModal, { NavTheme } from './ui/NavConfigModal';
import { useSynapse } from '../../context/SynapseContext';
import { WidgetData, AppViewType, ChatSession } from '../../types';
import { Check, Settings } from 'lucide-react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';

export const Studio: React.FC = () => {
  const synapse = useSynapse();
  
  // Destructure with defaults to prevent crashes if context is partial or failing
  const userConfig = synapse?.userConfig || {};
  const updateUserConfig = synapse?.updateUserConfig || (() => {});
  const widgets = synapse?.widgets || [];
  const updateWidget = synapse?.updateWidget || (() => {});
  const removeWidget = synapse?.removeWidget || (() => {});
  const addWidget = synapse?.addWidget || (() => {});
  const setWidgets = synapse?.setWidgets || (() => {});

  const [isEditMode, setIsEditMode] = useState(false);
  const [showCatalog, setShowCatalog] = useState(false);
  const [currentView, setCurrentView] = useState<AppViewType>('home');
  const [activeChat, setActiveChat] = useState<ChatSession | null>(null);
  
  // Nav Settings
  const [navTheme, setNavTheme] = useState<NavTheme>({ style: 'ISLAND', color: '#ffffff' });
  const [showNavConfig, setShowNavConfig] = useState(false);
  
  // Community Hub State
  const [communityNavState, setCommunityNavState] = useState<{ id?: string, mode?: 'explore' | 'detail' }>({});

  const reorderWidgets = (dragIndex: number, hoverIndex: number) => {
    const newWidgets = [...widgets];
    const draggedItem = newWidgets[dragIndex];
    newWidgets.splice(dragIndex, 1);
    newWidgets.splice(hoverIndex, 0, draggedItem);
    setWidgets(newWidgets);
  };
  
  const updateProfile = (updates: any) => {
      updateUserConfig(updates);
  };

  const handleNavigate = (view: AppViewType) => {
      setCurrentView(view);
      setActiveChat(null); 
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
      const handleAppNavigate = (e: any) => {
          const { view, context } = e.detail;
          if (view === 'community-hub') {
              setCommunityNavState({
                  id: context?.communityId,
                  mode: context?.mode || (context?.communityId ? 'detail' : 'explore')
              });
              setCurrentView('community-hub');
              window.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (view === 'portfolio') {
              setCurrentView('portfolio');
              window.scrollTo({ top: 0, behavior: 'smooth' });
          } else if (view === 'ecosystem') {
              setCurrentView('ecosystem');
              window.scrollTo({ top: 0, behavior: 'smooth' });
          }
      };

      window.addEventListener('app:navigate', handleAppNavigate);
      return () => window.removeEventListener('app:navigate', handleAppNavigate);
  }, []);

  const handleAdd = () => {
      if (currentView !== 'home') {
          setCurrentView('home');
          setTimeout(() => setShowCatalog(true), 300); 
      } else {
          setShowCatalog(true);
      }
  };

  const handleEditProfile = () => {
      setCurrentView('profile-editor');
      setIsEditMode(false);
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const { scrollY } = useScroll();
  const headerOpacity = useTransform(scrollY, [0, 100], [1, 0]);
  const headerY = useTransform(scrollY, [0, 100], [0, -40]);

  const pageVariants = {
    initial: { opacity: 0, x: 10 },
    in: { opacity: 1, x: 0 },
    out: { opacity: 0, x: -10 }
  };

  const pageTransition = {
    type: "tween",
    ease: "circOut",
    duration: 0.3
  };

  const getDummyWidgetData = (type: any): WidgetData => ({
      id: 'standalone', type, title: 'Standalone', colSpan: 4, rowSpan: 4, content: {}
  });

  const profileWidget = widgets.find(w => w.type === 'PROFILE') || getDummyWidgetData('PROFILE');

  if (!synapse) return <div className="h-full w-full bg-black flex items-center justify-center text-[#5eead4] font-black uppercase tracking-widest">Neural Link Failing...</div>;

  return (
    <div className="min-h-screen text-white bg-[#000000] font-sans selection:bg-[#5eead4]/30 pb-24 relative overflow-x-hidden">
      
      <NavConfigModal 
        isOpen={showNavConfig} 
        onClose={() => setShowNavConfig(false)}
        currentTheme={navTheme}
        onSave={setNavTheme}
      />

      {/* Top Header */}
      {!activeChat && currentView === 'home' && (
        <div className="fixed top-0 left-0 right-0 z-[60] p-8 flex justify-between items-start pointer-events-none">
            <motion.div 
               className="pointer-events-auto"
               style={{ opacity: headerOpacity, y: headerY }}
            >
               <button 
                  onClick={() => handleNavigate('profile')}
                  className="group flex items-center gap-5 pl-2 pr-8 py-2 rounded-full bg-black/20 hover:bg-black/60 border border-white/5 hover:border-white/10 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02]"
               >
                  <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-[#5eead4] to-indigo-500 animate-pulse opacity-50 blur-[2px] group-hover:opacity-80 transition-opacity"></div>
                      <div className="relative w-full h-full rounded-full p-[2px] bg-gradient-to-br from-white/10 to-white/5 overflow-hidden">
                          {userConfig.avatarUrl ? (
                              <img src={userConfig.avatarUrl} alt="Profile" className="w-full h-full rounded-full object-cover filter brightness-90 group-hover:brightness-110 transition-all" />
                          ) : (
                              <div className="w-full h-full bg-zinc-800 flex items-center justify-center text-xl font-black uppercase text-white">
                                  {(userConfig.displayName || '??').substring(0, 2)}
                              </div>
                          )}
                      </div>
                  </div>
                  
                  <div className="flex flex-col items-start text-left">
                      <span className="text-lg font-black text-white group-hover:text-[#5eead4] transition-colors leading-none mb-1 uppercase tracking-tighter">
                          {userConfig.displayName || 'Unknown Operator'}
                      </span>
                      <span className="text-[10px] font-black text-[#5eead4] uppercase tracking-[0.3em] leading-none opacity-70">
                          Studio Operator
                      </span>
                  </div>
               </button>
            </motion.div>

            <div className="pointer-events-auto flex gap-4 pt-4">
                 {isEditMode ? (
                     <button onClick={() => setIsEditMode(false)} className="w-12 h-12 bg-white text-black rounded-2xl flex items-center justify-center shadow-2xl hover:scale-105 transition-transform">
                         <Check size={24} strokeWidth={3} />
                     </button>
                 ) : (
                     <button onClick={() => setIsEditMode(true)} className="w-12 h-12 bg-black/40 backdrop-blur-xl border border-white/10 text-white rounded-2xl flex items-center justify-center hover:bg-[#5eead4] hover:text-black transition-all hover:border-[#5eead4] group shadow-xl">
                         <Settings size={24} className="group-hover:rotate-90 transition-transform duration-500" />
                     </button>
                 )}
            </div>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-[1400px] mx-auto w-full min-h-screen">
          <AnimatePresence mode="wait">
            {currentView === 'home' && (
                <motion.div key="home" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition}>
                    <DashboardCanvas 
                        widgets={widgets} 
                        userProfile={{
                            name: userConfig.displayName || 'Traveler',
                            role: 'Studio Operator',
                            bio: userConfig.bio || '',
                            avatar: userConfig.avatarUrl || '',
                            location: userConfig.location || 'Unknown Sector',
                            timezone: userConfig.timezone || 'UTC'
                        }}
                        isEditMode={isEditMode}
                        onUpdateWidget={updateWidget}
                        onRemoveWidget={removeWidget}
                        onAddWidget={addWidget}
                        onReorderWidget={reorderWidgets}
                        onUpdateProfile={updateProfile}
                        showCatalog={showCatalog}
                        setShowCatalog={setShowCatalog}
                        onEditProfile={handleEditProfile}
                    />
                </motion.div>
            )}

            {currentView === 'chats' && (
                <motion.div key="chats" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="w-full min-h-screen">
                    {activeChat ? (
                        <ChatDetail chat={activeChat} onBack={() => setActiveChat(null)} currentUserAvatar={userConfig.avatarUrl} />
                    ) : (
                        <div className="max-w-2xl mx-auto min-h-[80vh] pt-24">
                            <GalleryWidget 
                                data={getDummyWidgetData('GALLERY')} 
                                onChatSelect={(chat) => setActiveChat(chat)}
                                currentUser={{
                                    name: userConfig.displayName,
                                    avatar: userConfig.avatarUrl
                                } as any}
                            />
                        </div>
                    )}
                </motion.div>
            )}

            {currentView === 'profile' && (
                <motion.div key="profile" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="w-full min-h-screen relative" >
                    <div className="relative z-10 min-h-screen pt-24 px-6">
                        <ProfileWidget 
                            data={profileWidget} 
                            profile={{
                                name: userConfig.displayName || 'Traveler',
                                role: 'Studio Operator',
                                bio: userConfig.bio || '',
                                manifesto: userConfig.manifesto,
                                avatar: userConfig.avatarUrl || '',
                                location: userConfig.location || 'Sector 7',
                                timezone: userConfig.timezone || 'UTC+0'
                            }} 
                            isEditMode={isEditMode}
                            onUpdateProfile={updateProfile}
                        />
                    </div>
                </motion.div>
            )}
            
            {currentView === 'profile-editor' && (
                <motion.div key="profile-editor" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.4 }} className="w-full min-h-screen fixed inset-0 z-[100] bg-black overflow-y-auto" >
                    <ProfileEditorView 
                        profile={{
                            name: userConfig.displayName || 'Traveler',
                            role: 'Studio Operator',
                            bio: userConfig.bio || '',
                            manifesto: userConfig.manifesto,
                            avatar: userConfig.avatarUrl || '',
                            location: userConfig.location || 'Sector 7',
                            timezone: userConfig.timezone || 'UTC+0'
                        }}
                        widgetData={profileWidget}
                        onUpdateProfile={updateProfile}
                        onUpdateWidget={updateWidget}
                        onBack={() => handleNavigate('home')}
                    />
                </motion.div>
            )}

            {currentView === 'community' && (
                <motion.div key="community" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="w-full min-h-screen pt-24" >
                    <CommunityView 
                        currentUser={{ name: userConfig.displayName, avatar: userConfig.avatarUrl } as any}
                        onBack={() => handleNavigate('home')}
                    />
                </motion.div>
            )}

            {currentView === 'community-hub' && (
                <motion.div key="community-hub" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="w-full min-h-screen pt-24" >
                    <CommunityHubView 
                        currentUser={{ name: userConfig.displayName, avatar: userConfig.avatarUrl } as any}
                        onBack={() => handleNavigate('home')}
                        initialCommunityId={communityNavState.id}
                        initialMode={communityNavState.mode}
                    />
                </motion.div>
            )}

            {currentView === 'portfolio' && (
                <motion.div key="portfolio" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="w-full min-h-screen pt-24" >
                    <PortfolioView
                        currentUser={{ name: userConfig.displayName, avatar: userConfig.avatarUrl } as any}
                        onBack={() => handleNavigate('home')}
                    />
                </motion.div>
            )}

            {currentView === 'ecosystem' && (
                <motion.div key="ecosystem" initial="initial" animate="in" exit="out" variants={pageVariants} transition={pageTransition} className="w-full min-h-screen fixed inset-0 z-[100] bg-black" >
                    <EcosystemView
                        currentUser={{ name: userConfig.displayName, avatar: userConfig.avatarUrl } as any}
                        onBack={() => handleNavigate('home')}
                    />
                </motion.div>
            )}
          </AnimatePresence>
      </main>
    </div>
  );
};

