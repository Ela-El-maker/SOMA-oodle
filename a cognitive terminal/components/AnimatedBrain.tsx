import React, { useEffect, useRef, useState } from 'react';

interface AnimatedBrainProps {
    isActive: boolean;
}

interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
}

export const AnimatedBrain: React.FC<AnimatedBrainProps> = ({ isActive }) => {
    const [particles, setParticles] = useState<Particle[]>([]);
    const animationRef = useRef<number | null>(null);
    const particlesRef = useRef<Particle[]>([]);

    // Initialize particles
    useEffect(() => {
        const initParticles: Particle[] = [
            { x: 12, y: 8, vx: 0.2, vy: 0.15, radius: 1.5 },
            { x: 8, y: 12, vx: -0.15, vy: 0.2, radius: 1.5 },
            { x: 16, y: 12, vx: 0.18, vy: -0.2, radius: 1.5 },
            { x: 10, y: 16, vx: -0.2, vy: -0.18, radius: 1.5 },
            { x: 14, y: 16, vx: 0.2, vy: -0.15, radius: 1.5 },
            { x: 9, y: 10, vx: 0.15, vy: 0.18, radius: 1.3 },
            { x: 15, y: 10, vx: -0.18, vy: 0.15, radius: 1.3 },
            { x: 11, y: 14, vx: 0.18, vy: -0.15, radius: 1.3 },
            { x: 13, y: 14, vx: -0.15, vy: -0.18, radius: 1.3 },
            { x: 12, y: 11, vx: 0.12, vy: 0.2, radius: 1.2 },
            { x: 10, y: 13, vx: -0.2, vy: 0.12, radius: 1.2 },
            { x: 14, y: 13, vx: 0.2, vy: -0.12, radius: 1.2 },
        ];
        particlesRef.current = initParticles;
        setParticles(initParticles);
    }, []);

    // Physics simulation - always running
    useEffect(() => {
        const animate = () => {
            const updatedParticles = particlesRef.current.map(particle => {
                let { x, y, vx, vy, radius } = particle;

                // Update position
                x += vx;
                y += vy;

                // Bounce off boundaries (brain area: roughly 6-18 for x and y)
                if (x - radius < 6 || x + radius > 18) {
                    vx = -vx;
                    x = Math.max(6 + radius, Math.min(18 - radius, x));
                }
                if (y - radius < 6 || y + radius > 18) {
                    vy = -vy;
                    y = Math.max(6 + radius, Math.min(18 - radius, y));
                }

                return { x, y, vx, vy, radius };
            });

            particlesRef.current = updatedParticles;
            setParticles(updatedParticles);
            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, []); // Run once on mount

    return (
        <div className="relative flex items-center justify-center w-8 h-8">
            {/* Animated glow rings when active */}
            {isActive && (
                <>
                    <span className="absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-20 animate-ping"></span>
                    <span className="absolute inline-flex h-4/5 w-4/5 rounded-full bg-purple-400 opacity-30 animate-pulse" style={{ animationDelay: '0.3s' }}></span>
                </>
            )}

            {/* Main brain SVG */}
            <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                className={`relative text-purple-400 transition-all duration-500 ${isActive ? 'scale-110' : 'scale-100'}`}
            >
                {/* Outer brain shape */}
                <path
                    d="M12 2C10.5 2 9 2.5 8 3.5C7 2.5 5.5 2 4 2C2.5 2 1 3 1 5C1 6.5 1.5 8 2.5 9C1.5 10 1 11.5 1 13C1 14.5 2 16 3.5 16.5C3 17.5 3 18.5 3.5 19.5C4 20.5 5 21 6 21.5C7 22 8.5 22 10 22H14C15.5 22 17 22 18 21.5C19 21 20 20.5 20.5 19.5C21 18.5 21 17.5 20.5 16.5C22 16 23 14.5 23 13C23 11.5 22.5 10 21.5 9C22.5 8 23 6.5 23 5C23 3 21.5 2 20 2C18.5 2 17 2.5 16 3.5C15 2.5 13.5 2 12 2Z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isActive ? "0.8" : "0.5"}
                    className="transition-opacity duration-500"
                />

                {/* Bouncing particles with physics */}
                {particles.map((particle, i) => (
                    <circle
                        key={i}
                        cx={particle.x}
                        cy={particle.y}
                        r={particle.radius}
                        fill="currentColor"
                        opacity="0.9"
                    />
                ))}

                {/* Connection lines between particles - draw lines between nearby particles */}
                {particles.length >= 5 && (
                    <g className={isActive ? "animate-pulse" : ""} opacity={isActive ? "0.5" : "0.3"}>
                        {particles.map((p1, i) =>
                            particles.slice(i + 1).map((p2, j) => {
                                const distance = Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
                                if (distance < 6) {
                                    return (
                                        <line
                                            key={`${i}-${j}`}
                                            x1={p1.x}
                                            y1={p1.y}
                                            x2={p2.x}
                                            y2={p2.y}
                                            stroke="currentColor"
                                            strokeWidth="0.6"
                                            opacity={0.7 - (distance / 10)}
                                        />
                                    );
                                }
                                return null;
                            })
                        )}
                    </g>
                )}

                {/* Central core - glows when active */}
                <circle
                    cx="12"
                    cy="12"
                    r="2"
                    fill="currentColor"
                    opacity={isActive ? "1" : "0.6"}
                    className="transition-all duration-500"
                >
                    {isActive && (
                        <animate
                            attributeName="r"
                            values="2;2.5;2"
                            dur="1.5s"
                            repeatCount="indefinite"
                        />
                    )}
                </circle>

                {/* Core detail lines */}
                <path
                    d="M12 10 L12 14 M10 12 L14 12"
                    stroke="#151518"
                    strokeWidth="0.8"
                    strokeLinecap="round"
                />

                {/* Scan lines effect when active */}
                {isActive && (
                    <>
                        <line
                            x1="6"
                            y1="12"
                            x2="18"
                            y2="12"
                            stroke="currentColor"
                            strokeWidth="0.3"
                            opacity="0.6"
                            className="animate-pulse"
                        >
                            <animate
                                attributeName="y1"
                                values="8;16;8"
                                dur="2s"
                                repeatCount="indefinite"
                            />
                            <animate
                                attributeName="y2"
                                values="8;16;8"
                                dur="2s"
                                repeatCount="indefinite"
                            />
                        </line>
                        <line
                            x1="6"
                            y1="10"
                            x2="18"
                            y2="10"
                            stroke="currentColor"
                            strokeWidth="0.2"
                            opacity="0.4"
                            className="animate-pulse"
                            style={{ animationDelay: '0.5s' }}
                        >
                            <animate
                                attributeName="y1"
                                values="7;17;7"
                                dur="2.5s"
                                repeatCount="indefinite"
                            />
                            <animate
                                attributeName="y2"
                                values="7;17;7"
                                dur="2.5s"
                                repeatCount="indefinite"
                            />
                        </line>
                    </>
                )}
            </svg>
        </div>
    );
};
