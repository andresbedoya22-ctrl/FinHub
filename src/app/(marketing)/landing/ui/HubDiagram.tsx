export function HubDiagram() {
  return (
    <svg viewBox="0 0 880 520" className="w-full h-auto" role="img" aria-label="FinHub hub diagram">
      <defs>
        <linearGradient id="fhGlow" x1="0" x2="1">
          <stop offset="0%" stopColor="#4CAF50" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#0D1B2A" stopOpacity="0.05" />
        </linearGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="8" stdDeviation="10" floodOpacity="0.18" />
        </filter>
      </defs>

      <rect x="0" y="0" width="880" height="520" rx="28" fill="url(#fhGlow)" />

      {/* connections */}
      <g stroke="#0D1B2A" strokeOpacity="0.18" strokeWidth="3">
        <line x1="440" y1="260" x2="160" y2="140" />
        <line x1="440" y1="260" x2="160" y2="260" />
        <line x1="440" y1="260" x2="160" y2="380" />
        <line x1="440" y1="260" x2="720" y2="140" />
        <line x1="440" y1="260" x2="720" y2="260" />
        <line x1="440" y1="260" x2="720" y2="380" />
      </g>

      {/* core */}
      <g filter="url(#softShadow)">
        <circle cx="440" cy="260" r="92" fill="#0D1B2A" />
        <circle cx="440" cy="260" r="92" fill="none" stroke="#4CAF50" strokeWidth="6" />
        <text x="440" y="250" textAnchor="middle" fontSize="18" fill="#ffffff" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
          FinHub Core
        </text>
        <text x="440" y="278" textAnchor="middle" fontSize="14" fill="#ffffff" opacity="0.9" fontFamily="ui-sans-serif, system-ui">
          Personal Finance
        </text>
      </g>

      {/* left nodes */}
      {[
        { x: 160, y: 140, label: "Taxes (IB)" },
        { x: 160, y: 260, label: "Toeslagen" },
        { x: 160, y: 380, label: "Documents + OCR" },
        { x: 720, y: 140, label: "Mortgages" },
        { x: 720, y: 260, label: "Personal loans" },
        { x: 720, y: 380, label: "Insurance" },
      ].map((n) => (
        <g key={n.label} filter="url(#softShadow)">
          <rect x={n.x - 120} y={n.y - 34} width="240" height="68" rx="18" fill="#ffffff" />
          <rect x={n.x - 120} y={n.y - 34} width="240" height="68" rx="18" fill="none" stroke="#0D1B2A" strokeOpacity="0.12" />
          <circle cx={n.x - 92} cy={n.y} r="10" fill="#4CAF50" />
          <text x={n.x - 70} y={n.y + 6} fontSize="14" fill="#0D1B2A" fontFamily="ui-sans-serif, system-ui" fontWeight="700">
            {n.label}
          </text>
        </g>
      ))}
    </svg>
  );
}
