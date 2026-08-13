'use client';

const RIVER_PATHS = [
  'M20 62 C 150 62, 210 150, 330 190 S 460 220, 478 224',
  'M20 142 C 130 142, 215 180, 330 205 S 460 224, 478 227',
  'M20 262 C 140 262, 225 235, 330 222 S 460 230, 478 230',
  'M20 344 C 160 344, 235 280, 340 240 S 460 233, 478 232',
];

const NODES = [
  { label: 'GOVERNMENT', cx: 20, cy: 62, ty: 52, color: '#1B3B6F' },
  { label: 'ACADEMIA', cx: 20, cy: 142, ty: 132, color: '#00A86B' },
  { label: 'INDUSTRY', cx: 20, cy: 262, ty: 252, color: '#F7B733' },
  { label: 'CITIZENS', cx: 20, cy: 344, ty: 334, color: '#1B3B6F' },
];

/**
 * Tributaries of ideas — government, academia, industry, and citizens —
 * converging into the National Innovation Repository.
 */
export function ConfluenceGraphic() {
  return (
    <figure aria-hidden>
      <svg viewBox="0 0 520 420" className="block h-auto w-full" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="flowg" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#1B3B6F" stopOpacity=".45" />
            <stop offset="1" stopColor="#00A86B" />
          </linearGradient>
        </defs>

        {/* river beds — static, soft */}
        <g fill="none" stroke="#1B3B6F" strokeOpacity=".12" strokeWidth="7" strokeLinecap="round">
          {RIVER_PATHS.map((d) => (
            <path key={d} d={d} />
          ))}
        </g>

        {/* flowing currents */}
        <g strokeWidth="2.25">
          {RIVER_PATHS.map((d, i) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke="url(#flowg)"
              strokeDasharray="6 10"
              className="animate-flow"
              style={{ animationDelay: `${-i * 6}s` }}
            />
          ))}
        </g>

        {/* labeled source nodes */}
        <g fontFamily="var(--font-mono)" fontSize="10.5" letterSpacing="1.5" fill="#4E5F7A">
          {NODES.map((node) => (
            <g key={node.label}>
              <circle cx={node.cx} cy={node.cy} r="6" fill={node.color} />
              <text x={node.cx + 16} y={node.ty}>
                {node.label}
              </text>
            </g>
          ))}
        </g>

        {/* confluence nodes */}
        <circle cx="330" cy="190" r="5.5" fill="#F7B733" />
        <circle cx="330" cy="222" r="5.5" fill="#00A86B" />

        {/* repository stack at the confluence */}
        <g transform="translate(378,140)">
          <ellipse cx="66" cy="122" rx="62" ry="15" fill="#1B3B6F" opacity=".1" />
          <path d="M0 108 L66 88 L132 108 L66 128 Z" fill="#1B3B6F" />
          <path d="M0 83 L66 63 L132 83 L66 103 Z" fill="#00A86B" />
          <path d="M0 58 L66 38 L132 58 L66 78 Z" fill="#F7B733" />
          <line x1="66" y1="38" x2="66" y2="12" stroke="#1B3B6F" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="66" cy="6" r="9" fill="#F42A41" />
          <text x="66" y="150" textAnchor="middle" fontFamily="var(--font-mono)" fontSize="10.5" letterSpacing="2" fill="#4E5F7A">
            THE REPOSITORY
          </text>
        </g>
      </svg>
    </figure>
  );
}
