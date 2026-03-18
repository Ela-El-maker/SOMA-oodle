import * as React from 'react';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Plus, X, Share2, Heart, Eye, Download, Layers, Upload, Filter, Grid, Maximize2 } from 'lucide-react';
import { PortfolioItem, UserProfile } from '../../../types';
import { MOCK_PORTFOLIO } from '../constants';

interface Props {
  currentUser: UserProfile;
  onBack: () => void;
}

const PortfolioView: React.FC<Props> = ({ currentUser, onBack }) => {
  const [items, setItems] = useState<PortfolioItem[]>(MOCK_PORTFOLIO);
  const [selectedItem, setSelectedItem] = useState<PortfolioItem | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = ['All', ...Array.from(new Set(items.map(i => i.category)))];

  const filteredItems = activeCategory === 'All' 
    ? items 
    : items.filter(i => i.category === activeCategory);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newItem: PortfolioItem = {
          id: `new-${Date.now()}`,
          title: "New Upload",
          category: "Uncategorized",
          description: "Recently uploaded work.",
          year: new Date().getFullYear().toString(),
          image: reader.result as string,
          tags: ["Upload"],
          stats: { views: 0, likes: 0 }
        };
        setItems([newItem, ...items]);
        setSelectedItem(newItem); // Open detail view immediately
      };
      reader.readAsDataURL(file);
    }
  };

  // --- DETAIL OVERLAY (Cinematic) ---
  const DetailOverlay = ({ item, onClose }: { item: PortfolioItem; onClose: () => void }) => (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col overflow-y-auto"
    >
      <div className="relative w-full min-h-screen flex flex-col md:flex-row">
          
          {/* Close Button */}
          <button 
            onClick={onClose}
            className="fixed top-6 right-6 z-50 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-white hover:text-black transition-all"
          >
            <X size={24} />
          </button>

          {/* Image Section (Top on mobile, Left on Desktop) */}
          <div className="w-full md:w-2/3 h-[60vh] md:h-screen relative bg-neutral-900">
             <img src={item.image} className="w-full h-full object-contain md:object-cover" />
             <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent md:hidden" />
          </div>

          {/* Details Section (Bottom on mobile, Right on Desktop) */}
          <div className="w-full md:w-1/3 p-8 md:p-12 flex flex-col justify-center bg-black border-l border-white/5 min-h-[50vh]">
             
             <div className="mb-8">
                 <div className="flex items-center gap-3 text-xs font-mono uppercase tracking-widest text-white/40 mb-4">
                    <span>{item.category}</span>
                    <span className="w-1 h-1 bg-white/40 rounded-full" />
                    <span>{item.year}</span>
                 </div>
                 
                 <h1 className="text-4xl md:text-5xl font-display font-bold text-white mb-6 leading-tight">
                    {item.title}
                 </h1>

                 <div className="w-12 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mb-8" />

                 <p className="text-white/70 leading-relaxed text-lg font-light mb-8">
                    {item.description}
                 </p>

                 {/* Tags */}
                 <div className="flex flex-wrap gap-2 mb-12">
                    {item.tags.map(tag => (
                      <span key={tag} className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs text-white/60">
                        #{tag}
                      </span>
                    ))}
                 </div>
             </div>

             {/* Stats & Actions */}
             <div className="mt-auto border-t border-white/10 pt-8 flex items-center justify-between">
                 <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                        <span className="text-xl font-bold text-white">{item.stats?.likes}</span>
                        <span className="text-xs text-white/40 uppercase tracking-wider">Likes</span>
                    </div>
                    <div className="flex flex-col">
                        <span className="text-xl font-bold text-white">{item.stats?.views}</span>
                        <span className="text-xs text-white/40 uppercase tracking-wider">Views</span>
                    </div>
                 </div>

                 <div className="flex gap-2">
                     <button className="p-3 rounded-full bg-white/5 hover:bg-white text-white hover:text-black transition-all">
                        <Share2 size={18} />
                     </button>
                     <button className="p-3 rounded-full bg-white text-black hover:scale-105 transition-transform shadow-lg shadow-white/10">
                        <Heart size={18} fill="currentColor" />
                     </button>
                 </div>
             </div>
             
             {/* Awards / Extra Info */}
             <div className="mt-8 pt-6 border-t border-white/5">
                <h4 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-4">Awards & Recognition</h4>
                <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm text-white/60">
                        <span>Awwwards - Honorable Mention</span>
                        <span className="text-white/30">x02</span>
                    </div>
                    <div className="flex justify-between text-sm text-white/60">
                        <span>CSS Design Awards - UI Design</span>
                        <span className="text-white/30">x01</span>
                    </div>
                </div>
             </div>

          </div>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-black text-white flex flex-col md:flex-row font-sans">
      <AnimatePresence>
        {selectedItem && <DetailOverlay item={selectedItem} onClose={() => setSelectedItem(null)} />}
      </AnimatePresence>

      {/* --- DESKTOP SIDEBAR --- */}
      <aside className="hidden md:flex flex-col w-64 h-screen sticky top-0 border-r border-white/5 p-8 bg-black/50 backdrop-blur-xl z-20">
         <div className="mb-12">
            <button onClick={onBack} className="flex items-center gap-2 text-white/50 hover:text-white transition-colors mb-6">
               <ArrowLeft size={16} /> Back
            </button>
            <h1 className="text-2xl font-bold font-display tracking-tight">Portfolio</h1>
            <p className="text-xs text-white/40 mt-1 uppercase tracking-widest">Select Work</p>
         </div>

         <nav className="flex flex-col gap-2 flex-1">
            {categories.map(cat => (
               <button 
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`text-left py-2 px-4 rounded-lg text-sm transition-all ${
                     activeCategory === cat ? 'bg-white text-black font-bold' : 'text-white/50 hover:text-white hover:bg-white/5'
                  }`}
               >
                  {cat}
               </button>
            ))}
         </nav>

         <div className="mt-auto">
             <button 
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-3 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center gap-2 hover:bg-white/10 transition-all text-sm font-medium"
             >
                <Upload size={16} /> Upload Work
             </button>
             <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleUpload} />
         </div>
      </aside>

      {/* --- MOBILE HEADER --- */}
      <div className="md:hidden sticky top-0 z-30 bg-black/80 backdrop-blur-md border-b border-white/5 px-4 py-4 flex items-center justify-between">
          <button onClick={onBack} className="p-2 -ml-2 text-white/70">
              <ArrowLeft size={24} />
          </button>
          <span className="font-bold text-lg font-display">Portfolio</span>
          <button onClick={() => fileInputRef.current?.click()} className="p-2 text-white/70 hover:text-white">
              <Plus size={24} />
          </button>
      </div>
      
      {/* --- MOBILE CATEGORY FILTER --- */}
      <div className="md:hidden px-4 py-4 overflow-x-auto flex gap-2 no-scrollbar">
          {categories.map(cat => (
             <button 
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold border transition-colors ${
                   activeCategory === cat 
                   ? 'bg-white text-black border-white' 
                   : 'bg-transparent text-white/60 border-white/10'
                }`}
             >
                {cat}
             </button>
          ))}
      </div>

      {/* --- MAIN GRID --- */}
      <main className="flex-1 p-4 md:p-8 md:h-screen md:overflow-y-auto">
          <motion.div 
             layout
             className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8 pb-20"
          >
             <AnimatePresence>
                {filteredItems.map((item) => (
                   <motion.div 
                      layout
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      key={item.id}
                      onClick={() => setSelectedItem(item)}
                      className="group relative aspect-[4/5] md:aspect-square rounded-2xl overflow-hidden cursor-pointer bg-neutral-900 border border-white/5 break-inside-avoid"
                   >
                      <img 
                        src={item.image} 
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80 group-hover:opacity-100" 
                      />
                      
                      {/* Hover Overlay (Desktop) / Always visible gradient (Mobile) */}
                      <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent opacity-60 md:opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      
                      <div className="absolute bottom-0 left-0 right-0 p-6 translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-2 block">
                              {item.category}
                          </span>
                          <h3 className="text-xl font-bold text-white leading-none mb-1">{item.title}</h3>
                      </div>

                      <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-black/50 backdrop-blur-md p-2 rounded-full text-white">
                          <Maximize2 size={16} />
                      </div>
                   </motion.div>
                ))}
             </AnimatePresence>
          </motion.div>
      </main>

    </div>
  );
};

export default PortfolioView;




