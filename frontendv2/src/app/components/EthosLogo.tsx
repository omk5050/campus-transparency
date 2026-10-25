import React from 'react';

interface EthosLogoProps {
  size?: number;
  className?: string;
  showWordmark?: boolean;
  showSubtitle?: boolean;
}

export function EthosLogo({
  size = 28,
  className = '',
  showWordmark = false,
  showSubtitle = false,
}: EthosLogoProps) {
  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-shrink-0"
        aria-label="ETHOS Logo"
      >
        <rect width="32" height="32" rx="8" fill="#08090E" />
        <path
          d="M16 3L26 7.5V15C26 21.2 21.8 26.9 16 29C10.2 26.9 6 21.2 6 15V7.5L16 3Z"
          stroke="#00C8E8"
          strokeWidth="2"
          strokeLinejoin="round"
          fill="#0F1117"
        />
        <path
          d="M12 11H20M12 16H18M12 21H20"
          stroke="#00C8E8"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M12 10V22"
          stroke="#FFFFFF"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
      {showWordmark && (
        <div className="flex flex-col">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-[#E2E5EE] font-bold leading-none">
            ETHOS
          </span>
          {showSubtitle && (
            <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-[#00C8E8] mt-0.5 leading-none">
              Ethical Governance System
            </span>
          )}
        </div>
      )}
    </div>
  );
}
