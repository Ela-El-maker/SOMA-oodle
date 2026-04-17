import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useVision - SOMA Perception Hook
 *
 * Primary path: listens to 'vision_update' WebSocket events pushed from
 * the backend when vision.perceived fires (no polling lag).
 * Fallback path: polls /api/perception/vision/last every 10s to sync
 * if a vision_update was missed or on first connect.
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
    const pollIntervalRef = useRef(null);

    // Helper: apply a raw vision_update payload (from WS event or REST poll)
    const applyVisionData = useCallback((data) => {
        setVisionState(prev => {
            // Build frame URL from imagePath — can live in data or inside lastPerception
            const imagePath = data.imagePath || data.lastPerception?.imagePath || prev.lastPerception?.imagePath;
            const frameUrl = imagePath
                ? `/api/perception/vision/frame?path=${encodeURIComponent(imagePath)}`
                : prev.lastFrameUrl;

            // Construct a unified lastPerception object from whatever the source provided
            const newPerception = data.lastPerception || (data.objects ? {
                objects: data.objects,
                ocrText: data.ocrText || null,
                imagePath: data.imagePath || null,
                channel: data.channel || prev.channel,
                timestamp: data.timestamp || Date.now()
            } : prev.lastPerception);

            return {
                ...prev,
                active: true,
                channel: data.channel || prev.channel,
                lastPerception: newPerception,
                ghostCursor: data.ghostCursor !== undefined ? data.ghostCursor : prev.ghostCursor,
                lastFrameUrl: frameUrl
            };
        });
    }, []);

    // REST poll fallback (slower, keeps state in sync on reconnect)
    const fetchVision = useCallback(async () => {
        if (!isConnected) return;
        try {
            const res = await somaBackend.fetch('/api/perception/vision/last');
            if (res.ok) {
                const data = await res.json();
                if (data.success) applyVisionData(data);
            }
        } catch (e) {
            console.warn('[useVision] Poll failed:', e.message);
        }
    }, [somaBackend, isConnected, applyVisionData]);

    // WebSocket event listener — real-time updates from vision.perceived signals
    useEffect(() => {
        if (!isConnected || !somaBackend?.on) return;

        const handleVisionUpdate = (payload) => applyVisionData(payload);
        somaBackend.on('vision_update', handleVisionUpdate);

        return () => {
            somaBackend.off?.('vision_update', handleVisionUpdate);
        };
    }, [isConnected, somaBackend, applyVisionData]);

    // Polling: initial fetch + 10s fallback (slower than WS but ensures sync)
    useEffect(() => {
        if (isConnected) {
            fetchVision();
            pollIntervalRef.current = setInterval(fetchVision, 10000);
        } else {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        }
        return () => {
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
        };
    }, [isConnected, fetchVision]);

    const setChannel = useCallback(async (channel) => {
        try {
            await somaBackend.fetch('/api/perception/vision/channel', {
                method: 'POST',
                body: JSON.stringify({ channel })
            });
            setVisionState(prev => ({ ...prev, channel }));
        } catch (e) {
            console.error('[useVision] Failed to set channel:', e);
        }
    }, [somaBackend]);

    return {
        ...visionState,
        setChannel,
        refresh: fetchVision
    };
};
