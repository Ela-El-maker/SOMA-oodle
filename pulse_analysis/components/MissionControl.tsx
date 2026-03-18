
import React from 'react';
import { BlueprintFile, ProjectTask, WorkspaceTab, SomaTask } from '../types';
import { Rocket, FileCode, CheckCircle2, Share2, Play, ClipboardList, Clock, Activity, ShieldCheck, BookOpen, Layers, Zap, Download } from 'lucide-react';

interface Props {
  blueprint?: BlueprintFile[];
  roadmap?: ProjectTask[];
  activeTab: WorkspaceTab;
  activeSomaTasks?: SomaTask[];
  onLaunch: () => void;
  onDownloadZip?: () => void;
}

const MissionControl: React.FC<Props> = ({ blueprint, roadmap, activeTab, activeSomaTasks, onLaunch, onDownloadZip }) => {
  const isDefault = !blueprint && !roadmap && (!activeSomaTasks || activeSomaTasks.length === 0);

  const renderContextPlaceholder = () => {
    switch(activeTab) {
      case 'security': return <div className="p-8 text-center"><ShieldCheck className="w-10 h-10 mx-auto text-rose-500/20 mb-2"/><p className="text-[10px] uppercase font-bold text-zinc-600">Security Vault</p></div>;
      case 'docs': return <div className="p-8 text-center"><BookOpen className="w-10 h-10 mx-auto text-blue-500/20 mb-2"/><p className="text-[10px] uppercase font-bold text-zinc-600">Knowledge Base</p></div>;
      default: return <div className="p-8 text-center opacity-40"><Rocket className="w-10 h-10 mx-auto text-zinc-700 mb-2"/><p className="text-[10px] uppercase font-bold text-zinc-600">Mission Control</p></div>;
    }
  }

  return (
    <div className="w-full flex flex-col animate-in fade-in duration-500">
      {isDefault && renderContextPlaceholder()}

      {activeSomaTasks && activeSomaTasks.length > 0 && (
        <div className="border-b border-zinc-800/50">
          <div className="p-4 flex items-center justify-between bg-blue-500/5 sticky top-0 z-10 backdrop-blur-md">
            <h3 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest flex items-center space-x-2">
              <Layers className="w-3.5 h-3.5" />
              <span>Shadow Infrastructure</span>
            </h3>
            <span className="text-[10px] text-zinc-500 font-mono">SOMA</span>
          </div>
          <div className="p-3 space-y-2">
            {activeSomaTasks.map((task) => (
              <div key={task.id} className={`p-2 rounded-lg border transition-all ${
                task.state === 'running' ? 'bg-blue-600/5 border-blue-500/20 shadow-[0_0_10px_rgba(59,130,246,0.1)]' :
                task.state === 'stopped' ? 'bg-rose-500/5 border-rose-500/20' : 'bg-zinc-900/50 border-zinc-800'
              }`}>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-bold text-zinc-200 truncate pr-2">{task.name}</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${
                    task.state === 'running' ? 'bg-blue-500 animate-pulse shadow-[0_0_5px_rgba(59,130,246,1)]' :
                    task.state === 'stopped' ? 'bg-rose-500' : 
                    task.state === 'completed' ? 'bg-emerald-500' : 'bg-zinc-700'
                  }`} />
                </div>
                <div className="flex items-center justify-between text-[9px] font-mono text-zinc-500">
                   <span>{task.stepLabel}</span>
                   <span>{Math.round((task.currentStep / task.totalSteps) * 100)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {roadmap && roadmap.length > 0 && (
        <div className="border-b border-zinc-800/50">
           <div className="p-4 flex items-center justify-between bg-zinc-900/20 sticky top-0 z-10 backdrop-blur-md">
             <h3 className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest flex items-center space-x-2">
               <ClipboardList className="w-3.5 h-3.5" />
               <span>Project Roadmap</span>
             </h3>
             <span className="text-[10px] text-zinc-500 font-mono">
               {roadmap.filter(t => t.status === 'completed').length}/{roadmap.length}
             </span>
           </div>
           <div className="p-3 space-y-2">
             {roadmap.map((task) => (
               <div key={task.id} className="flex items-center justify-between p-2 rounded-lg bg-zinc-900/50 border border-zinc-800 group transition-all hover:border-blue-500/30">
                 <div className="flex items-center space-x-3 overflow-hidden">
                    {task.status === 'completed' ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500"/> : <Clock className="w-3.5 h-3.5 text-zinc-600"/>}
                    <span className={`text-[11px] truncate ${task.status === 'completed' ? 'text-zinc-500 line-through' : 'text-zinc-300'}`}>{task.title}</span>
                 </div>
                 <Activity className={`w-3 h-3 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity ${task.status === 'in-progress' ? 'animate-pulse' : ''}`} />
               </div>
             ))}
           </div>
        </div>
      )}

      {blueprint && blueprint.length > 0 && (
        <>
          <div className="p-4 border-b border-zinc-800/50 flex flex-col space-y-3 bg-orange-500/5 sticky top-0 z-10 backdrop-blur-md">
            <div className="flex items-center justify-between">
              <h3 className="text-[10px] font-bold text-orange-400 uppercase tracking-widest flex items-center space-x-2">
                <Rocket className="w-3.5 h-3.5" />
                <span>Blueprint Artifacts</span>
              </h3>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={onDownloadZip} 
                  className="p-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition-all border border-zinc-700" 
                  title="Download as ZIP"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button onClick={onLaunch} className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-400 text-white px-3 py-1 rounded shadow shadow-orange-500/20 transition-all text-[9px] font-bold uppercase tracking-widest">
                  <Play className="w-3 h-3 fill-current" />
                  <span>Launch</span>
                </button>
              </div>
            </div>
          </div>
          <div className="p-4 space-y-4">
            {blueprint.map((file, idx) => (
              <div key={idx} className="group bg-zinc-900/40 border border-zinc-800 rounded-xl overflow-hidden hover:border-orange-500/30 transition-all">
                <div className="flex items-center justify-between p-2 border-b border-zinc-800 bg-zinc-950/50">
                  <div className="flex items-center space-x-2">
                    <FileCode className="w-3.5 h-3.5 text-zinc-500" />
                    <span className="text-[10px] font-mono text-zinc-300 truncate max-w-[120px]">{file.path}</span>
                  </div>
                </div>
                <pre className="p-3 text-[9px] font-mono text-zinc-500 relative overflow-x-auto whitespace-pre custom-scrollbar">
                  <code>{file.content}</code>
                </pre>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default MissionControl;
