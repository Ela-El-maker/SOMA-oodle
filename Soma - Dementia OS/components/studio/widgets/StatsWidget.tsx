import * as React from 'react';
import { WidgetData } from '../../../types';
import { Crown, MoreHorizontal, UserPlus, Zap } from 'lucide-react';

interface Props {
    data: WidgetData;
}

const TOP_FRIENDS = [
    { id: 1, name: 'Kaito', img: 'https://images.unsplash.com/photo-1528892952291-009c663ce843?w=150', online: true },
    { id: 2, name: 'Sarah_V', img: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', online: false },
    { id: 3, name: 'Neon', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', online: true },
    { id: 4, name: 'Void', img: 'https://images.unsplash.com/photo-1511447333015-45b65e60f6d5?w=150', online: true },
    { id: 5, name: 'Glitch', img: 'https://images.unsplash.com/photo-1515630278258-407f66498911?w=150', online: false },
    { id: 6, name: 'Echo', img: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', online: false },
    { id: 7, name: 'Mina', img: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150', online: true },
    { id: 8, name: 'Ghost', img: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150', online: false },
];

const StatsWidget: React.FC<Props> = ({ data }) => {
  return (
    <div className="w-full h-full flex flex-col p-4 bg-[#0A0A0A] relative group overflow-hidden">
      {/* Subtle Grid Background */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:radial-gradient(black,transparent_80%)] pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-3 shrink-0 z-10">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                 <Crown size={14} className="text-orange-500 fill-orange-500" /> Top 8
            </h3>
          </div>
          <div className="flex gap-2">
              <button className="text-white/20 hover:text-white transition-colors">
                  <UserPlus size={14} />
              </button>
          </div>
      </div>

      {/* Friends Grid */}
      <div className="flex-1 grid grid-cols-4 gap-x-2 gap-y-2 content-start overflow-y-auto pr-1 scrollbar-none z-10">
          {TOP_FRIENDS.map((friend) => (
              <div 
                key={friend.id} 
                className="flex flex-col items-center gap-1 group/friend cursor-pointer relative"
              >
                  <div className="w-full aspect-square relative rounded-md overflow-hidden bg-white/5 border border-white/10 group-hover/friend:border-orange-500/50 transition-all duration-300">
                      <img 
                        src={friend.img} 
                        alt={friend.name}
                        className="w-full h-full object-cover opacity-80 group-hover/friend:opacity-100 group-hover/friend:scale-110 transition-all duration-500 grayscale group-hover/friend:grayscale-0"
                      />
                      
                      {/* Rank Badge for #1 */}
                      {friend.id === 1 && (
                          <div className="absolute top-0 left-0 bg-orange-500 text-black text-[9px] font-black px-1.5 py-0.5 rounded-br-md">
                              #1
                          </div>
                      )}

                      {/* Online Status Dot */}
                      {friend.online && (
                          <div className="absolute bottom-1 right-1 w-2 h-2 bg-emerald-500 rounded-full border border-black shadow-[0_0_8px_rgba(16,185,129,0.8)]"></div>
                      )}
                  </div>
                  
                  <div className="text-center w-full">
                      <span className="text-[9px] font-medium text-white/50 group-hover/friend:text-white truncate block w-full transition-colors leading-tight">
                          {friend.name}
                      </span>
                  </div>
              </div>
          ))}
      </div>
      
      {/* Edit Top 8 Link */}
      <div className="mt-auto pt-2 border-t border-white/5 flex justify-center items-center z-10">
          <button className="text-[9px] font-mono text-white/30 hover:text-orange-400 uppercase tracking-widest flex items-center gap-1 transition-colors">
              <Zap size={10} /> Edit Your Top 8
          </button>
      </div>
    </div>
  );
};

export default StatsWidget;




