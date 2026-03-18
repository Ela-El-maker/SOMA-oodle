import React, { useState, useEffect } from 'react';
import type { HistoryItem, OutputType } from '../types';
import { StreamingText } from './StreamingText';
import { PaletteArtifact } from './PaletteArtifact';
import { ImageArtifact } from './ImageArtifact';
import { TodoArtifact } from './TodoArtifact';
import { ResponseDisplay } from './ResponseDisplay'; // Import ResponseDisplay

interface OutputLineProps {
  item: HistoryItem;
  currentPath: string;
  isAgentConnected: boolean;
}

export const OutputLine: React.FC<OutputLineProps> = ({ item, currentPath, isAgentConnected }) => {
  const [isFaded, setIsFaded] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    // Clutter reduction: Fade out 'info' type messages (system status, voice logs) after 10 seconds
    if (item.type === 'info') {
        const fadeTimer = setTimeout(() => {
            setIsFaded(true);
            // After fading out (1s transition), collapse the height to truly remove clutter
            setTimeout(() => setIsCollapsed(true), 1000);
        }, 10000);
        return () => clearTimeout(fadeTimer);
    }
  }, [item.type]);

  if (isCollapsed) return null;

  const renderContent = () => {
    if (React.isValidElement(item.content)) {
      return item.content;
    }
    if (typeof item.content === 'string') {
        if (item.type === 'help') {
          return <pre className="whitespace-pre-wrap font-mono text-sm text-zinc-400 leading-relaxed" dangerouslySetInnerHTML={{ __html: item.content }} />;
        }
        if (item.type === 'response' || item.type === 'think') {
            // Use ResponseDisplay for responses to handle Mermaid
            return <ResponseDisplay responseText={item.content} />;
        }
        // Handle potentially large shell output
        if (item.type === 'run' || (isAgentConnected && item.type === 'response')) {
             return <pre className="whitespace-pre font-mono text-sm text-zinc-300 overflow-x-auto">{item.content}</pre>;
        }

        if (item.type === 'palette') {
           try {
             const data = JSON.parse(item.content);
             return <PaletteArtifact colors={data.colors} theme={data.theme} />;
           } catch {
             return <pre className="whitespace-pre-wrap font-mono text-red-400">Error parsing palette data.</pre>;
           }
        }
        if (item.type === 'image') {
            const [src, ...promptParts] = item.content.split('|');
            const prompt = promptParts.join('|');
            return <ImageArtifact src={src} prompt={prompt} />;
        }
        if (item.type === 'todo') {
            try {
                const items = JSON.parse(item.content);
                return <TodoArtifact initialItems={items} />;
            } catch {
                return <pre className="whitespace-pre-wrap font-mono text-red-400">Error parsing todo data.</pre>;
            }
        }

        return <pre className="whitespace-pre-wrap font-mono text-sm leading-relaxed">{item.content}</pre>;
    }
    return null;
  };

  const typeStyles: Record<OutputType, string> = {
    command: 'text-zinc-300 font-medium',
    info: 'text-zinc-400',
    response: 'text-zinc-200',
    error: 'text-rose-400',
    help: 'text-emerald-400',
    status: 'text-purple-300',
    insights: 'text-indigo-300',
    search: 'text-amber-300',
    learn: 'text-emerald-300',
    think: 'text-zinc-500 italic',
    plan: 'text-amber-200',
    code: 'text-zinc-200',
    debug: 'text-zinc-200',
    refactor: 'text-zinc-200',
    phase: 'text-sky-300 font-semibold',
    install: 'text-lime-300',
    run: 'text-zinc-300',
    execution: 'text-zinc-200',
    crawl: 'text-blue-300',
    compress: 'text-yellow-300',
    generate: 'text-zinc-100',
    dialogue: 'text-zinc-400/80',
    export: 'text-emerald-300',
    bus: 'text-blue-400/80',
    image: '',
    palette: '',
    design: '',
    todo: '',
  };
  
  // Prompt: "You ›"
  const prompt = `You ›`;
  const isStandardLine = !['execution', 'crawl', 'generate', 'bus', 'image', 'palette', 'design', 'todo'].includes(item.type);

  return (
    <div className={`flex items-start ${typeStyles[item.type] || 'text-zinc-200'} ${isStandardLine ? 'mt-1.5' : 'mt-3'} transition-all duration-1000 ${isFaded ? 'opacity-0 scale-98 blur-[2px]' : 'opacity-100 scale-100 blur-0'}`}>
      {item.type === 'command' && <div className="w-auto mr-3 flex-shrink-0 select-none text-zinc-600 font-mono text-xs pt-0.5">{prompt}</div>}
      <div className="flex-grow min-w-0">
        {renderContent()}
      </div>
    </div>
  );
};