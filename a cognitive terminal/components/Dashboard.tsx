import React, { useState, useEffect } from 'react';

interface AgentStatus {
    name: string;
    status: 'active' | 'standby' | 'error';
    role: string;
    category: 'core' | 'learning' | 'memory' | 'execution' | 'infrastructure';
    details?: string;
    clickable?: boolean;
}

interface MemoryStats {
    activeTurns: number;
    totalTurns: number;
    totalLearnings: number;
    compressed: boolean;
}

interface DashboardProps {
    isOpen: boolean;
    onToggle: () => void;
    isLoading: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({ isOpen, onToggle, isLoading }) => {
    const [agents, setAgents] = useState<AgentStatus[]>([]);
    const [memory, setMemory] = useState<MemoryStats | null>(null);
    const [dreamStatus, setDreamStatus] = useState<any>(null);
    const [selectedAgent, setSelectedAgent] = useState<AgentStatus | null>(null);
    const [activeView, setActiveView] = useState<'agents' | 'network'>('agents');

    // Fetch status every 5 seconds
    useEffect(() => {
        const fetchStatus = async () => {
            try {
                // Get dream status
                const dreamRes = await fetch('http://localhost:3001/api/dream/status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                if (dreamRes.ok) {
                    const data = await dreamRes.json();
                    setDreamStatus(data.dreamArbiter);
                    
                    // Update all agents
                    setAgents([
                        // Core Cognitive
                        { name: 'TriBrain', status: data.tribrain.prometheus === 'ready' ? 'active' : 'standby', role: '3-Model Reasoning', category: 'core', clickable: true },
                        { name: 'DreamArbiter', status: data.dreamArbiter.running ? 'active' : 'standby', role: 'Autonomous Learning', category: 'learning', details: data.dreamArbiter.running ? `Cycle ${data.dreamArbiter.cycleCount}` : undefined, clickable: true },
                        { name: 'ConductorArbiter', status: 'active', role: 'Orchestration', category: 'core', clickable: true },
                        { name: 'AnalystArbiter', status: 'active', role: 'Code Analysis', category: 'execution', clickable: true },
                        
                        // Memory Systems
                        { name: 'MnemonicArbiter', status: 'active', role: '3-Tier Memory', category: 'memory', clickable: true },
                        { name: 'UnifiedMemoryArbiter', status: 'standby', role: 'Unified Memory', category: 'memory' },
                        { name: 'ArchivistArbiter', status: 'standby', role: 'Long-term Storage', category: 'memory' },
                        { name: 'StorageArbiter', status: 'active', role: 'Data Persistence', category: 'memory' },
                        
                        // Learning & Training
                        { name: 'AsyncGradientArbiter', status: 'standby', role: 'Gradient Learning', category: 'learning' },
                        { name: 'GPUTrainingArbiter', status: 'standby', role: 'GPU Training', category: 'learning' },
                        { name: 'TrainingSwarmArbiter', status: 'standby', role: 'Swarm Training', category: 'learning' },
                        { name: 'MixedPrecisionArbiter', status: 'standby', role: 'Precision Optimization', category: 'learning' },
                        
                        // Execution & Workers
                        { name: 'EdgeWorker', status: 'standby', role: 'Web Research', category: 'execution', clickable: true },
                        { name: 'EdgeWorkerArbiter', status: 'standby', role: 'Edge Processing', category: 'execution' },
                        { name: 'LoadPipelineArbiter', status: 'standby', role: 'Load Balancing', category: 'execution' },
                        { name: 'VisionProcessingArbiter', status: 'standby', role: 'Vision AI', category: 'execution' },
                        
                        // Infrastructure
                        { name: 'TimekeeperArbiter', status: 'active', role: 'Scheduling', category: 'infrastructure' },
                        { name: 'DeploymentArbiter', status: 'standby', role: 'Deployment', category: 'infrastructure' },
                        { name: 'SelfModificationArbiter', status: 'standby', role: 'Self-Modification', category: 'infrastructure' },
                        { name: 'GenomeArbiter', status: 'standby', role: 'Evolution', category: 'infrastructure' },
                    ]);
                }

                // Get memory stats from localStorage
                const memData = localStorage.getItem('soma_memory');
                if (memData) {
                    const parsed = JSON.parse(memData);
                    const session = parsed.currentSession;
                    setMemory({
                        activeTurns: session.turns?.length || 0,
                        totalTurns: (session.turns?.length || 0) + (session.compressed?.turnCount || 0),
                        totalLearnings: session.compressed?.learnings?.length || 0,
                        compressed: !!session.compressed
                    });
                }
            } catch (error) {
                console.warn('[Dashboard] Failed to fetch status:', error);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 5000);
        return () => clearInterval(interval);
    }, []);

    const statusColor = (status: AgentStatus['status']) => {
        switch (status) {
            case 'active': return 'bg-emerald-400';
            case 'standby': return 'bg-amber-400';
            case 'error': return 'bg-rose-400';
            default: return 'bg-zinc-500';
        }
    };

    return (
        <>
            {/* Sidebar */}
            <div
                className={`fixed left-0 top-0 h-screen w-64 bg-[#0a0a0c]/95 backdrop-blur-xl border-r border-white/10 z-40 transition-transform duration-300 ease-out ${
                    isOpen ? 'translate-x-0' : '-translate-x-full'
                }`}
            >
                <div className="p-6 h-full flex flex-col">
                    {/* Header */}
                    <div className="mb-4">
                        <h2 className="text-xl font-bold text-white/90 flex items-center">
                            <span className="text-cyan-400 mr-2">⚡</span>
                            System Status
                        </h2>
                        <p className="text-xs text-zinc-500 mt-1">Real-time monitoring</p>
                        
                        {/* View Toggle */}
                        <div className="flex gap-2 mt-3">
                            <button
                                onClick={() => setActiveView('agents')}
                                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    activeView === 'agents'
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                        : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'
                                }`}
                            >
                                Agents
                            </button>
                            <button
                                onClick={() => setActiveView('network')}
                                className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                                    activeView === 'network'
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                        : 'bg-white/5 text-zinc-400 border border-white/5 hover:bg-white/10'
                                }`}
                            >
                                Network
                            </button>
                        </div>
                    </div>

                    {/* Content based on active view */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar">
                        {activeView === 'agents' && (
                            <div className="space-y-4">
                                {['core', 'learning', 'memory', 'execution', 'infrastructure'].map(category => {
                                    const categoryAgents = agents.filter(a => a.category === category);
                                    if (categoryAgents.length === 0) return null;
                                    
                                    return (
                                        <div key={category} className="mb-4">
                                            <h3 className="text-xs font-semibold text-white/50 mb-2 uppercase tracking-wider">
                                                {category}
                                            </h3>
                                            <div className="space-y-1.5">
                                                {categoryAgents.map((agent) => (
                                                    <div
                                                        key={agent.name}
                                                        onClick={() => agent.clickable && setSelectedAgent(agent)}
                                                        className={`p-2 rounded-lg bg-white/5 border border-white/5 transition-all ${
                                                            agent.clickable ? 'hover:border-cyan-400/30 cursor-pointer hover:bg-white/10' : ''
                                                        } ${selectedAgent?.name === agent.name ? 'border-cyan-400/50 bg-cyan-500/10' : ''}`}
                                                    >
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center space-x-2">
                                                                <div className={`w-1.5 h-1.5 rounded-full ${statusColor(agent.status)} shadow-lg`}></div>
                                                                <span className="text-xs font-medium text-white/90">{agent.name}</span>
                                                            </div>
                                                            {agent.details && (
                                                                <span className="text-[10px] text-cyan-400">{agent.details}</span>
                                                            )}
                                                        </div>
                                                        <p className="text-[10px] text-zinc-500 ml-3.5 mt-0.5">{agent.role}</p>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                        
                        {activeView === 'network' && (
                            <div className="h-full">
                                <NetworkDiagram agents={agents} />
                            </div>
                        )}
                    </div>

                    {/* Memory Section */}
                    {memory && (
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wider">Memory</h3>
                            <div className="p-3 rounded-lg bg-white/5 border border-white/5">
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Active:</span>
                                        <span className="text-white/90 font-mono">{memory.activeTurns}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Total:</span>
                                        <span className="text-white/90 font-mono">{memory.totalTurns}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-zinc-400">Learnings:</span>
                                        <span className="text-emerald-400 font-mono">{memory.totalLearnings}</span>
                                    </div>
                                    {memory.compressed && (
                                        <div className="mt-2 pt-2 border-t border-white/10">
                                            <span className="text-xs text-cyan-400">✓ Compressed</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Dream Status */}
                    {dreamStatus?.running && (
                        <div className="mb-6">
                            <h3 className="text-sm font-semibold text-white/70 mb-3 uppercase tracking-wider">Learning</h3>
                            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                                <div className="flex items-center space-x-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                    <span className="text-sm text-emerald-400 font-medium">Dream Active</span>
                                </div>
                                <div className="text-xs space-y-1">
                                    <div className="flex justify-between text-zinc-400">
                                        <span>Runtime:</span>
                                        <span className="font-mono">{dreamStatus.runtime}s</span>
                                    </div>
                                    <div className="flex justify-between text-zinc-400">
                                        <span>Cycles:</span>
                                        <span className="font-mono">{dreamStatus.cycleCount}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Processing Indicator */}
                    {isLoading && (
                        <div className="mt-auto">
                            <div className="flex items-center space-x-2 text-cyan-400">
                                <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></div>
                                <span className="text-xs">Processing...</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Overlay when open */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30"
                    onClick={onToggle}
                ></div>
            )}
        </>
    );
};

// Network Diagram Component
const NetworkDiagram: React.FC<{ agents: AgentStatus[] }> = ({ agents }) => {
    const activeCount = agents.filter(a => a.status === 'active').length;
    const standbyCount = agents.filter(a => a.status === 'standby').length;
    
    return (
        <div className="h-full flex flex-col">
            <div className="mb-3 px-4">
                <h3 className="text-sm font-semibold text-white/70 mb-2">Live Network Topology</h3>
                <div className="flex gap-4 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                        <span className="text-zinc-400">Active: {activeCount}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-400"></div>
                        <span className="text-zinc-400">Standby: {standbyCount}</span>
                    </div>
                </div>
                <p className="text-[10px] text-zinc-500 mt-1">Updates every 5 seconds</p>
            </div>
            
            {/* Central Hub - Full height, centered */}
            <div className="relative flex-1 flex items-center justify-center overflow-hidden">
                {/* Center - TriBrain Core */}
                <div className="absolute z-10 w-20 h-20 rounded-full bg-gradient-to-br from-cyan-500/30 to-purple-500/30 border-2 border-cyan-400/50 flex items-center justify-center backdrop-blur-sm">
                    <div className="text-center">
                        <div className="text-xs font-bold text-cyan-400">TriBrain</div>
                        <div className="text-[8px] text-zinc-500">Core</div>
                    </div>
                </div>
                
                {/* Orbiting Agents */}
                {agents.filter(a => a.status === 'active').map((agent, index) => {
                    const angle = (index / activeCount) * 2 * Math.PI;
                    const radius = 120;
                    const x = Math.cos(angle) * radius;
                    const y = Math.sin(angle) * radius;
                    
                    return (
                        <div
                            key={agent.name}
                            className="absolute"
                            style={{
                                transform: `translate(${x}px, ${y}px)`,
                                transition: 'all 0.3s ease-out'
                            }}
                        >
                            {/* Connection line to center */}
                            <svg
                                className="absolute top-1/2 left-1/2 pointer-events-none"
                                style={{
                                    width: Math.abs(x) + 50,
                                    height: Math.abs(y) + 50,
                                    transform: `translate(-50%, -50%)`
                                }}
                            >
                                <line
                                    x1="50%"
                                    y1="50%"
                                    x2={x > 0 ? '0%' : '100%'}
                                    y2={y > 0 ? '0%' : '100%'}
                                    stroke="rgba(34, 211, 238, 0.2)"
                                    strokeWidth="1"
                                    className="animate-pulse"
                                />
                            </svg>
                            
                            {/* Agent Node */}
                            <div className="relative w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center group hover:scale-110 transition-transform cursor-pointer">
                                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                                
                                {/* Tooltip */}
                                <div className="absolute top-full mt-2 hidden group-hover:block z-20 whitespace-nowrap">
                                    <div className="bg-black/90 border border-white/10 rounded px-2 py-1">
                                        <div className="text-[10px] font-medium text-white">{agent.name}</div>
                                        <div className="text-[8px] text-zinc-400">{agent.role}</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                
                {/* Data flow particles */}
                <div className="absolute inset-0 pointer-events-none">
                    {[...Array(6)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute w-1 h-1 rounded-full bg-cyan-400/60"
                            style={{
                                animation: `flow${i % 3} ${3 + i * 0.5}s infinite linear`,
                                left: '50%',
                                top: '50%'
                            }}
                        />
                    ))}
                </div>
            </div>
            
            {/* Add animation keyframes */}
            <style>{`
                @keyframes flow0 {
                    0% { transform: translate(0, 0); opacity: 0; }
                    10% { opacity: 1; }
                    50% { transform: translate(120px, 0); opacity: 1; }
                    60% { opacity: 0; }
                    100% { transform: translate(120px, 0); opacity: 0; }
                }
                @keyframes flow1 {
                    0% { transform: translate(0, 0); opacity: 0; }
                    10% { opacity: 1; }
                    50% { transform: translate(-120px, 0); opacity: 1; }
                    60% { opacity: 0; }
                    100% { transform: translate(-120px, 0); opacity: 0; }
                }
                @keyframes flow2 {
                    0% { transform: translate(0, 0); opacity: 0; }
                    10% { opacity: 1; }
                    50% { transform: translate(0, 120px); opacity: 1; }
                    60% { opacity: 0; }
                    100% { transform: translate(0, 120px); opacity: 0; }
                }
            `}</style>
        </div>
    );
};
