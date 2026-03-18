import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect } from "react";
import { IoPlay, IoPause } from "react-icons/io5";
import { motion, AnimatePresence } from "framer-motion";

export interface BrainRotPostHandles {
    play: () => Promise<void>;
    stop: () => Promise<void>;
    toggle: () => void;
}

interface BrainRotPostProps {
    src: string;
    poster?: string;
    isActive?: boolean;
}

const BrainRotPost = forwardRef<BrainRotPostHandles, BrainRotPostProps>(({ src, poster, isActive }, ref) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [showStatus, setShowStatus] = useState(false);
    const isVideo = src.match(/\.(mp4|webm|ogg)$/i) || src.includes('video');

    const [progress, setProgress] = useState(0);

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            const duration = videoRef.current.duration;
            setProgress((current / duration) * 100);
        }
    };

    useImperativeHandle(ref, () => ({
        play: async () => {
            if (isVideo && videoRef.current) {
                try {
                    await videoRef.current.play();
                    setIsPlaying(true);
                } catch (e) {
                    console.error("Play failed", e);
                }
            }
        },
        stop: async () => {
            if (isVideo && videoRef.current) {
                videoRef.current.pause();
                videoRef.current.currentTime = 0;
                setIsPlaying(false);
                setProgress(0);
            }
        },
        toggle: () => {
            if (!isVideo || !videoRef.current) return;
            if (videoRef.current.paused) {
                videoRef.current.play();
                setIsPlaying(true);
            } else {
                videoRef.current.pause();
                setIsPlaying(false);
            }
            setShowStatus(true);
            setTimeout(() => setShowStatus(false), 800);
        }
    }));

    useEffect(() => {
        if (!isActive && isVideo && videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
        }
    }, [isActive]);

    return (
        <div className="w-full h-full bg-[#000000] flex items-center justify-center relative cursor-pointer group overflow-hidden" onClick={() => (ref as any).current?.toggle()}>
            {isVideo ? (
                <>
                    <video
                        ref={videoRef}
                        src={src}
                        poster={poster}
                        className={`w-full h-full object-cover transition-all duration-1000 ${isLoading ? 'scale-110 blur-sm' : 'scale-100 blur-0'}`}
                        loop
                        playsInline
                        onWaiting={() => setIsLoading(true)}
                        onPlaying={() => setIsLoading(false)}
                        onLoadedData={() => setIsLoading(false)}
                        onTimeUpdate={handleTimeUpdate}
                    />
                    
                    {/* Play/Pause Indicator Overlay */}
                    <AnimatePresence>
                        {showStatus && (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.5 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 1.5 }}
                                className="absolute inset-0 m-auto w-24 h-24 bg-black/40 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/10 pointer-events-none z-20 shadow-2xl"
                            >
                                {isPlaying ? <IoPause className="text-white w-10 h-10" /> : <IoPlay className="text-white w-10 h-10 ml-1" />}
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Loading State */}
                    {isLoading && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 z-10">
                            <div className="w-16 h-16 border-2 border-[#5eead4]/10 border-t-[#5eead4] rounded-[1.5rem] animate-spin"></div>
                            <span className="text-[10px] font-black text-[#5eead4] uppercase tracking-[0.4em] animate-pulse">Syncing_Signal</span>
                        </div>
                    )}

                    {/* Scrubbable Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/10 z-30 group-hover:h-2 transition-all">
                        <div 
                            className="h-full bg-[#5eead4] relative transition-all duration-100 ease-linear" 
                            style={{ width: `${progress}%` }}
                        >
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_#5eead4] opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                    </div>
                </>
            ) : (
                <img 
                    src={src} 
                    className={`w-full h-full object-cover transition-all duration-1000 ${isLoading ? 'scale-110 blur-md' : 'scale-100 blur-0'}`} 
                    alt="Signal content"
                    onLoad={() => setIsLoading(false)}
                />
            )}

            {/* Deep Aesthetic Shadows */}
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none z-0"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-black/20 via-transparent to-black/20 pointer-events-none z-0"></div>
        </div>
    );
});

export default BrainRotPost;



