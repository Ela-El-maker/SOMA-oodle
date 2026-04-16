import React from 'react';

const SomaStatusStrip = ({
  activeGoal,
  goalProgress,
  tensionLevel,
  lastToolUsed,
  isSomaBusy,
  isConnected,
  sidebarCollapsed,
  wakeWordActive,
  onWakeWordToggle
}) => {
  const tension = tensionLevel || 0;
  const isUrgent = tension >= 70;
  const heartbeatColor = isConnected ? (isSomaBusy ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-red-500';
  const connectionStatusText = isConnected ? (isSomaBusy ? 'Busy' : 'Active') : 'Offline';

  let tickerParts = [`${activeGoal || 'No Active Goal'}`];
  if (goalProgress !== undefined) tickerParts.push(`(${goalProgress.toFixed(0)}%)`);
  if (!sidebarCollapsed && lastToolUsed) tickerParts.push(`[${lastToolUsed}]`);
  tickerParts.push(`[${connectionStatusText}]`);
  const fullTickerText = tickerParts.join(' • ');

  // Tension bar color
  const tensionBarColor = isUrgent ? 'bg-amber-500' : tension >= 40 ? 'bg-yellow-500' : 'bg-emerald-500';

  return (
    <div className="bg-[#09090b]/90 backdrop-blur-md border-t border-white/5 text-zinc-400 text-xs flex flex-col w-full overflow-hidden">
      {/* Tension bar */}
      <div className="w-full h-0.5 bg-white/5">
        <div
          className={`h-full transition-all duration-1000 ${tensionBarColor} ${isUrgent ? 'animate-pulse' : ''}`}
          style={{ width: `${Math.min(tension, 100)}%` }}
        />
      </div>

      <div className="py-1 px-3 flex items-center whitespace-nowrap">
        {/* Heartbeat dot */}
        <span className="relative flex h-2 w-2 mr-2 flex-shrink-0">
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${heartbeatColor} opacity-75 ${isSomaBusy ? 'duration-700' : 'duration-1000'}`} />
          <span className={`relative inline-flex rounded-full h-2 w-2 ${heartbeatColor}`} />
        </span>

        {/* Scrolling ticker */}
        <div className="relative flex-1 overflow-hidden h-4">
          <span className="absolute whitespace-nowrap animate-marquee font-semibold text-zinc-200">
            {fullTickerText}
          </span>
        </div>

        {/* Wake word toggle */}
        {onWakeWordToggle && (
          <button
            onClick={onWakeWordToggle}
            title={wakeWordActive ? 'Wake word active — say "Hey SOMA"' : 'Enable wake word'}
            className={`ml-3 flex-shrink-0 flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono border transition-all ${
              wakeWordActive
                ? 'border-emerald-500/50 text-emerald-400 bg-emerald-500/10 animate-pulse'
                : 'border-white/10 text-zinc-600 hover:border-white/20 hover:text-zinc-400'
            }`}
          >
            <span>{wakeWordActive ? '◉' : '◎'}</span>
            <span>{wakeWordActive ? 'SOMA' : 'wake'}</span>
          </button>
        )}

        {/* Tension readout */}
        <span className={`ml-2 flex-shrink-0 font-mono text-[9px] ${isUrgent ? 'text-amber-400' : 'text-zinc-600'}`}>
          {tension.toFixed(0)}%
        </span>
      </div>
    </div>
  );
};

export default SomaStatusStrip;
