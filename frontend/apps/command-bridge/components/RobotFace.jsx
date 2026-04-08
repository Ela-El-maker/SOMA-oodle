import React, { useEffect, useRef, useState } from 'react';

function pickAnime() {
  const r = Math.random();
  if (r < 0.55) return 'normal';
  if (r < 0.70) return 'uwu';
  if (r < 0.80) return 'happy';
  if (r < 0.88) return 'sparkle';
  if (r < 0.94) return 'dot';
  return 'squint';
}

function Eye({ cx, cy, phase, anime, faceState, isRight }) {
  const isClosed  = phase === 'closing' || phase === 'closed';
  const showAnime = phase === 'closed' && anime !== 'normal';
  const isOffline = faceState === 'offline';

  const baseScale = isOffline ? 0.42 : 1;
  const irisScale = isClosed ? 0 : baseScale;

  const irisColor =
    faceState === 'offline'   ? '#52525b'
    : faceState === 'listening' ? '#60a5fa'
    : faceState === 'thinking'  ? '#f59e0b'
    : '#d946ef';

  const borderGlow = faceState === 'offline' ? '#3f3f46' : irisColor;

  return (
    <g transform={`translate(${cx},${cy})`}>
      {faceState !== 'offline' && (
        <ellipse rx="23" ry="21" fill={irisColor} opacity="0.07" />
      )}

      <ellipse rx="18" ry="16"
        fill="#08080f"
        stroke={borderGlow}
        strokeWidth="1.4"
        style={{ filter: faceState !== 'offline' ? `drop-shadow(0 0 5px ${irisColor}50)` : 'none' }}
      />

      {/* Iris group — scaleY animates blink */}
      <g style={{
        transformOrigin: '0px 0px',
        transform: `scaleY(${irisScale})`,
        transition: `transform ${isClosed ? '0.09s ease-in' : '0.14s ease-out'}`,
      }}>
        <circle cy="2" r="10" fill={irisColor} opacity={isOffline ? 0.5 : 0.92} />
        <circle cy="2" r="5.5" fill="#060610" />
        <circle cx="5" cy="-2" r="3"   fill="white" opacity="0.88" />
        <circle cx="-3" cy="4" r="1.5" fill="white" opacity="0.38" />
      </g>

      {/* Anime glyph */}
      <g style={{ opacity: showAnime ? 1 : 0, transition: 'opacity 0.06s' }}>
        {anime === 'uwu' && (
          <path d="M -13 2 Q 0 -12 13 2"
            fill="none" stroke={irisColor} strokeWidth="3.5" strokeLinecap="round" />
        )}
        {anime === 'happy' && (
          <path d="M -12 3 Q 0 -9 12 3"
            fill={irisColor} fillOpacity="0.2"
            stroke={irisColor} strokeWidth="3" strokeLinecap="round" />
        )}
        {anime === 'sparkle' && (
          <g stroke={irisColor} fill={irisColor}>
            <circle r="2.5" opacity="0.9" />
            <line x1="0" y1="-11" x2="0"   y2="11"  strokeWidth="1.6" opacity="0.75" />
            <line x1="-11" y1="0" x2="11"  y2="0"   strokeWidth="1.6" opacity="0.75" />
            <line x1="-8"  y1="-8" x2="8"  y2="8"   strokeWidth="1"   opacity="0.45" />
            <line x1="8"   y1="-8" x2="-8" y2="8"   strokeWidth="1"   opacity="0.45" />
          </g>
        )}
        {anime === 'dot' && (
          <circle r="5" fill={irisColor} opacity="0.92" />
        )}
        {anime === 'squint' && (
          <path
            d={isRight ? 'M -10 -6 L 7 0 L -10 6' : 'M 10 -6 L -7 0 L 10 6'}
            fill="none" stroke={irisColor}
            strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"
          />
        )}
      </g>

      {/* Droopy eyelid for offline */}
      {isOffline && (
        <ellipse rx="18" ry="9" cy="-8" fill="#08080f" style={{ pointerEvents: 'none' }} />
      )}
    </g>
  );
}

function getMouth(faceState, vol) {
  switch (faceState) {
    case 'offline':
      return { d: 'M -16 0 L 16 0', fill: false, openAmt: 0 };
    case 'thinking':
      return { d: 'M -22 3 Q -7 14 0 10 Q 7 6 22 -2', fill: false, openAmt: 0 };
    case 'listening':
      return { d: 'M -9 -3 Q 0 5 9 -3 Q 0 11 -9 -3', fill: true, openAmt: 4 };
    case 'talking': {
      const o = Math.min(vol * 11, 12);
      return { d: `M -22 ${-o * 0.28} Q 0 ${8 + o * 0.55} 22 ${-o * 0.28}`, fill: true, openAmt: o };
    }
    default:
      return { d: 'M -22 0 Q 0 14 22 0', fill: false, openAmt: 0 };
  }
}

export function RobotFace({ volume, isTalking, isListening, isThinking, isConnected }) {
  const [phase, setPhase] = useState('open');
  const [anime, setAnime] = useState('normal');
  const blinking = useRef(false);
  const mounted  = useRef(true);

  const faceState =
    !isConnected  ? 'offline'
    : isThinking  ? 'thinking'
    : isTalking   ? 'talking'
    : isListening ? 'listening'
    : 'idle';

  const blink = async () => {
    if (blinking.current || !mounted.current) return;
    blinking.current = true;
    const expr = pickAnime();
    setAnime(expr);
    setPhase('closing');
    await new Promise(r => setTimeout(r, 100));
    if (!mounted.current) return;
    setPhase('closed');
    await new Promise(r => setTimeout(r, expr === 'normal' ? 80 : 290));
    if (!mounted.current) return;
    setPhase('opening');
    await new Promise(r => setTimeout(r, 150));
    if (!mounted.current) return;
    setPhase('open');
    blinking.current = false;
  };

  useEffect(() => {
    mounted.current = true;
    let t;
    const schedule = () => {
      t = setTimeout(() => {
        blink().then(() => { if (mounted.current) schedule(); });
      }, 2800 + Math.random() * 4200);
    };
    schedule();
    return () => { mounted.current = false; clearTimeout(t); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const { d: mouthD, fill: mouthFill, openAmt } = getMouth(faceState, volume);

  const accentColor =
    faceState === 'offline'   ? '#52525b'
    : faceState === 'listening' ? '#60a5fa'
    : faceState === 'thinking'  ? '#f59e0b'
    : '#d946ef';

  const showBlush = faceState === 'idle' || (faceState === 'talking' && volume > 0.25);
  const glowFilter = faceState !== 'offline' ? `drop-shadow(0 0 14px ${accentColor}35)` : 'none';

  return (
    <svg width="210" height="170" viewBox="-105 -85 210 170" style={{ overflow: 'visible' }}>
      {/* Ambient ring */}
      {faceState !== 'offline' && (
        <ellipse rx="82" ry="67" fill="none" stroke={accentColor} strokeWidth="0.5" opacity="0.18" />
      )}

      {/* Face plate */}
      <rect x="-70" y="-62" width="140" height="124" rx="24"
        fill="#07070e" stroke={accentColor} strokeWidth="1.3"
        style={{ filter: glowFilter }}
      />

      {/* Inner sheen */}
      <rect x="-68" y="-60" width="136" height="50" rx="20" fill="white" opacity="0.025" />

      {/* Panel etch lines */}
      {[[-70,-25,-54,-25],[54,-25,70,-25],[-70,25,-54,25],[54,25,70,25]].map(([x1,y1,x2,y2],i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
          stroke={accentColor} strokeWidth="0.8" opacity="0.22" />
      ))}

      {/* Corner screws */}
      {[[-58,-50],[58,-50],[-58,50],[58,50]].map(([cx,cy],i) => (
        <circle key={i} cx={cx} cy={cy} r="2.2"
          fill="none" stroke={accentColor} strokeWidth="0.9" opacity="0.35" />
      ))}

      {/* Status LED */}
      <circle cx="0" cy="-58" r="2.8"
        fill={isConnected ? '#10b981' : '#3f3f46'}
        style={{ filter: isConnected ? 'drop-shadow(0 0 5px #10b981)' : 'none' }}
      />

      {/* Cheek blush */}
      <ellipse cx="-54" cy="16" rx="11" ry="6" fill="#f472b6"
        opacity={showBlush ? 0.16 : 0} style={{ transition: 'opacity 0.8s ease' }} />
      <ellipse cx="54"  cy="16" rx="11" ry="6" fill="#f472b6"
        opacity={showBlush ? 0.16 : 0} style={{ transition: 'opacity 0.8s ease' }} />

      {/* Nose dots */}
      <circle cx="-3.5" cy="5" r="1.4" fill={accentColor} opacity="0.5" />
      <circle cx="0"    cy="9" r="1.8" fill={accentColor} opacity="0.45" />
      <circle cx="3.5"  cy="5" r="1.4" fill={accentColor} opacity="0.5" />

      {/* Eyes */}
      <Eye cx={-40} cy={-22} phase={phase} anime={anime} faceState={faceState} isRight={false} />
      <Eye cx={ 40} cy={-22} phase={phase} anime={anime} faceState={faceState} isRight={true}  />

      {/* Mouth */}
      <g transform="translate(0,38)">
        {mouthFill && openAmt > 0 && (
          <ellipse cx="0" cy={openAmt * 0.3}
            rx={Math.min(openAmt * 2.1 + 7, 20)} ry={openAmt * 0.65 + 2}
            fill="#060610" />
        )}
        <path d={mouthD} fill="none" stroke={accentColor} strokeWidth="2.6" strokeLinecap="round"
          style={{
            transition: 'stroke 0.4s ease',
            filter: faceState !== 'offline' ? `drop-shadow(0 0 4px ${accentColor}70)` : 'none',
          }}
        />
      </g>
    </svg>
  );
}
