

import React, { useState } from 'react';
import { useSynapse } from '../context/SynapseContext';
import { LearningResource } from '../types';

export const Learn: React.FC = () => {
  const { learningResources, setLearningResources, addLearningResource, userConfig, socialPosts } = useSynapse();
  const [filter, setFilter] = useState<string>('all');
  const [activeArchiveId, setActiveArchiveId] = useState<string | null>(null);
  
  // Creation State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<'art' | 'code' | 'philosophy' | 'survival'>('philosophy');

  const handleVote = (id: string, direction: 'up' | 'down') => {
      const updated = learningResources.map(res => {
          if (res.id !== id) return res;

          let newResonance = res.resonance;
          let newVote = res.userVote;

          // Toggle Logic
          if (direction === 'up') {
              if (res.userVote === 'up') {
                  // Was up, remove vote
                  newResonance -= 5;
                  newVote = null;
              } else if (res.userVote === 'down') {
                  // Was down, switch to up (recover 5, add 5)
                  newResonance += 10;
                  newVote = 'up';
              } else {
                  // Was null, add up
                  newResonance += 5;
                  newVote = 'up';
              }
          } else {
              // Direction is down
              if (res.userVote === 'down') {
                  // Was down, remove vote
                  newResonance += 5;
                  newVote = null;
              } else if (res.userVote === 'up') {
                  // Was up, switch to down (remove 5, sub 5)
                  newResonance -= 10;
                  newVote = 'down';
              } else {
                  // Was null, add down
                  newResonance -= 5;
                  newVote = 'down';
              }
          }

          // Clamp between 0 and 100
          newResonance = Math.min(100, Math.max(0, newResonance));

          return { ...res, resonance: newResonance, userVote: newVote };
      });

      // Sort by resonance after vote
      updated.sort((a, b) => b.resonance - a.resonance);
      setLearningResources(updated);
  };

  const handleCreateSubmit = () => {
      if (!newTitle.trim() || !newContent.trim()) return;

      const newRes: LearningResource = {
          id: `res-${Date.now()}`,
          title: newTitle,
          author: userConfig.displayName,
          category: newCategory,
          content: newContent,
          resonance: 50, // Start neutral
          userVote: null,
          tags: ['user-created', newCategory],
          timestamp: Date.now()
      };
      
      addLearningResource(newRes);
      setNewTitle('');
      setNewContent('');
      setShowCreateModal(false);
  };

  const filteredResources = filter === 'all' 
    ? learningResources 
    : learningResources.filter(r => r.category === filter);

  // Get active item for modal
  const activeArchiveItem = learningResources.find(r => r.id === activeArchiveId);

  // Category styling helper
  const getCategoryColor = (cat: string) => {
      switch(cat) {
          case 'art': return 'from-pink-900/50 to-purple-900/50 border-pink-500/30';
          case 'code': return 'from-blue-900/50 to-cyan-900/50 border-blue-500/30';
          case 'philosophy': return 'from-amber-900/50 to-orange-900/50 border-amber-500/30';
          case 'survival': return 'from-emerald-900/50 to-green-900/50 border-emerald-500/30';
          default: return 'from-zinc-900 to-zinc-800 border-zinc-700';
      }
  };

  // --- RATING COMPONENT (Amazon Style Stars) ---
  const StarRating = ({ percentage }: { percentage: number }) => {
      const stars = Math.round((percentage / 100) * 5);
      
      return (
          <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                  <svg 
                    key={s} 
                    className={`w-4 h-4 ${s <= stars ? 'text-amber-400 fill-amber-400' : 'text-zinc-600 fill-zinc-600/20'}`} 
                    viewBox="0 0 24 24"
                  >
                      <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
                  </svg>
              ))}
          </div>
      );
  };

  return (
    <div className="h-full w-full bg-zinc-950 pt-[72px] px-6 overflow-y-auto relative">
        
        {/* Header */}
        <div className="max-w-6xl mx-auto py-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
                <h1 className="text-4xl font-light tracking-tight text-white mb-2">The Archive</h1>
                <p className="text-zinc-500 max-w-2xl text-sm md:text-base">
                    Decentralized knowledge repository. Curated via neural resonance.
                </p>
            </div>
            <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-white text-black px-6 py-2 rounded-lg font-bold hover:bg-zinc-200 transition-colors shadow-lg shadow-white/5"
            >
                + Contribute
            </button>
        </div>

        {/* Filters */}
        <div className="max-w-6xl mx-auto flex gap-4 mb-8 overflow-x-auto pb-2 scrollbar-hide">
            {['all', 'art', 'code', 'philosophy', 'survival'].map(cat => (
                <button 
                    key={cat}
                    onClick={() => setFilter(cat)}
                    className={`px-4 py-2 rounded-lg text-sm font-mono border capitalize transition-all ${
                        filter === cat 
                        ? 'bg-zinc-100 text-black border-zinc-100' 
                        : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:border-zinc-600'
                    }`}
                >
                    {cat}
                </button>
            ))}
        </div>

        {/* Grid */}
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-20">
            {filteredResources.map(res => (
                <div key={res.id} className="bg-zinc-900 border border-white/5 rounded-xl p-6 hover:border-white/10 transition-colors group relative overflow-hidden flex flex-col shadow-xl">
                    {/* Background glow for high resonance */}
                    {res.resonance > 80 && (
                        <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none"></div>
                    )}

                    <div className="flex justify-between items-start mb-4">
                        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded ${
                            res.category === 'art' ? 'bg-pink-900/30 text-pink-400' :
                            res.category === 'code' ? 'bg-blue-900/30 text-blue-400' :
                            res.category === 'survival' ? 'bg-green-900/30 text-green-400' :
                            'bg-zinc-800 text-zinc-400'
                        }`}>
                            {res.category}
                        </span>
                        
                        {/* STAR RATING DISPLAY */}
                        <div className="flex flex-col items-end">
                             <StarRating percentage={res.resonance} />
                             <span className="text-[10px] text-zinc-500">{res.resonance}% Positive</span>
                        </div>
                    </div>

                    <h3 
                        onClick={() => setActiveArchiveId(res.id)}
                        className="text-xl font-bold text-white mb-2 leading-tight group-hover:text-blue-400 transition-colors cursor-pointer"
                    >
                        {res.title}
                    </h3>
                    
                    {/* RESEARCH FLAG */}
                    {res.resonance < 30 ? (
                        <div className="mb-4 inline-flex items-center gap-1.5 px-2 py-1 bg-red-950/50 border border-red-500/20 rounded w-fit">
                            <svg className="w-3 h-3 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Needs Research</span>
                        </div>
                    ) : (
                        <p className="text-zinc-400 text-sm mb-4 line-clamp-3">{res.content}</p>
                    )}

                    <div className="mt-auto flex items-center justify-between border-t border-white/5 pt-4">
                        <span className="text-xs text-zinc-600">by {res.author}</span>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => handleVote(res.id, 'up')} 
                                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${res.userVote === 'up' ? 'bg-white text-black' : 'bg-zinc-800 text-zinc-300 hover:text-white'}`}
                            >
                                ▲ Up
                            </button>
                            <button 
                                onClick={() => handleVote(res.id, 'down')} 
                                className={`px-2 py-1 rounded text-xs font-bold transition-colors ${res.userVote === 'down' ? 'bg-red-900/50 text-red-400' : 'bg-zinc-800 text-zinc-300 hover:text-red-400'}`}
                            >
                                ▼ Down
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* CREATE MODAL */}
        {showCreateModal && (
            <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-2xl shadow-2xl animate-[float_0.3s_ease-out] overflow-hidden">
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-white mb-6">Contribute Knowledge</h2>
                        
                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Title</label>
                        <input 
                            className="w-full bg-black border border-zinc-700 rounded p-3 text-white mb-4 focus:outline-none focus:border-blue-500"
                            placeholder="Archive Title..."
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                        />

                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Category</label>
                        <div className="grid grid-cols-4 gap-2 mb-4">
                            {(['art', 'code', 'philosophy', 'survival'] as const).map(cat => (
                                <button 
                                    key={cat} 
                                    onClick={() => setNewCategory(cat)}
                                    className={`py-2 rounded text-xs font-bold border capitalize ${newCategory === cat ? 'bg-zinc-100 text-black border-white' : 'border-zinc-700 text-zinc-500'}`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <label className="block text-xs font-bold text-zinc-500 uppercase mb-2">Content / Insight</label>
                        <textarea 
                            className="w-full bg-black border border-zinc-700 rounded p-3 text-white h-32 resize-none focus:outline-none focus:border-blue-500 mb-6"
                            placeholder="Share your knowledge..."
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                        />

                        <div className="flex justify-end gap-3">
                            <button onClick={() => setShowCreateModal(false)} className="px-4 py-2 text-zinc-400 hover:text-white">Cancel</button>
                            <button onClick={handleCreateSubmit} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded">Publish</button>
                        </div>
                    </div>
                </div>
            </div>
        )}

        {/* ARCHIVE DETAIL MODAL */}
        {activeArchiveItem && (
             <div className="fixed inset-0 z-[100] bg-zinc-950 flex flex-col animate-in slide-in-from-bottom duration-500 overflow-hidden">
                 
                 {/* Nav Bar */}
                 <div className="h-16 flex items-center justify-between px-6 border-b border-white/10 shrink-0 bg-black/50 backdrop-blur">
                     <div className="flex items-center gap-3">
                        <button onClick={() => setActiveArchiveId(null)} className="p-2 hover:bg-zinc-800 rounded-full">
                             <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                        </button>
                        <span className="text-zinc-500 text-sm uppercase tracking-widest font-mono">Archive // {activeArchiveItem.category}</span>
                     </div>
                     <div className="flex gap-4">
                         <button className="text-zinc-400 hover:text-white text-sm font-bold">Share</button>
                     </div>
                 </div>

                 {/* Content Scroll */}
                 <div className="flex-1 overflow-y-auto p-6 md:p-12">
                     <div className="max-w-3xl mx-auto">
                         
                         <div className="flex items-start justify-between mb-2">
                             <h1 className="text-4xl md:text-6xl font-black text-white leading-none tracking-tight">{activeArchiveItem.title}</h1>
                             <div className="hidden md:flex flex-col items-end">
                                 <StarRating percentage={activeArchiveItem.resonance} />
                                 <span className="text-sm font-bold text-zinc-500 mt-1">{activeArchiveItem.resonance}% Resonance Score</span>
                             </div>
                         </div>
                         
                         <div className="flex items-center gap-4 mb-8 pb-8 border-b border-white/10 mt-6">
                             <div className="w-12 h-12 rounded-full bg-zinc-800 flex items-center justify-center text-white font-bold border border-white/10">
                                 {activeArchiveItem.author.substring(0,2)}
                             </div>
                             <div>
                                 <div className="text-white font-bold">@{activeArchiveItem.author}</div>
                                 <div className="text-zinc-500 text-xs">{new Date(activeArchiveItem.timestamp).toLocaleDateString()}</div>
                             </div>
                             <div className="ml-auto flex gap-2">
                                 {activeArchiveItem.tags.map(t => (
                                     <span key={t} className="px-2 py-1 bg-zinc-900 rounded text-xs text-zinc-400 border border-zinc-800">#{t}</span>
                                 ))}
                             </div>
                         </div>

                         {/* FLAG for Low Resonance - Detail View */}
                         {activeArchiveItem.resonance < 30 && (
                            <div className="bg-red-950/20 border border-red-900/50 p-6 rounded-xl mb-8 flex items-start gap-4">
                                <div className="p-2 bg-red-900/30 rounded-lg">
                                    <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                                </div>
                                <div>
                                    <h4 className="text-red-400 font-bold uppercase tracking-wider text-base mb-1">Low Resonance Signal</h4>
                                    <p className="text-red-300/70 text-sm leading-relaxed">
                                        The network has flagged this archive for review due to poor reception. 
                                        Information contained herein may be unverified, subjective slop, or cognitively hazardous.
                                        Proceed with skepticism.
                                    </p>
                                </div>
                            </div>
                         )}

                         <div className="prose prose-invert prose-lg max-w-none">
                             <p className="font-serif text-xl leading-relaxed text-zinc-300 whitespace-pre-wrap">{activeArchiveItem.content}</p>
                         </div>

                         {/* Code Block Display */}
                         {activeArchiveItem.codeSnippet && (
                             <div className="mt-10 rounded-xl overflow-hidden border border-zinc-800 bg-black shadow-2xl">
                                 <div className="bg-zinc-900 px-4 py-2 flex items-center gap-2 border-b border-zinc-800">
                                     <div className="w-3 h-3 rounded-full bg-red-500"></div>
                                     <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                                     <div className="w-3 h-3 rounded-full bg-green-500"></div>
                                     <span className="ml-2 text-xs text-zinc-500 font-mono">code_snippet.js</span>
                                 </div>
                                 <pre className="p-6 overflow-x-auto text-sm font-mono text-emerald-400 leading-relaxed">
                                     {activeArchiveItem.codeSnippet}
                                 </pre>
                             </div>
                         )}

                         {/* Referenced Media Display (Brain Rot Connections) */}
                         {activeArchiveItem.relatedMediaIds && activeArchiveItem.relatedMediaIds.length > 0 && (
                             <div className="mt-12 pt-8 border-t border-white/10">
                                 <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                                     <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" /></svg>
                                     Referenced Media
                                 </h3>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     {socialPosts.filter(p => activeArchiveItem.relatedMediaIds?.includes(p.id)).map(media => (
                                         <div key={media.id} className="bg-zinc-900 rounded-xl overflow-hidden border border-white/5 group hover:border-white/20 transition-colors">
                                             <div className="h-48 relative">
                                                 <img src={media.mediaUrl} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                                                 <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur rounded text-[10px] text-white uppercase font-bold">
                                                     {media.type === 'aspect' ? 'Aspect' : 'Slop'}
                                                 </div>
                                             </div>
                                             <div className="p-4">
                                                 <div className="text-white font-bold text-sm mb-1">@{media.author}</div>
                                                 <div className="text-zinc-500 text-xs line-clamp-2">{media.caption}</div>
                                             </div>
                                         </div>
                                     ))}
                                 </div>
                             </div>
                         )}
                         
                         {/* Bottom Spacer */}
                         <div className="h-20"></div>
                     </div>
                 </div>
             </div>
        )}
    </div>
  );
};



