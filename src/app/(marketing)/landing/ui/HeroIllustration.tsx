import * as React from "react";

export function HeroIllustration() {
  return (
    <div className="relative overflow-hidden rounded-2xl">
      {/* Soft glow */}
      <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-[#4CAF50]/20 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 -bottom-24 h-64 w-64 rounded-full bg-sky-400/15 blur-3xl" />

      <svg
        viewBox="0 0 960 560"
        className="h-auto w-full"
        role="img"
        aria-label="FinHub product overview illustration"
      >
        <defs>
          <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#0B1624" />
            <stop offset="0.55" stopColor="#0D1B2A" />
            <stop offset="1" stopColor="#0A2236" />
          </linearGradient>

          <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(255,255,255,0.10)" />
            <stop offset="1" stopColor="rgba(255,255,255,0.04)" />
          </linearGradient>

          <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#4CAF50" />
            <stop offset="1" stopColor="#7CFF86" />
          </linearGradient>

          <filter id="shadow" x="-30%" y="-30%" width="160%" height="160%">
            <feDropShadow dx="0" dy="10" stdDeviation="14" floodColor="rgba(0,0,0,0.35)" />
          </filter>

          <filter id="soft" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="14" />
          </filter>

          <radialGradient id="orb" cx="50%" cy="50%" r="55%">
            <stop offset="0" stopColor="rgba(76,175,80,0.55)" />
            <stop offset="1" stopColor="rgba(76,175,80,0)" />
          </radialGradient>
        </defs>

        {/* Background */}
        <rect x="0" y="0" width="960" height="560" fill="url(#bg)" />

        {/* Decorative grid */}
        <g opacity="0.18">
          {Array.from({ length: 16 }).map((_, i) => (
            <line key={i} x1={60 + i * 55} y1="40" x2={60 + i * 55} y2="520" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
          ))}
          {Array.from({ length: 10 }).map((_, i) => (
            <line key={i} x1="60" y1={60 + i * 50} x2="900" y2={60 + i * 50} stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
          ))}
        </g>

        {/* Orbs */}
        <circle cx="190" cy="150" r="120" fill="url(#orb)" opacity="0.55" />
        <circle cx="760" cy="420" r="140" fill="url(#orb)" opacity="0.35" />

        {/* Main glass panel */}
        <g filter="url(#shadow)">
          <rect x="110" y="90" width="740" height="380" rx="26" fill="url(#glass)" stroke="rgba(255,255,255,0.14)" />
        </g>

        {/* Top bar */}
        <g>
          <rect x="130" y="110" width="700" height="44" rx="16" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.10)" />
          <circle cx="152" cy="132" r="6" fill="rgba(255,255,255,0.20)" />
          <circle cx="172" cy="132" r="6" fill="rgba(255,255,255,0.18)" />
          <circle cx="192" cy="132" r="6" fill="rgba(76,175,80,0.85)" />
          <rect x="220" y="124" width="190" height="16" rx="8" fill="rgba(255,255,255,0.10)" />
          <rect x="420" y="124" width="120" height="16" rx="8" fill="rgba(255,255,255,0.08)" />
          <rect x="555" y="124" width="80" height="16" rx="8" fill="rgba(255,255,255,0.08)" />
        </g>

        {/* Left module: Core finance */}
        <g>
          <rect x="140" y="170" width="360" height="280" rx="22" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.10)" />

          {/* Core header */}
          <rect x="160" y="192" width="170" height="18" rx="9" fill="rgba(255,255,255,0.14)" />
          <rect x="160" y="218" width="280" height="12" rx="6" fill="rgba(255,255,255,0.08)" />

          {/* Donut */}
          <circle cx="250" cy="315" r="54" fill="none" stroke="rgba(255,255,255,0.10)" strokeWidth="14" />
          <path
            d="M250 261
               a54 54 0 1 1 -0.1 0"
            fill="none"
            stroke="url(#accent)"
            strokeWidth="14"
            strokeDasharray="210 340"
            strokeLinecap="round"
          />
          <circle cx="250" cy="315" r="28" fill="rgba(10,22,36,0.55)" stroke="rgba(255,255,255,0.10)" />
          <rect x="292" y="286" width="170" height="14" rx="7" fill="rgba(255,255,255,0.10)" />
          <rect x="292" y="308" width="130" height="14" rx="7" fill="rgba(255,255,255,0.08)" />
          <rect x="292" y="330" width="150" height="14" rx="7" fill="rgba(255,255,255,0.08)" />

          {/* Transactions */}
          {Array.from({ length: 4 }).map((_, i) => (
            <g key={i}>
              <rect x="160" y={370 + i * 18} width="300" height="10" rx="5" fill="rgba(255,255,255,0.08)" />
              <rect x="470" y={370 + i * 18} width={20 + i * 8} height="10" rx="5" fill="rgba(76,175,80,0.25)" />
            </g>
          ))}
        </g>

        {/* Right module: Guided flows */}
        <g>
          <rect x="520" y="170" width="310" height="280" rx="22" fill="rgba(255,255,255,0.06)" stroke="rgba(255,255,255,0.10)" />

          {/* Chips */}
          {[
            { x: 540, y: 194, w: 110 },
            { x: 658, y: 194, w: 86 },
            { x: 748, y: 194, w: 62 },
          ].map((c, i) => (
            <rect key={i} x={c.x} y={c.y} width={c.w} height="20" rx="10" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.10)" />
          ))}

          {/* Flow items */}
          {Array.from({ length: 5 }).map((_, i) => (
            <g key={i}>
              <rect x="540" y={230 + i * 40} width="270" height="32" rx="16" fill="rgba(255,255,255,0.07)" stroke="rgba(255,255,255,0.10)" />
              <circle cx="560" cy={246 + i * 40} r="7" fill={i % 2 === 0 ? "rgba(76,175,80,0.95)" : "rgba(255,255,255,0.20)"} />
              <rect x="578" y={239 + i * 40} width="140" height="14" rx="7" fill="rgba(255,255,255,0.12)" />
              <rect x="724" y={239 + i * 40} width="66" height="14" rx="7" fill="rgba(255,255,255,0.08)" />
            </g>
          ))}
        </g>

        {/* Connectors: Core -> Flows */}
        <g opacity="0.9">
          <path
            d="M500 270 C 560 260, 560 260, 520 250"
            fill="none"
            stroke="url(#accent)"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M500 320 C 560 320, 560 320, 520 330"
            fill="none"
            stroke="rgba(255,255,255,0.22)"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M500 360 C 560 380, 560 380, 520 390"
            fill="none"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </g>

        {/* Bottom badges */}
        <g>
          <rect x="130" y="462" width="160" height="34" rx="17" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.10)" />
          <circle cx="150" cy="479" r="7" fill="rgba(76,175,80,0.95)" />
          <rect x="164" y="472" width="110" height="14" rx="7" fill="rgba(255,255,255,0.12)" />

          <rect x="300" y="462" width="190" height="34" rx="17" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.10)" />
          <rect x="320" y="472" width="150" height="14" rx="7" fill="rgba(255,255,255,0.10)" />

          <rect x="500" y="462" width="220" height="34" rx="17" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.10)" />
          <rect x="520" y="472" width="180" height="14" rx="7" fill="rgba(255,255,255,0.10)" />
        </g>
      </svg>
    </div>
  );
}
