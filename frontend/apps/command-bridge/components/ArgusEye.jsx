import React, { useState, useEffect, useRef } from 'react';
import { Eye, EyeOff, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * ArgusEye — PROJECT ARGUS
 * v0.1 — Live Visual Ingestion Component
 */
const ArgusEye = ({ isConnected }) => {
  const [isVisionActive, setIsVisionActive] = useState(false);
  const [lastDiscovery, setLastDiscovery] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const captureIntervalRef = useRef(null);

  const startVision = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { width: 640, height: 480, frameRate: 15 } 
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setIsVisionActive(true);
      
      // Start the 5 FPS capture loop
      captureIntervalRef.current = setInterval(captureFrame, 200);
      console.log('👁️ [Argus] Vision stream active.');
    } catch (err) {
      console.error('👁️ [Argus] Could not access camera:', err);
    }
  };

  const stopVision = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (captureIntervalRef.current) clearInterval(captureIntervalRef.current);
    setIsVisionActive(false);
    console.log('👁️ [Argus] Vision stream paused.');
  };

  const captureFrame = async () => {
    if (!canvasRef.current || !videoRef.current || !isConnected) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const ctx = canvas.getContext('2d');

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert to Base64 (JPEG for speed/compression)
    const frameData = canvas.toDataURL('image/jpeg', 0.5);

    try {
      await fetch('/api/argus/frame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          frameData, 
          timestamp: Date.now(),
          source: 'webcam' 
        })
      });
    } catch (e) { /* silent fail on high frequency post */ }
  };

  useEffect(() => {
    return () => stopVision();
  }, []);

  return (
    <div className="relative group">
      {/* Hidden processing elements */}
      <video ref={videoRef} autoPlay playsInline className="hidden" />
      <canvas ref={canvasRef} width="320" height="240" className="hidden" />

      {/* Visual Indicator */}
      <button 
        onClick={() => isVisionActive ? stopVision() : startVision()}
        className={`flex items-center gap-3 px-4 py-2 rounded-xl border transition-all ${
          isVisionActive 
          ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-400 shadow-lg shadow-cyan-500/10' 
          : 'bg-white/5 border-white/5 text-zinc-500 hover:bg-white/10'
        }`}
      >
        {isVisionActive ? <Eye className="w-4 h-4 animate-pulse" /> : <EyeOff className="w-4 h-4" />}
        <span className="text-[10px] font-black uppercase tracking-[0.2em]">
          {isVisionActive ? 'Visual Link Live' : 'Enable Visual Link'}
        </span>
      </button>

      {/* Discovery Toast (if SOMA sees something) */}
      <AnimatePresence>
        {isVisionActive && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="absolute top-12 left-0 w-48 p-3 rounded-lg bg-black/80 backdrop-blur-md border border-cyan-500/20 z-50"
          >
            <div className="flex items-center gap-2 mb-1">
               <Zap className="w-3 h-3 text-cyan-400" />
               <p className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest">Neural Recognition</p>
            </div>
            <p className="text-[10px] text-zinc-400 italic">SOMA is observing temporal streams...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ArgusEye;
