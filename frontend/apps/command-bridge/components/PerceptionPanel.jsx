import React, { useState, useEffect, useCallback } from 'react';
import { Activity, AlertTriangle, CheckCircle, XCircle, Eye, Radio } from 'lucide-react';
import somaBackend from '../somaBackend';

export default function PerceptionPanel({ isConnected }) {
    const [health, setHealth] = useState(null);
    const [error, setError] = useState(null);

    const fetchHealth = useCallback(async () => {
        if (!isConnected) return;
        try {
            const res = await somaBackend.fetch('/api/perception/health');
            if (res.ok) setHealth(await res.json());
        } catch (e) {
            setError(e.message);
        }
    }, [isConnected]);

    useEffect(() => {
        fetchHealth();
        const id = setInterval(fetchHealth, 15000);
        return () => clearInterval(id);
    }, [fetchHealth]);

    const daemonEntries = health?.daemons ? Object.entries(health.daemons) : [];

    const statusIcon = (daemon) => {
        if (daemon.circuitBroken) return <XCircle className="w-3.5 h-3.5 text-red-400" />;
        if (daemon.status === 'running') return <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />;
        if (daemon.status === 'stopped') return <XCircle className="w-3.5 h-3.5 text-zinc-600" />;
        return <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />;
    };

    return (
        <div className="bg-[#151518]/60 backdrop-blur-md border border-white/5 rounded-xl p-5 shadow-lg">
            <h3 className="text-zinc-100 font-semibold text-sm flex items-center mb-4 uppercase tracking-wider">
                <Eye className="w-4 h-4 mr-2 text-cyan-400" /> Perception Layer
            </h3>

            {!isConnected && (
                <p className="text-zinc-500 text-xs text-center py-4">Offline</p>
            )}

            {isConnected && !health && !error && (
                <p className="text-zinc-500 text-xs text-center py-4 animate-pulse">Loading...</p>
            )}

            {error && (
                <p className="text-red-400 text-xs text-center py-4">{error}</p>
            )}

            {health && (
                <div className="space-y-4">
                    {/* Daemon grid */}
                    {daemonEntries.length > 0 ? (
                        <div className="space-y-2">
                            <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2">Daemons</p>
                            {daemonEntries.map(([name, d]) => (
                                <div key={name} className="flex items-center justify-between text-xs py-1.5 border-b border-white/5 last:border-0">
                                    <div className="flex items-center space-x-2">
                                        {statusIcon(d)}
                                        <span className="text-zinc-300 font-mono truncate max-w-[160px]">{name}</span>
                                    </div>
                                    <div className="flex items-center space-x-3 text-zinc-500">
                                        {d.restartCount > 0 && (
                                            <span className="text-amber-400">↺{d.restartCount}</span>
                                        )}
                                        <span className="capitalize">{d.circuitBroken ? 'circuit open' : d.status}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-zinc-600 text-xs text-center py-2">No daemons registered</p>
                    )}

                    {/* Attention state */}
                    {health.attention && (
                        <div className="pt-2">
                            <p className="text-zinc-500 text-[10px] uppercase tracking-widest mb-2">Attention</p>
                            <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center space-x-2">
                                    <Radio className="w-3.5 h-3.5 text-fuchsia-400" />
                                    <span className="text-zinc-300">
                                        {health.attention.focus ?? 'unfocused'}
                                    </span>
                                </div>
                                {health.attention.load != null && (
                                    <span className={`font-mono ${health.attention.load > 80 ? 'text-red-400' : 'text-zinc-400'}`}>
                                        load {health.attention.load.toFixed(0)}%
                                    </span>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
