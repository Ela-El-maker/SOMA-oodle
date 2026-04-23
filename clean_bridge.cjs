import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Cpu, Brain, HardDrive, Wifi, CheckCircle,
  Archive, Workflow, Database, Play, Pause, RotateCw, Trash2,
  Plus, Network, Settings, Palette,
  Shield, Users, Lightbulb, ThermometerSun, ChevronLeft,
  ChevronRight, Sparkles, Terminal, Circle, BarChart3, Search, X,
  Download, TrendingUp, TrendingDown, Target, Server, Gauge, Mail, Mic,
  Box, Share2, DollarSign, CircleDollarSign, Pencil, Eye, Activity, Clock, Zap, Home, User, MessageSquare, MessageCircle
} from 'lucide-react';
import {
  LineChart, Line, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import somaBackend from './somaBackend';
import { getSharedSessionId } from './utils/sharedSession';
import SomaCT from '../command-ct/SomaCT';
import Orb from './Orb';
import KevinInterface from './KevinInterface';

// Hooks & Components
import { useSomaAudio } from './hooks/useSomaAudio';
import { useRealtimeEvents } from './hooks/useRealtimeEvents';
import FloatingChat from './components/FloatingChat';
import MemoryTierMonitor from './components/MemoryTierMonitor';
import LearningVelocityDashboard from './components/LearningVelocityDashboard';
import AutonomousActivityFeed from './components/AutonomousActivityFeed';
import SkillProficiencyRadar from './components/SkillProficiencyRadar';
import BeliefNetworkViewer from './components/BeliefNetworkViewer';
import DreamInsights from './components/DreamInsights';
import TheoryOfMindPanel from './components/TheoryOfMindPanel';
import SystemDiagnosticsApp from './components/SystemDiagnosticsApp';
import SomaStatusStrip from './components/SomaStatusStrip';
import ProposedGoalModal from './components/ProposedGoalModal';
import SomaPlanViewer from './components/SomaPlanViewer';
import OnboardingWizard from './components/OnboardingWizard';
import ReasoningTree from './components/ReasoningTree';
import EmotionIndicator from './components/EmotionIndicator';

// STEVE & Workflow Integration
import { useAgentStore } from './lib/store';
import { WorkflowCanvas } from './components/workflow-editor/workflow-canvas';
import { NodeConfigPanel } from './components/workflow-editor/node-config-panel';
import { ExecutionPanel } from './components/execution/execution-panel';
import SteveInterface from './components/SteveInterface';
import WorkflowSteve from './components/WorkflowSteve';
import PulseIDE from './components/pulse/App';
import ForecasterApp from './components/Forecaster/ForecasterApp';
import MissionControlApp from './components/MissionControl/MissionControlApp';
import KnowledgeApp from './components/Knowledge/KnowledgeApp';
import FileIntelligenceApp from './components/FileIntelligence/FileIntelligenceApp';
import ArbiteriumApp from './components/arbiterium/ArbiteriumApp';
import ArgusEye from './components/ArgusEye';
import ReflectionsTab from './components/ReflectionsTab';
import { generateId } from './lib/utils/id-generator';
import { FloatingPanel } from './components/ui/floating-panel';

import '../command-ct/styles/terminal.css';
import './styles/soma-ui-control.css';
import './styles/emotes.css';
import SettingsModule from './components/SettingsModule';
import CommandPalette from './components/CommandPalette';
import CharacterGacha from './components/CharacterGacha';

// ==========================================
// Process Monitor Modal (Task Manager)
// ==========================================
const ProcessMonitor = ({ agents, onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4" onClick={onClose}>
    <div className="bg-[#151518] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl p-6" onClick={e => e.stopPropagation()}>
      <div className="flex justify-between items-center mb-6 border-b border-white/5 pb-4">
        <h3 className="text-xl font-bold text-white flex items-center">
          <Activity className="w-5 h-5 mr-2 text-blue-400" /> System Processes
        </h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
        <table className="w-full text-left text-sm">
          <thead className="text-zinc-500 font-medium border-b border-white/5 uppercase tracking-wider">
            <tr>
              <th className="pb-3 pl-2">Process Name</th>
              <th className="pb-3">Type</th>
              <th className="pb-3">Status</th>
              <th className="pb-3 text-right pr-2">Load</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {Array.isArray(agents) && agents.length > 0 ? agents.map(agent => (
              <tr key={agent.id} className="hover:bg-white/5 transition-colors">
                <td className="py-3 pl-2 text-zinc-200 font-medium">{agent.name}</td>
                <td className="py-3 text-zinc-400 font-mono text-xs">{agent.type || 'System'}</td>
                <td className="py-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${agent.status === 'active'
                    ? 'bg-fuchsia-500/10 text-fuchsia-400 border-fuchsia-500/20'
                    : 'bg-zinc-800 text-zinc-500 border-white/5'
                    }`}>
                    {agent.status}
                  </span>
                </td>
                <td className="py-3 text-right pr-2 font-mono text-zinc-300">{agent.load}%</td>
              </tr>
            )) : (
              <tr>
                <td colSpan={4} className="py-12 text-center text-zinc-600 italic">
                  No active arbiters detected. Swarm is initializing...
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// ==========================================
// Main Command Bridge Component
// ==========================================
const SomaCommandBridge = () => {
  const [activeModule, setActiveModule] = useState('core');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSomaBusy, setIsSomaBusy] = useState(false);
  const [showPulse, setShowPulse] = useState(false); 
  const [showSteve, setShowSteve] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [showProcessModal, setShowProcessModal] = useState(false);
  
  // Sensory Link State
  const [currentLocation, setCurrentLocation] = useState('UNMAPPED');
  const [identifiedPerson, setIdentifiedPerson] = useState('NO_SIGNAL');
  const [isVisionActive, setIsVisionActive] = useState(false);
  const visionStreamRef = useRef(null);
  const [lastLatency, setLastLatency] = useState(null);
  const [activeBrain, setActiveBrain] = useState(null);
  const [orbConversation, setOrbConversation] = useState([]);
  const [activeReasoningTree, setActiveReasoningTree] = useState(null);

  const [systemMetrics, setSystemMetrics] = useState({ cpu: 0, ram: 0, uptime: 0, neuralLoad: { load1: 0 }, contextWindow: { maxTokens: 1048576, used: 0 } });
  const [activeArbiters, setActiveArbiters] = useState(0);
  const [totalArbiters, setTotalArbiters] = useState(0);
  const [activeMicroAgents, setActiveMicroAgents] = useState(0);
  const [totalMicroAgents, setTotalMicroAgents] = useState(0);
  const [totalFragments, setTotalFragments] = useState(0);
  const [agents, setAgents] = useState([]);
  const [arbiters, setArbiters] = useState([]);
  const [microAgents, setMicroAgents] = useState([]);
  const [fragments, setFragments] = useState([]);
  const [activityStream, setActivityStream] = useState([]);

  const { workflows, updateWorkflow, activeWorkflowId, addExecutionLog } = useAgentStore();
  const activeWorkflow = workflows.find(w => w.id === activeWorkflowId);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const handleCreateWorkflow = () => {
    const newWorkflow = {
      id: generateId("workflow"),
      name: "New Workflow",
      nodes: [],
      connections: [],
      createdAt: new Date(),
      status: "idle",
    };
    useAgentStore.getState().addWorkflow(newWorkflow);
    useAgentStore.getState().setActiveWorkflow(newWorkflow.id);
  };

  // 📡 WebSocket Sensory Integration
  useEffect(() => {
    const handleSensorySignal = (signal) => {
      if (signal.topic === 'location_changed') setCurrentLocation(signal.payload?.location?.name || 'AREA_UNKNOWN');
      if (signal.topic === 'person_recognized') setIdentifiedPerson(signal.payload?.name || 'ENTITY_DETECTION');
    };
    somaBackend.on('cns_signal', handleSensorySignal);
    somaBackend.on('connect', () => { setIsConnected(true); toast.success('SOMA Neural Link Established'); });
    somaBackend.on('disconnect', () => setIsConnected(false));
    somaBackend.on('pulse', (p) => {
        if (p.system) setSystemMetrics(prev => ({ ...prev, ...p.system }));
        if (p.counts) {
            setActiveArbiters(p.counts.activeArbiters || 0);
            setTotalArbiters(p.counts.totalArbiters || 0);
            setActiveMicroAgents(p.counts.activeMicroAgents || 0);
            setTotalMicroAgents(p.counts.totalMicroAgents || 0);
            setTotalFragments(p.counts.fragments || 0);
        }
        if (p.agents) {
            setAgents(p.agents);
            const actualArbiters = p.agents.filter(a => a.type?.includes('arbiter') || a.name?.includes('Arbiter'));
            setArbiters(actualArbiters);
            setMicroAgents(p.agents.filter(a => !actualArbiters.includes(a)));
        }
    });
    somaBackend.on('log', (msg) => setActivityStream(prev => [{ id: generateId('activity'), type: msg.type || 'info', message: msg.message, timestamp: Date.now() }, ...prev].slice(0, 100)));

    somaBackend.connect();
    return () => {
      somaBackend.off('cns_signal', handleSensorySignal);
      if (visionStreamRef.current) visionStreamRef.current.getTracks().forEach(t => t.stop());
      somaBackend.disconnect();
    };
  }, []);

  const toggleVision = useCallback(async () => {
    if (isVisionActive) {
      if (visionStreamRef.current) { visionStreamRef.current.getTracks().forEach(t => t.stop()); visionStreamRef.current = null; }
      setIsVisionActive(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480, frameRate: 15 } });
        visionStreamRef.current = stream;
        setIsVisionActive(true);
      } catch (err) { console.error('👁️ [Argus] Vision access failed:', err); }
    }
  }, [isVisionActive]);

  const handleOrbResponse = useCallback((response) => {
    if (response.type === 'token') return;
    setOrbConversation(prev => [...prev, { role: response.role, text: response.text || response.message, timestamp: response.timestamp || Date.now() }]);
    if (response.latency) setLastLatency(response.latency);
    if (response.brain) setActiveBrain(response.brain);
    if (response.reasoningTree) setActiveReasoningTree(response.reasoningTree);
  }, []);

  const { isConnected: isOrbConnected, connect: connectOrb, disconnect: disconnectOrb, volume, isTalking, isListening, isThinking, sendTextQuery, inputVolume, orbRef } = useSomaAudio(handleOrbResponse);

  const handleFloatingChatSubmit = async (message, { history = [] } = {}) => {
    try {
      const data = await somaBackend.fetch('/api/soma/chat', { 
        method: 'POST', 
        body: JSON.stringify({ 
          message, 
          sessionId: getSharedSessionId(), 
          history: history.map(m => ({ role: m.role || 'user', content: m.content || m.text })) 
        }) 
      });
      return data ? { text: data.response || data.message } : null;
    } catch (e) { toast.error('Neural Link communication failure'); return null; }
  };

  const executeCommand = async (action, label) => {
    try {
      const res = await somaBackend.fetch('/api/command', { method: 'POST', body: JSON.stringify({ action }) });
      if (res?.success) toast.success(`${label} Success`);
    } catch (e) { toast.error(`${label} Failed`); }
  };

  const formatUptime = (s) => `${Math.floor(s/3600)}h ${Math.floor((s%3600)/60)}m`;

  return (
    <div className="flex h-screen bg-[#09090b] text-zinc-200 font-sans selection:bg-white/20">
      {showProcessModal && <ProcessMonitor agents={agents} onClose={() => setShowProcessModal(false)} />}
      <ToastContainer position="top-right" theme="dark" />
      
      {/* Hidden Global Vision Feed */}
      <div className="fixed opacity-0 pointer-events-none">
          <ArgusEye isConnected={isConnected} isVisionActive={isVisionActive} visionStream={visionStreamRef.current} />
      </div>

      {/* Sidebar */}
      <div className={`${sidebarCollapsed ? 'w-16' : 'w-64'} bg-black/40 backdrop-blur-xl border-r border-white/5 flex flex-col transition-all duration-300 z-50`}>
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          {!sidebarCollapsed && <h1 className="text-xl font-bold tracking-tight text-white uppercase italic">SOMA</h1>}
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="text-zinc-500 hover:text-white transition-colors">
            {sidebarCollapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
          </button>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {[
            { id: 'core', label: 'Core System', icon: Cpu, color: 'blue' },
            { id: 'command', label: 'Sovereign Link', icon: Activity, color: 'fuchsia' },
            { id: 'terminal', label: 'Terminal', icon: Terminal, color: 'amber' },
            { id: 'mission_control', label: 'Mission', icon: Target, color: 'rose' },
            { id: 'knowledge', label: 'Knowledge', icon: Brain, color: 'cyan' },
            { id: 'kevin', label: 'K.E.V.I.N.', icon: Mail, color: 'red' },
            { id: 'settings', label: 'Settings', icon: Settings, color: 'stone' },
          ].map(m => (
            <button key={m.id} onClick={() => setActiveModule(m.id)} className={`w-full flex items-center ${sidebarCollapsed ? 'justify-center' : 'gap-3'} px-3 py-2.5 rounded-xl transition-all ${activeModule === m.id ? 'bg-white/10 text-white shadow-lg border border-white/5' : 'text-zinc-400 hover:bg-white/5 hover:text-zinc-100'}`}>
              <m.icon className={`w-5 h-5 ${activeModule === m.id ? 'text-' + m.color + '-400' : ''}`} />
              {!sidebarCollapsed && <span className="text-sm font-bold">{m.label}</span>}
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        
        {activeModule === 'core' && (
          <div className="p-8 space-y-8 overflow-y-auto h-full">
            <div className="flex items-center justify-between">
              <h2 className="text-3xl font-black text-white tracking-tight uppercase">Core System</h2>
              <ArgusEye isConnected={isConnected} isVisionActive={isVisionActive} visionStream={visionStreamRef.current} onToggle={toggleVision} />
            </div>
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-black/40 border border-white/5 p-6 rounded-3xl"><p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Neural Load</p><p className="text-3xl font-mono text-white">{(systemMetrics.cpu || 0).toFixed(1)}%</p></div>
              <div className="bg-black/40 border border-white/5 p-6 rounded-3xl"><p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Memory Sync</p><p className="text-3xl font-mono text-white">{(systemMetrics.ram || 0).toFixed(1)}%</p></div>
              <div className="bg-black/40 border border-white/5 p-6 rounded-3xl"><p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Active Arbiters</p><p className="text-3xl font-mono text-white">{activeArbiters}</p></div>
              <div className="bg-black/40 border border-white/5 p-6 rounded-3xl"><p className="text-[10px] text-zinc-500 font-bold uppercase mb-2">Uptime</p><p className="text-xl font-mono text-white">{formatUptime(systemMetrics.uptime || 0)}</p></div>
            </div>
            <div className="grid grid-cols-2 gap-6">
                <MemoryTierMonitor isConnected={isConnected} />
                <LearningVelocityDashboard isConnected={isConnected} />
            </div>
            <div className="grid grid-cols-3 gap-6">
                <TheoryOfMindPanel isConnected={isConnected} />
                <div className="col-span-2"><MindsEye isConnected={isConnected} /></div>
            </div>
          </div>
        )}

        {activeModule === 'command' && (
          <div className="h-full flex flex-col p-8 gap-6 overflow-hidden bg-zinc-950">
            <div className="flex items-center justify-between">
              <div className="flex items-baseline gap-3">
                <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Sovereign Link</h2>
                <span className="text-[10px] font-mono text-fuchsia-500 font-bold opacity-50 border border-fuchsia-500/20 px-2 py-0.5 rounded">v0.7_SOVEREIGN</span>
              </div>
              <ArgusEye isConnected={isConnected} isVisionActive={isVisionActive} visionStream={visionStreamRef.current} onToggle={toggleVision} />
            </div>

            <div className="flex-1 grid grid-cols-5 gap-6 overflow-hidden">
              <div className="col-span-3 flex flex-col gap-4 overflow-hidden">
                <div className="flex-1 bg-black/60 border border-white/5 rounded-[40px] relative overflow-hidden">
                  <ArgusEye isConnected={isConnected} isInline={true} isVisionActive={isVisionActive} visionStream={visionStreamRef.current} />
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-cyan-500/5 border border-cyan-500/10 p-5 rounded-3xl flex items-center justify-between shadow-2xl">
                    <div><p className="text-[8px] text-cyan-500 font-black uppercase mb-1">Location</p><p className="text-xl font-black text-white uppercase tracking-tighter">{currentLocation}</p></div>
                    <Home className="w-8 h-8 text-cyan-500/20" />
                  </div>
                  <div className="bg-emerald-500/5 border border-emerald-500/10 p-5 rounded-3xl flex items-center justify-between shadow-2xl">
                    <div><p className="text-[8px] text-emerald-500 font-black uppercase mb-1">Identity</p><p className="text-xl font-black text-white uppercase tracking-tighter">{identifiedPerson}</p></div>
                    <User className="w-8 h-8 text-emerald-500/20" />
                  </div>
                  <div className="bg-purple-500/5 border border-purple-500/10 p-5 rounded-3xl flex items-center justify-between shadow-2xl">
                    <div><p className="text-[8px] text-purple-500 font-black uppercase mb-1">Resonance</p><p className="text-xl font-black text-white uppercase tracking-tighter">98.4%</p></div>
                    <Zap className="w-8 h-8 text-purple-500/20" />
                  </div>
                </div>
              </div>

              <div className="col-span-2 flex flex-col gap-4 overflow-hidden">
                <div className="h-1/2 bg-zinc-900/50 border border-white/5 rounded-[40px] flex flex-col items-center justify-center relative shadow-inner">
                  <div className="scale-75"><Orb ref={orbRef} volume={volume} isActive={isOrbConnected} isTalking={isTalking} isListening={isListening} isThinking={isThinking} /></div>
                  <div className="absolute bottom-8 flex gap-4">
                    <button onClick={() => isOrbConnected ? disconnectOrb() : connectOrb()} className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all duration-500 ${isOrbConnected ? 'border-rose-500/50 text-rose-400 bg-rose-500/5 shadow-[0_0_20px_rgba(244,63,94,0.1)]' : 'border-fuchsia-500/50 text-fuchsia-400 bg-fuchsia-500/5 shadow-[0_0_20px_rgba(192,132,252,0.1)]'}`}>
                        {isOrbConnected ? '● Disengage' : '○ Establish Link'}
                    </button>
                  </div>
                </div>
                <div className="flex-1 bg-black/40 border border-white/5 rounded-[40px] flex flex-col overflow-hidden shadow-2xl">
                  <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center bg-white/5">
                    <h3 className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Neural Transmission</h3>
                    <div className="flex items-center gap-2">
                        {activeBrain && <span className="text-[8px] font-mono text-fuchsia-500 bg-fuchsia-500/10 px-2 py-0.5 rounded uppercase">{activeBrain}</span>}
                        {lastLatency && <span className="text-[8px] font-mono text-zinc-600">{lastLatency}ms</span>}
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {orbConversation.map((msg, i) => (
                      <div key={i} className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}>
                        <div className={`max-w-[90%] p-3.5 rounded-2xl text-xs leading-relaxed ${msg.role === 'user' ? 'bg-blue-500/10 border border-blue-500/20 text-blue-100 rounded-tr-none' : 'bg-purple-500/10 border border-purple-500/20 text-purple-100 rounded-tl-none shadow-lg'}`}>{msg.text}</div>
                        <span className="text-[7px] text-zinc-600 mt-1 uppercase font-bold tracking-tighter">{msg.role === 'user' ? 'Human' : 'SOMA'}</span>
                      </div>
                    ))}
                  </div>
                  {isOrbConnected && (
                    <div className="p-4 bg-white/5 border-t border-white/5">
                        <div className="relative group">
                            <input type="text" placeholder="Direct transmission..." className="w-full bg-black/40 border border-white/10 rounded-2xl px-5 py-3 text-xs outline-none focus:border-fuchsia-500/50 transition-all placeholder-zinc-700" onKeyDown={e => { if(e.key==='Enter' && e.target.value.trim()){ window.somaTextQuery(e.target.value.trim()); e.target.value=''; } }} />
                            <Zap className="absolute right-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-700 group-focus-within:text-fuchsia-500 transition-colors" />
                        </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeModule === 'terminal' && <div className="flex-1 h-full bg-black"><SomaCT /></div>}
        {activeModule === 'mission_control' && <MissionControlApp somaBackend={somaBackend} isConnected={isConnected} />}
        {activeModule === 'knowledge' && <KnowledgeApp brainStats={null} />}
        {activeModule === 'kevin' && <KevinInterface />}
        {activeModule === 'settings' && <SettingsModule s={somaBackend} arbiters={arbiters} isConnected={isConnected} />}
        {activeModule === 'forecaster' && <ForecasterApp />}

      </div>

      {activeModule !== 'terminal' && <FloatingChat isServerRunning={isConnected} isBusy={isThinking} onSendMessage={handleFloatingChatSubmit} activeModule={activeModule} />}
    </div>
  );
};

export default SomaCommandBridge;
`

fs.writeFileSync(filePath, cleanContent, 'utf8');
console.log('Successfully cleaned and restored SomaCommandBridge.jsx');
