import * as React from 'react';
import { useState, useEffect } from 'react';
import { WidgetData, UserProfile } from '../../../types';
import { MapPin, Clock, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { RENDER_BUTTON } from '../ui/StyledButtons';

interface Props {
  data: WidgetData;
  profile: UserProfile;
  isEditMode: boolean;
  onUpdateProfile: (updates: Partial<UserProfile>) => void;
}

export const ProfileWidget: React.FC<Props> = ({ data, profile, isEditMode }) => {
  const [isFollowing, setIsFollowing] = useState(false);
  const [time, setTime] = useState<string>('');
  
  // Settings from Widget Configuration
  const buttonStyle = data.settings?.followButtonStyle || 'COSMOS';
  const buttonColor = data.settings?.followButtonColor || '#f5434f';
  const buttonText = data.settings?.followButtonText || 'Follow';
  const buttonPos = data.settings?.followButtonPosition || 'bottom-right';
  const buttonScale = data.settings?.followButtonScale || 1;
  const imageFilter = data.settings?.profileFilter || 'NONE';

  const activeFilterClass = (() => {
      switch(imageFilter) {
          case 'NOIR': return 'grayscale contrast-125 brightness-50';
          case 'SEPIA': return 'sepia contrast-110 brightness-50';
          case 'VINTAGE': return 'sepia-[.3] contrast-125 hue-rotate-[-10deg] saturate-150 brightness-50';
          case 'CYBER': return 'hue-rotate-180 contrast-125 saturate-200 brightness-50';
          case 'MATRIX': return 'grayscale sepia-[.8] hue-rotate-[50deg] contrast-125 brightness-50';
          case 'DREAM': return 'blur-[1px] brightness-75 contrast-90 saturate-150';
          case 'GRAIN': return 'contrast-150 brightness-50 sepia-[.2]';
          case 'NONE': return 'grayscale brightness-50 contrast-125'; // Match original hardcoded style
          default: return 'grayscale brightness-50 contrast-125';
      }
  })();

  // Get position classes
  const getPosClasses = (pos: string, isMobile: boolean) => {
      if (isMobile) {
           return 'fixed bottom-32 left-0 right-0 flex justify-center z-[100] pointer-events-none';
      }
      switch (pos) {
          case 'bottom-left': return 'absolute bottom-12 left-12 z-30';
          case 'bottom-center': return 'absolute bottom-12 left-1/2 -translate-x-1/2 z-30';
          case 'bottom-right': 
          default: return 'absolute bottom-12 right-12 z-30';
      }
  };

  const getTransformOrigin = (pos: string) => {
      switch(pos) {
          case 'bottom-left': return 'bottom left';
          case 'bottom-center': return 'bottom center';
          case 'bottom-right': return 'bottom right';
          default: return 'center';
      }
  };

  // Real-time clock effect
  useEffect(() => {
    const updateTime = () => {
      const options: Intl.DateTimeFormatOptions = { 
        hour: '2-digit', 
        minute: '2-digit', 
        hour12: false,
        timeZone: profile.timezone.includes('UTC+9') ? 'Asia/Tokyo' : undefined 
      };
      setTime(new Date().toLocaleTimeString('en-US', options));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, [profile.timezone]);

  const handleFollow = () => {
      setIsFollowing(!isFollowing);
  };

  const TAGS = ["#Minimalism", "#DesignThinking", "#Photography"];

  return (
    <div className="w-full h-full flex flex-col relative group md:overflow-hidden bg-black">
        {/* Immersive Background Image (Top Half) with Breathing Animation */}
        <div className="absolute top-0 left-0 w-full h-[120%] z-0 overflow-hidden">
             <motion.img 
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                src={profile.coverImage || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop"} 
                className={`w-full h-full object-cover ${activeFilterClass}`} 
             />
             <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#000000]/60 to-[#000000]" />
        </div>

        <div className="relative z-10 flex flex-col justify-end h-full p-8 md:p-12">
            
            {/* Live Status & Time */}
            <div className="absolute top-8 left-8 flex items-center gap-4">
                 <div className="flex items-center gap-2 bg-black/20 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
                     <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 tracking-wider">ONLINE_</span>
                 </div>
            </div>

            {/* Avatar / Name Group */}
            <div className="mb-6 flex items-end justify-between">
                <div>
                    <h1 className="text-4xl md:text-5xl font-sans font-bold text-white tracking-tight mb-2">
                        {profile.name}
                    </h1>
                    <div className="flex items-center gap-4 text-white/50 text-sm md:text-base font-medium">
                         <span className="flex items-center gap-1.5"><MapPin size={14}/> {profile.location}</span>
                         <span className="w-1 h-1 bg-white/20 rounded-full"></span>
                         <span className="flex items-center gap-1.5 font-mono"><Clock size={14}/> {time}</span>
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div className="flex items-center gap-8 mb-8">
                <div className="flex flex-col">
                    <span className="text-xl font-bold text-white">1.2K</span>
                    <span className="text-xs text-white/40 font-medium uppercase tracking-wider">Followers</span>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className="flex flex-col">
                    <span className="text-xl font-bold text-white">287</span>
                    <span className="text-xs text-white/40 font-medium uppercase tracking-wider">Following</span>
                </div>
                <div className="w-px h-8 bg-white/10"></div>
                <div className="flex flex-col">
                    <span className="text-xl font-bold text-white">47</span>
                    <span className="text-xs text-white/40 font-medium uppercase tracking-wider">Works</span>
                </div>
            </div>

            {/* Quote / Bio */}
            <div className="mb-6 max-w-lg">
                {profile.manifesto && (
                    <h2 className="text-xl md:text-2xl font-bold text-white leading-tight mb-3">
                        "{profile.manifesto}"
                    </h2>
                )}
                <div className="space-y-1 text-white/60 text-sm md:text-base font-light">
                    <p className="flex items-center gap-2"><Zap size={14} className="text-yellow-400" /> {profile.role}</p>
                    <p>{profile.bio}</p>
                </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2 max-w-[65%]">
                {TAGS.map((tag, i) => (
                    <span key={i} className="px-3 py-1 rounded-full bg-white/5 border border-white/5 text-white/50 text-[10px] font-medium backdrop-blur-sm">
                        {tag}
                    </span>
                ))}
            </div>

            {/* Desktop Follow Button */}
            <div className={`hidden md:block ${getPosClasses(buttonPos, false)}`}>
                <AnimatePresence>
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                    >
                         <div className="min-w-[160px]" style={{ transform: `scale(${buttonScale})`, transformOrigin: getTransformOrigin(buttonPos) }}>
                            {RENDER_BUTTON(buttonStyle, {
                                text: isFollowing ? 'Connected' : buttonText,
                                onClick: handleFollow,
                                color: buttonColor
                            })}
                         </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Mobile Follow Button */}
            <div className={`md:hidden ${getPosClasses(buttonPos, true)}`}>
                <AnimatePresence>
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20, transition: { duration: 0.3 } }}
                        transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                        className="pointer-events-auto"
                    >
                         <div className="min-w-[160px]" style={{ transform: `scale(${buttonScale})`, transformOrigin: 'bottom center' }}>
                             {RENDER_BUTTON(buttonStyle, {
                                 text: isFollowing ? 'Connected' : buttonText,
                                 onClick: handleFollow,
                                 color: buttonColor
                             })}
                         </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    </div>
  );
};




