import * as React from 'react';
import { WidgetData } from '../../../types';
import { Gamepad2, Palette, Cpu, Smile, Globe, Music, Camera, Plus, Code, Users } from 'lucide-react';

interface Props {
    data: WidgetData;
    onNavigate?: (view: string, context?: any) => void;
}

const COMMUNITIES_PREVIEW = [
    { id: 'c1', name: 'WebGL', icon: Code, img: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200' },
    { id: 'c2', name: 'Analog', icon: Camera, img: 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=200' },
    { id: 'c3', name: 'Decks', icon: Cpu, img: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=200' },
    { id: 'c4', name: 'Tokyo', icon: Globe, img: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=200' },
    { id: 'c5', name: 'Synth', icon: Music, img: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=200' },
    { id: 'c6', name: 'Games', icon: Gamepad2, img: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=200' },
    { id: 'c7', name: 'Art', icon: Palette, img: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=200' },
];

const HubFeedWidget: React.FC<Props> = ({ data, onNavigate }) => {
  
  const handleCommunityClick = (id: string) => {
      if (onNavigate) {
          onNavigate('community-hub', { communityId: id });
      }
  };

  const handleExplore = () => {
      if (onNavigate) {
          onNavigate('community-hub', { mode: 'explore' });
      }
  };

  return (
    <div className="w-full h-full flex flex-col p-6">
       <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2.5">
              <Users size={20} className="text-white" />
              <h3 className="text-xl font-bold text-white tracking-tight font-display">Communities</h3>
          </div>
          <span className="text-xs font-medium text-white/40 bg-white/5 px-2 py-1 rounded-full">Active Nodes</span>
      </div>

      <div className="grid grid-cols-4 gap-3 flex-1 content-start">
         {/* Render Preview Communities */}
         {COMMUNITIES_PREVIEW.map((item) => (
             <div 
                key={item.id} 
                onClick={() => handleCommunityClick(item.id)}
                className="flex flex-col items-center gap-2 group cursor-pointer"
             >
                 <div className="w-full aspect-square rounded-2xl bg-white/5 border border-white/5 overflow-hidden relative shadow-lg">
                     <img src={item.img} className="w-full h-full object-cover opacity-60 group-hover:opacity-90 group-hover:scale-110 transition-all duration-500" />
                     <div className="absolute inset-0 flex items-center justify-center">
                         <item.icon size={20} className="text-white drop-shadow-md opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0" />
                     </div>
                 </div>
                 <span className="text-[10px] font-medium text-white/40 group-hover:text-white transition-colors">{item.name}</span>
             </div>
         ))}

         {/* The "Plus" / Find Community Button */}
         <div 
            onClick={handleExplore}
            className="flex flex-col items-center gap-2 group cursor-pointer"
         >
             <div className="w-full aspect-square rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center overflow-hidden relative group-hover:border-white/30 transition-all shadow-[0_0_15px_rgba(168,85,247,0.15)] group-hover:shadow-[0_0_25px_rgba(168,85,247,0.3)]">
                 <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                 <Plus size={24} className="text-white opacity-70 group-hover:opacity-100 group-hover:scale-110 transition-all" />
             </div>
             <span className="text-[10px] font-bold text-indigo-300 group-hover:text-white transition-colors">Join</span>
         </div>
      </div>
    </div>
  );
};

export default HubFeedWidget;




