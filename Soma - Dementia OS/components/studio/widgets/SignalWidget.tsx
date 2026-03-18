import * as React from 'react';
import { WidgetData } from '../../../types';
import { Radio, Github, Twitter, Linkedin, Instagram, ArrowUpRight, Dribbble, Youtube, Twitch, Mail, Music, Disc, Video, Share2 } from 'lucide-react';
import { RENDER_BUTTON } from '../ui/StyledButtons';

interface Props {
    data: WidgetData;
}

const SignalWidget: React.FC<Props> = ({ data }) => {
  const settings = data.settings || {};
  const content = data.content || {};
  const socials = content.socials || {};

  const buttonStyle = settings.buttonStyle || 'COSMOS';
  const buttonText = settings.buttonText || 'Contact';
  const buttonColor = settings.buttonColor || '#ffffff';

  const hasSocials = Object.values(socials).some(val => val && (val as string).length > 0);

  const getIcon = (key: string) => {
      switch(key) {
          case 'github': return <Github size={18} />;
          case 'twitter': return <Twitter size={18} />;
          case 'linkedin': return <Linkedin size={18} />;
          case 'instagram': return <Instagram size={18} />;
          case 'dribbble': return <Dribbble size={18} />;
          case 'youtube': return <Youtube size={18} />;
          case 'twitch': return <Twitch size={18} />;
          case 'email': return <Mail size={18} />;
          case 'tiktok': return <Video size={18} />;
          case 'discord': return <MessageIcon size={18} />; // Custom svg fallback if needed or generic
          case 'behance': return <Share2 size={18} />;
          case 'pinterest': return <Share2 size={18} />;
          case 'patreon': return <HeartIcon size={18} />;
          case 'spotify': return <Music size={18} />;
          case 'soundcloud': return <Disc size={18} />;
          default: return <ArrowUpRight size={18} />;
      }
  };

  return (
    <div className="w-full h-full flex flex-col justify-between p-6 relative overflow-visible bg-[#0A0A0A] group/widget">
      
        {/* Header */}
        <div className="flex items-center justify-between z-10">
            <div className="flex items-center gap-2 text-white/50">
                <Radio size={16} className={content.status === 'busy' ? 'text-red-400' : 'text-emerald-400'} />
                <span className="text-xs font-mono uppercase tracking-widest">Status</span>
            </div>
            <div className={`w-2 h-2 rounded-full ${content.status === 'busy' ? 'bg-red-500' : 'bg-emerald-500'} animate-pulse shadow-[0_0_10px_currentColor] text-emerald-500`}></div>
        </div>

        {/* Main Status */}
        <div className="flex-1 flex flex-col justify-center z-10 py-4">
            <h3 className="text-lg font-bold text-white mb-2 leading-tight">
                {content.headline || "Available for Work"}
            </h3>
            <p className="text-xs text-white/50 leading-relaxed font-light line-clamp-2">
                {content.subtext || "Specializing in React, WebGL, and Generative AI interfaces."}
            </p>
        </div>

        {/* Footer Area with Socials & Custom Button */}
        <div className="flex flex-col gap-4 z-10">
             {/* Social Row */}
             {hasSocials && (
                 <div className="flex gap-4 items-center px-1 overflow-x-auto no-scrollbar pb-1 mask-gradient-right">
                    {Object.entries(socials).map(([key, url]) => {
                        if (!url) return null;
                        return (
                            <a 
                                key={key} 
                                href={url as string} 
                                target="_blank" 
                                rel="noreferrer"
                                className="text-white/30 hover:text-white transition-colors hover:scale-110 transform duration-200"
                                title={key}
                            >
                                {getIcon(key)}
                            </a>
                        );
                    })}
                 </div>
             )}

             {/* The Custom Button */}
             <div className="w-full">
                 {RENDER_BUTTON(buttonStyle, {
                     text: buttonText,
                     onClick: () => window.location.href = `mailto:${socials.email || ''}`,
                     color: buttonColor
                 })}
             </div>
        </div>
        
        {/* Background Noise/Texture */}
        <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]"></div>
    </div>
  );
};

// Simple Fallback Icons
const MessageIcon = ({size}: {size: number}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
);
const HeartIcon = ({size}: {size: number}) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
);

export default SignalWidget;




