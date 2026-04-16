const fs = require('fs');

const filePath = 'frontend/apps/command-bridge/SomaCommandBridge.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const startTag = "{activeModule === 'command' && (";
const endTag = "{activeModule === 'settings' && (";

const startIndex = content.indexOf(startTag);
const endIndex = content.indexOf(endTag);

if (startIndex === -1 || endIndex === -1) {
  console.error("Could not find start or end tags");
  process.exit(1);
}

// Find the closing brace of the command module (usually just before the endTag)
// Actually we can just slice from startIndex to endTag and replace that entire chunk with the new cockpit + endTag.

const oldChunk = content.slice(startIndex, endIndex);

const newCockpit = `        {activeModule === 'command' && (
          <div className="h-full flex flex-col gap-6 overflow-hidden">
            {/* Top: Branding & Global Status */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-baseline gap-3">
                  <h2 className="text-3xl font-black text-white tracking-tighter uppercase italic">Sovereign Link</h2>
                  <span className="text-[10px] font-mono text-fuchsia-500 font-bold opacity-50 px-2 py-0.5 rounded border border-fuchsia-500/20">v0.7_SOVEREIGN</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Neural Sensory Link Established</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => executeCommand('optimize_system', 'Optimize System')}
                  className="px-4 py-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 text-xs font-bold uppercase tracking-widest hover:bg-purple-500/20 transition-all flex items-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5" /> Optimize
                </button>
                <div className="h-8 w-[1px] bg-white/10" />
                <ArgusEye isConnected={isConnected} isVisionActive={isVisionActive} visionStream={visionStreamRef.current} onToggle={toggleVision} />
              </div>
            </div>

            {/* Main Stage: Brain (Orb) + Vision (Argus) */}
            <div className="flex-1 grid grid-cols-5 gap-6 overflow-hidden">
              
              {/* Left Columns (3): Primary Visual & Neural Core */}
              <div className="col-span-3 flex flex-col gap-4 overflow-hidden relative">
                
                {/* Upper: Vision (Project Argus) */}
                <div className="flex-1 bg-black/40 border border-white/5 rounded-[32px] relative overflow-hidden group">
                  <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
                    <Eye className="w-4 h-4 text-cyan-400" />
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Visual Cortex Feed</span>
                  </div>
                  <div className="h-full w-full relative">
                    <ArgusEye isConnected={isConnected} isInline={true} isVisionActive={isVisionActive} visionStream={visionStreamRef.current} />
                  </div>
                </div>

                {/* Lower: Bio-Link Gauges & Brain Sync */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-red-500/5 border border-red-500/10 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[8px] text-red-500/60 uppercase font-black tracking-widest">Heart Rate</p>
                      <p className="text-2xl font-mono text-red-400">72<span className="text-xs ml-1">BPM</span></p>
                    </div>
                    <Activity className="w-8 h-8 text-red-500/20 animate-pulse" />
                  </div>
                  <div className="bg-cyan-500/5 border border-cyan-500/10 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[8px] text-cyan-500/60 uppercase font-black tracking-widest">Location</p>
                      <p className="text-xl font-black text-cyan-400 uppercase tracking-tighter truncate">{currentLocation}</p>
                    </div>
                    <Home className="w-8 h-8 text-cyan-500/20" />
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <p className="text-[8px] text-emerald-500/60 uppercase font-black tracking-widest">Identity</p>
                      <p className="text-xl font-black text-emerald-400 uppercase tracking-tighter truncate">{identifiedPerson}</p>
                    </div>
                    <User className="w-8 h-8 text-emerald-500/20" />
                  </div>
                </div>
              </div>

              {/* Right Columns (2): Personality Core & Transmission Logs */}
              <div className="col-span-2 flex flex-col gap-4 overflow-hidden">
                
                {/* Personality Core (Orb Small) */}
                <div className="h-1/2 bg-gradient-to-br from-[#0a0a0c] to-[#121215] border border-white/5 rounded-[32px] flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="scale-75 -mt-4">
                    <Orb 
                      ref={orbRef} 
                      volume={volume} 
                      isActive={isOrbConnected} 
                      isTalking={isTalking} 
                      isListening={isListening} 
                      isThinking={isThinking} 
                    />
                  </div>
                  
                  {/* Status Overlay */}
                  <div className="absolute top-6 left-6">
                    <h3 className="text-[10px] font-black text-zinc-600 uppercase tracking-[0.3em]">Personality Core</h3>
                  </div>

                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6 bg-black/40 backdrop-blur-md px-6 py-2.5 rounded-2xl border border-white/5">
                    <div className={\`w-1.5 h-1.5 rounded-full \${isListening ? 'bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-zinc-800'}\`} />
                    <div className={\`w-1.5 h-1.5 rounded-full \${isThinking ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.5)]' : 'bg-zinc-800'}\`} />
                    <div className={\`w-1.5 h-1.5 rounded-full \${isTalking ? 'bg-purple-400 shadow-[0_0_10px_rgba(192,132,252,0.5)]' : 'bg-zinc-800'}\`} />
                  </div>
                </div>

                {/* Transmission Logs (Conversation History) */}
                <div className="flex-1 bg-black/40 border border-white/5 rounded-[32px] flex flex-col overflow-hidden">
                  <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
                    <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">Transmission logs</h3>
                    <button onClick={() => setOrbConversation([])} className="text-[9px] text-zinc-600 hover:text-zinc-400 uppercase tracking-tighter transition-colors">Clear</button>
                  </div>
                  
                  <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
                    {orbConversation.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-zinc-700 opacity-30 text-center px-6">
                        <MessageSquare className="w-8 h-8 mb-2" />
                        <p className="text-[10px] uppercase font-bold tracking-widest">Awaiting Neural Link</p>
                      </div>
                    ) : (
                      orbConversation.map((msg, idx) => (
                        <div key={idx} className={\`flex flex-col \${msg.role === 'user' ? 'items-end' : 'items-start'}\`}>
                          <div className={\`max-w-[90%] p-2.5 rounded-xl text-xs \${
                            msg.role === 'user' 
                              ? 'bg-blue-500/10 border border-blue-500/20 text-blue-100 rounded-tr-none' 
                              : 'bg-purple-500/10 border border-purple-500/20 text-purple-100 rounded-tl-none'
                          }\`}>
                            {msg.text}
                          </div>
                          <span className="text-[7px] text-zinc-600 mt-1 uppercase font-mono">
                            {msg.role === 'user' ? 'Human' : 'SOMA'} • {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Manual Transmit */}
                  {isOrbConnected && (
                    <div className="p-3 border-t border-white/5">
                      <div className="bg-white/5 border border-white/10 rounded-xl p-1.5 flex items-center gap-2 focus-within:border-purple-500/50 transition-all">
                        <input
                          type="text"
                          placeholder="Transmit command..."
                          className="flex-1 bg-transparent border-none outline-none px-3 py-1 text-xs text-zinc-200 placeholder-zinc-600"
                          onKeyDown={(e) => { if (e.key === 'Enter' && e.target.value.trim()) { window.somaTextQuery(e.target.value.trim()); e.target.value = ''; } }}
                        />
                        <button onClick={() => { const input = document.querySelector('input[placeholder=\\'Transmit command...\\']'); if(input && input.value.trim()){ window.somaTextQuery(input.value.trim()); input.value = ''; } }} className="p-1.5 bg-purple-500/20 hover:bg-purple-500/40 text-purple-400 rounded-lg transition-all">
                          <Zap className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        `;

content = content.replace(oldChunk, newCockpit);
fs.writeFileSync(filePath, content, 'utf8');
console.log("Successfully patched SomaCommandBridge.jsx");
