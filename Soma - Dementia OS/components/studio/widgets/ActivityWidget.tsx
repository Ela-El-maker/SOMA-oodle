import * as React from 'react';
import { WidgetData } from '../../../types';
import { Activity, Flame } from 'lucide-react';

interface Props {
    data: WidgetData;
}

// Generate mock heatmap data (4 weeks x 7 days)
const generateHeatmap = () => {
    return Array.from({ length: 28 }).map((_, i) => ({
        value: Math.random() > 0.3 ? Math.floor(Math.random() * 4) + 1 : 0,
    }));
};

const ActivityWidget: React.FC<Props> = ({ data }) => {
  const heatmap = generateHeatmap();

  const getColor = (value: number) => {
      if (value === 0) return 'bg-white/5';
      if (value === 1) return 'bg-white/10';
      if (value === 2) return 'bg-emerald-500/40';
      if (value === 3) return 'bg-emerald-500/70';
      return 'bg-emerald-400';
  };

  return (
    <div className="w-full h-full flex flex-col p-6 relative">
      <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-emerald-400">
            <Flame size={18} />
            <span className="text-xs font-mono uppercase tracking-widest">Output Log</span>
          </div>
          <span className="text-[10px] font-mono text-white/30">LAST 30 DAYS</span>
      </div>

      <div className="flex-1 flex flex-col justify-center">
          <div className="grid grid-cols-7 gap-1.5 w-full aspect-[7/4]">
              {heatmap.map((cell, i) => (
                  <div 
                    key={i} 
                    className={`rounded-sm transition-all duration-500 hover:scale-110 ${getColor(cell.value)}`}
                    title={`Activity Level: ${cell.value}`}
                  ></div>
              ))}
          </div>
      </div>
      
      <div className="mt-4 flex items-center justify-between text-[10px] text-white/30 font-mono uppercase tracking-wider">
        <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
            <span>High Int.</span>
        </div>
        <span>Total: 142 commits</span>
      </div>
    </div>
  );
};

export default ActivityWidget;




