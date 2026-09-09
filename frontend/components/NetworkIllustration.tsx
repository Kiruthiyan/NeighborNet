/** Hand-drawn SVG standing in for the product itself: a hub with four
 * neighbor roles (recipient/donor/volunteer/coordinator) that stays intact
 * when a "disruption" node lights up amber - the same shape the backend's
 * risk classifier and disaster mode actually work with, not generic clipart. */
export function NetworkIllustration() {
  const nodes = [
    { x: 40, y: 40, color: "#2f6f4e", label: "Recipient" },
    { x: 260, y: 40, color: "#2f6f4e", label: "Donor" },
    { x: 40, y: 240, color: "#2f6f4e", label: "Volunteer" },
    { x: 260, y: 240, color: "#28758a", label: "Coordinator" }
  ];
  const center = { x: 150, y: 140 };
  const disruption = { x: 150, y: 20 };

  return (
    <svg
      aria-hidden="true"
      className="h-full w-full"
      preserveAspectRatio="xMidYMid meet"
      viewBox="0 0 300 280"
    >
      {nodes.map((node) => (
        <line
          key={`line-${node.label}`}
          stroke="#c9d6cd"
          strokeDasharray="4 5"
          strokeWidth={2}
          x1={center.x}
          x2={node.x}
          y1={center.y}
          y2={node.y}
        />
      ))}
      <line
        stroke="#e6b566"
        strokeDasharray="3 4"
        strokeWidth={2}
        x1={center.x}
        x2={disruption.x}
        y1={center.y}
        y2={disruption.y}
      />

      {/* Hub */}
      <g className="animate-network-drift">
        <circle cx={center.x} cy={center.y} fill="#ffffff" r={30} stroke="#2f6f4e" strokeWidth={3} />
        <circle cx={center.x} cy={center.y} fill="#2f6f4e" opacity={0.15} r={30} className="animate-network-pulse" />
        <text
          fill="#18202a"
          fontSize={11}
          fontWeight={600}
          textAnchor="middle"
          x={center.x}
          y={center.y + 4}
        >
          Network
        </text>
      </g>

      {/* Role nodes */}
      {nodes.map((node) => (
        <g key={node.label}>
          <circle cx={node.x} cy={node.y} fill="#ffffff" r={22} stroke={node.color} strokeWidth={2.5} />
          <circle
            className="animate-network-pulse"
            cx={node.x}
            cy={node.y}
            fill={node.color}
            opacity={0.18}
            r={22}
          />
          <text
            fill="#18202a"
            fontSize={9.5}
            fontWeight={600}
            textAnchor="middle"
            x={node.x}
            y={node.y + 38}
          >
            {node.label}
          </text>
        </g>
      ))}

      {/* Disruption node - shows the network re-routing around a problem */}
      <g>
        <circle cx={disruption.x} cy={disruption.y} fill="#fff7ec" r={16} stroke="#b45309" strokeWidth={2.5} />
        <circle
          className="animate-network-pulse"
          cx={disruption.x}
          cy={disruption.y}
          fill="#b45309"
          opacity={0.25}
          r={16}
        />
        <text fill="#b45309" fontSize={14} fontWeight={700} textAnchor="middle" x={disruption.x} y={disruption.y + 5}>
          !
        </text>
      </g>
    </svg>
  );
}
