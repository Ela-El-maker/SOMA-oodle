import React from 'react';

type SomaLogoProps = {
  className?: string;
  glow?: boolean;
};

export const SomaLogo: React.FC<SomaLogoProps> = ({ className = '', glow = false }) => (
  <div className={`relative inline-flex items-center justify-center ${className}`}>
    {glow && (
      <div className="absolute inset-0 rounded-full bg-cyan-400/20 blur-xl"></div>
    )}
    <svg
      viewBox="0 0 24 24"
      className="relative z-10 w-full h-full"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2C10.5 2 9 2.5 8 3.5C7 2.5 5.5 2 4 2C2.5 2 1 3 1 5C1 6.5 1.5 8 2.5 9C1.5 10 1 11.5 1 13C1 14.5 2 16 3.5 16.5C3 17.5 3 18.5 3.5 19.5C4 20.5 5 21 6 21.5C7 22 8.5 22 10 22H14C15.5 22 17 22 18 21.5C19 21 20 20.5 20.5 19.5C21 18.5 21 17.5 20.5 16.5C22 16 23 14.5 23 13C23 11.5 22.5 10 21.5 9C22.5 8 23 6.5 23 5C23 3 21.5 2 20 2C18.5 2 17 2.5 16 3.5C15 2.5 13.5 2 12 2Z" />
      <circle cx="9" cy="12" r="0.9" fill="currentColor">
        <animate attributeName="cx" values="8;10;9;8" dur="2.8s" repeatCount="indefinite" />
        <animate attributeName="cy" values="12;10;14;12" dur="2.8s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;1;0.6;0.4" dur="2.8s" repeatCount="indefinite" />
      </circle>
      <circle cx="15" cy="10" r="0.8" fill="currentColor">
        <animate attributeName="cx" values="14;16;15;14" dur="3.2s" repeatCount="indefinite" />
        <animate attributeName="cy" values="10;12;9;10" dur="3.2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.3;0.9;0.5;0.3" dur="3.2s" repeatCount="indefinite" />
      </circle>
      <circle cx="12" cy="16" r="0.85" fill="currentColor">
        <animate attributeName="cx" values="11;13;12;11" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="cy" values="16;14;17;16" dur="2.4s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.35;1;0.55;0.35" dur="2.4s" repeatCount="indefinite" />
      </circle>
      <circle cx="7.5" cy="9.5" r="0.6" fill="currentColor">
        <animate attributeName="cx" values="7;8.5;7.5;7" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="cy" values="9;11;9.5;9" dur="3.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0.8;0.4;0.2" dur="3.6s" repeatCount="indefinite" />
      </circle>
      <circle cx="16.5" cy="14.5" r="0.6" fill="currentColor">
        <animate attributeName="cx" values="16;18;16.5;16" dur="3.1s" repeatCount="indefinite" />
        <animate attributeName="cy" values="14;15.5;14.5;14" dur="3.1s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.25;0.85;0.5;0.25" dur="3.1s" repeatCount="indefinite" />
      </circle>
      <circle cx="10.5" cy="7.5" r="0.55" fill="currentColor">
        <animate attributeName="cx" values="10;11.5;10.5;10" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="cy" values="7;8.5;7.5;7" dur="2.6s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.2;0.7;0.4;0.2" dur="2.6s" repeatCount="indefinite" />
      </circle>
    </svg>
  </div>
);



