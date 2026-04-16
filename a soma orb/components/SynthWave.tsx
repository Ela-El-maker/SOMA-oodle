import React, { useEffect, useRef } from 'react';

interface SynthWaveProps {
  volume: number;       // 0-1, drives amplitude when talking
  isTalking: boolean;
  isActive: boolean;
}

export const SynthWave: React.FC<SynthWaveProps> = ({ volume, isTalking, isActive }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>();
  const timeRef = useRef(0);
  const displayVolumeRef = useRef(0); // smoothed volume for rendering

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const MID = H / 2;

    const draw = () => {
      timeRef.current += 0.03;
      const t = timeRef.current;

      // Smooth volume toward target
      const target = isActive ? (isTalking ? volume : 0.04) : 0;
      displayVolumeRef.current += (target - displayVolumeRef.current) * 0.12;
      const amp = displayVolumeRef.current * (H * 0.42);

      ctx.clearRect(0, 0, W, H);

      // Draw 3 layered sine waves — back to front
      const layers = [
        { freq: 1.8,  phaseOff: 0,          alpha: 0.25, width: 1.2, color: '139,0,255'   }, // deep violet bg
        { freq: 2.4,  phaseOff: Math.PI/3,   alpha: 0.50, width: 1.8, color: '100,0,200'   }, // mid purple
        { freq: 3.1,  phaseOff: -Math.PI/5,  alpha: 0.90, width: 2.2, color: '168,0,255'   }, // bright front
      ];

      for (const layer of layers) {
        ctx.beginPath();
        ctx.lineWidth = layer.width;

        // Glow: draw a wider, softer shadow first
        ctx.shadowBlur = isTalking ? 14 : 6;
        ctx.shadowColor = `rgba(${layer.color},${layer.alpha * 0.6})`;
        ctx.strokeStyle = `rgba(${layer.color},${layer.alpha})`;

        for (let x = 0; x <= W; x += 2) {
          const px = x / W; // 0→1
          // Main sine + subtle harmonic for organic feel
          const y = MID
            + Math.sin(px * Math.PI * 2 * layer.freq + t + layer.phaseOff) * amp
            + Math.sin(px * Math.PI * 4 * layer.freq + t * 1.3 + layer.phaseOff) * amp * 0.2;

          x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Subtle center baseline glow when idle
      if (!isTalking && isActive) {
        ctx.beginPath();
        ctx.lineWidth = 1;
        ctx.shadowBlur = 4;
        ctx.shadowColor = 'rgba(88,28,135,0.5)';
        ctx.strokeStyle = 'rgba(88,28,135,0.4)';
        ctx.moveTo(0, MID);
        ctx.lineTo(W, MID);
        ctx.stroke();
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    frameRef.current = requestAnimationFrame(draw);

    // Restart the rAF loop when tab becomes visible again (browser pauses it when hidden)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        if (frameRef.current) cancelAnimationFrame(frameRef.current);
        frameRef.current = requestAnimationFrame(draw);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [volume, isTalking, isActive]);

  return (
    <canvas
      ref={canvasRef}
      width={480}
      height={80}
      style={{
        opacity: isActive ? 1 : 0,
        transition: 'opacity 0.8s ease',
        display: 'block',
      }}
    />
  );
};
