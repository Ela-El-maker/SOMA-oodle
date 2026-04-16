import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useVision - SOMA Perception Hook
 * 
 * Provides a global, persistent visual state. Connects to the backend
 * VisionDaemon to retrieve the most recent frame and analysis.
 */
export const useVision = (somaBackend, isConnected) => {
    const [visionState, setVisionState] = useState({
        active: false,
        channel: 'desktop',
        lastPerception: null,
        lastFrameUrl: null,
        ghostCursor: null,
        metrics: {}
    });
    const [isPolling, setIsPolling] = useState(false);
    const pollIntervalRef = useRef(null);

    const fetchVision = useCallback(async () => {
        if (!isConnected) return;
        try {
            const res = await somaBackend.fetch('/api/perception/vision/last');
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setVisionState(prev => ({
                        ...prev,
                        active: true,
                        channel: data.channel,
                        lastPerception: data.lastPerception,
                        ghostCursor: data.ghostCursor,
                        // If there's a new perception, we might have a new frame path
                        lastFrameUrl: data.lastPerception?.imagePath ? `/api/perception/vision/frame?path=${encodeURIComponent(data.lastPerception.imagePath)}` : prev.lastFrameUrl
                    }));
                }
            }
        } catch (e) {
            console.warn('[useVision] Failed to fetch vision state:', e);
        }
    }, [somaBackend, isConnected]);

    const setChannel = useCallback(async (channel) => {
        try {
            await somaBackend.fetch('/api/perception/vision/channel', {
                method: 'POST',
                body: JSON.stringify({ channel })
            });
            setVisionState(prev => ({ ...prev, channel }));
        } catch (e) {
            console.error('[useVision] Failed to set vision channel:', e);
        }
    }, [somaBackend]);

    useEffect(() => {
        if (isConnected) {
            fetchVision();
            pollIntervalRef.current = setInterval(fetchVision, 5000);
        } else {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [isConnected, fetchVision]);

    return {
        ...visionState,
        setChannel,
        refresh: fetchVision
    };
};
