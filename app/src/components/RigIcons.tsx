/** Animated SVG rig icons for the mining selector */
import { memo } from "react";

export const CpuIcon = memo(function CpuIcon({ active }: { active: boolean }) {
  const color = active ? "var(--green)" : "var(--rig-inactive)";
  return (
    <svg className="rig-svg rig-cpu" viewBox="0 0 48 48" width={48} height={48}>
      {/* Pins — top */}
      {[14, 20, 26, 32].map((x) => (
        <rect key={`t${x}`} x={x} y={4} width={2} height={6} rx={1} fill={color} className="rig-pin" />
      ))}
      {/* Pins — bottom */}
      {[14, 20, 26, 32].map((x) => (
        <rect key={`b${x}`} x={x} y={38} width={2} height={6} rx={1} fill={color} className="rig-pin" />
      ))}
      {/* Pins — left */}
      {[14, 20, 26, 32].map((y) => (
        <rect key={`l${y}`} x={4} y={y} width={6} height={2} rx={1} fill={color} className="rig-pin" />
      ))}
      {/* Pins — right */}
      {[14, 20, 26, 32].map((y) => (
        <rect key={`r${y}`} x={38} y={y} width={6} height={2} rx={1} fill={color} className="rig-pin" />
      ))}
      {/* Chip body */}
      <rect x={10} y={10} width={28} height={28} rx={3} fill="var(--rig-body)" stroke={color} strokeWidth={1.5} />
      {/* Inner die */}
      <rect x={16} y={16} width={16} height={16} rx={1.5} fill="none" stroke={color} strokeWidth={0.8} opacity={0.6} />
      {/* Circuit traces — pulsing */}
      <line x1={18} y1={24} x2={30} y2={24} stroke={color} strokeWidth={0.7} className="cpu-trace cpu-trace-1" />
      <line x1={24} y1={18} x2={24} y2={30} stroke={color} strokeWidth={0.7} className="cpu-trace cpu-trace-2" />
      <line x1={19} y1={19} x2={29} y2={29} stroke={color} strokeWidth={0.5} className="cpu-trace cpu-trace-3" />
      <line x1={29} y1={19} x2={19} y2={29} stroke={color} strokeWidth={0.5} className="cpu-trace cpu-trace-4" />
      {/* Core dot */}
      <circle cx={24} cy={24} r={2.5} fill={color} className="cpu-core" />
    </svg>
  );
});

export const GpuIcon = memo(function GpuIcon({ active }: { active: boolean }) {
  const color = active ? "var(--blue)" : "var(--rig-inactive)";
  return (
    <svg className="rig-svg rig-gpu" viewBox="0 0 48 48" width={48} height={48}>
      {/* Card body */}
      <rect x={4} y={10} width={40} height={26} rx={4} fill="var(--rig-body)" stroke={color} strokeWidth={1.5} />
      {/* PCIe connector */}
      <rect x={8} y={36} width={14} height={3} rx={1} fill={color} opacity={0.5} />
      <rect x={26} y={36} width={6} height={3} rx={1} fill={color} opacity={0.5} />
      {/* Fan housing */}
      <circle cx={20} cy={23} r={9} fill="none" stroke={color} strokeWidth={0.8} opacity={0.4} />
      {/* Fan blades — spinning */}
      <g className="gpu-fan" style={{ transformOrigin: "20px 23px" }}>
        {[0, 60, 120, 180, 240, 300].map((angle) => (
          <line
            key={angle}
            x1={20}
            y1={23}
            x2={20 + 7 * Math.cos((angle * Math.PI) / 180)}
            y2={23 + 7 * Math.sin((angle * Math.PI) / 180)}
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
          />
        ))}
      </g>
      {/* Fan center */}
      <circle cx={20} cy={23} r={2} fill={color} opacity={0.6} />
      {/* Heat pipes */}
      <rect x={33} y={14} width={7} height={1.5} rx={0.75} fill={color} opacity={0.3} />
      <rect x={33} y={17.5} width={7} height={1.5} rx={0.75} fill={color} opacity={0.3} />
      <rect x={33} y={21} width={7} height={1.5} rx={0.75} fill={color} opacity={0.3} />
      <rect x={33} y={24.5} width={7} height={1.5} rx={0.75} fill={color} opacity={0.3} />
      <rect x={33} y={28} width={7} height={1.5} rx={0.75} fill={color} opacity={0.3} />
      {/* Power LED */}
      <circle cx={38} cy={32} r={1.2} fill={color} className="gpu-led" />
    </svg>
  );
});

export const FpgaIcon = memo(function FpgaIcon({ active }: { active: boolean }) {
  const color = active ? "var(--pink)" : "var(--rig-inactive)";
  return (
    <svg className="rig-svg rig-fpga" viewBox="0 0 48 48" width={48} height={48}>
      {/* Board outline */}
      <rect x={6} y={6} width={36} height={36} rx={3} fill="var(--rig-body)" stroke={color} strokeWidth={1.2} />
      {/* Grid of logic blocks */}
      {[12, 20, 28].map((x) =>
        [12, 20, 28].map((y) => (
          <rect key={`${x}-${y}`} x={x} y={y} width={6} height={6} rx={1} fill="none" stroke={color} strokeWidth={0.6} opacity={0.4} />
        ))
      )}
      {/* Data flow paths — animated */}
      <line x1={15} y1={15} x2={23} y2={15} stroke={color} strokeWidth={0.8} className="fpga-path fpga-path-1" />
      <line x1={23} y1={15} x2={23} y2={23} stroke={color} strokeWidth={0.8} className="fpga-path fpga-path-2" />
      <line x1={23} y1={23} x2={31} y2={23} stroke={color} strokeWidth={0.8} className="fpga-path fpga-path-3" />
      <line x1={31} y1={23} x2={31} y2={31} stroke={color} strokeWidth={0.8} className="fpga-path fpga-path-4" />
      <line x1={15} y1={23} x2={15} y2={31} stroke={color} strokeWidth={0.8} className="fpga-path fpga-path-5" />
      <line x1={15} y1={31} x2={23} y2={31} stroke={color} strokeWidth={0.8} className="fpga-path fpga-path-6" />
      {/* Data pulse dots */}
      <circle cx={0} cy={0} r={1.5} fill={color} className="fpga-dot fpga-dot-1">
        <animateMotion dur="2s" repeatCount="indefinite" path="M15,15 L23,15 L23,23 L31,23 L31,31" />
      </circle>
      <circle cx={0} cy={0} r={1.5} fill={color} className="fpga-dot fpga-dot-2">
        <animateMotion dur="2.4s" repeatCount="indefinite" path="M15,23 L15,31 L23,31 L31,31" begin="0.6s" />
      </circle>
      {/* Corner connectors */}
      <circle cx={9} cy={9} r={1.2} fill={color} opacity={0.5} />
      <circle cx={39} cy={9} r={1.2} fill={color} opacity={0.5} />
      <circle cx={9} cy={39} r={1.2} fill={color} opacity={0.5} />
      <circle cx={39} cy={39} r={1.2} fill={color} opacity={0.5} />
    </svg>
  );
});

export const AsicIcon = memo(function AsicIcon({ active }: { active: boolean }) {
  const color = active ? "var(--yellow)" : "var(--rig-inactive)";
  return (
    <svg className="rig-svg rig-asic" viewBox="0 0 48 48" width={48} height={48}>
      {/* Machine body */}
      <rect x={4} y={14} width={40} height={24} rx={3} fill="var(--rig-body)" stroke={color} strokeWidth={1.5} />
      {/* Top vent grille */}
      <rect x={4} y={8} width={40} height={6} rx={2} fill="var(--rig-body)" stroke={color} strokeWidth={1} />
      {[10, 16, 22, 28, 34, 38].map((x) => (
        <line key={x} x1={x} y1={9.5} x2={x} y2={12.5} stroke={color} strokeWidth={0.6} opacity={0.5} />
      ))}
      {/* Hash boards — 3 rows */}
      {[18, 24, 30].map((y) => (
        <g key={y}>
          <rect x={8} y={y} width={32} height={3} rx={1} fill="none" stroke={color} strokeWidth={0.6} opacity={0.5} />
          {/* Chips on board */}
          {[11, 17, 23, 29, 35].map((x) => (
            <rect key={`${x}-${y}`} x={x} y={y + 0.5} width={2} height={2} rx={0.3} fill={color} opacity={0.4} className="asic-chip" />
          ))}
        </g>
      ))}
      {/* Power indicator */}
      <circle cx={40} cy={35} r={1.5} fill={color} className="asic-power" />
      {/* Heat waves rising */}
      <path d="M14,8 Q16,4 18,8" fill="none" stroke={color} strokeWidth={0.8} strokeLinecap="round" className="heat-wave heat-wave-1" />
      <path d="M22,8 Q24,4 26,8" fill="none" stroke={color} strokeWidth={0.8} strokeLinecap="round" className="heat-wave heat-wave-2" />
      <path d="M30,8 Q32,4 34,8" fill="none" stroke={color} strokeWidth={0.8} strokeLinecap="round" className="heat-wave heat-wave-3" />
      {/* Fan circle (side) */}
      <circle cx={40} cy={26} r={3} fill="none" stroke={color} strokeWidth={0.6} opacity={0.4} />
      <line x1={40} y1={23.5} x2={40} y2={28.5} stroke={color} strokeWidth={0.5} className="asic-fan" style={{ transformOrigin: "40px 26px" }} />
      <line x1={37.5} y1={26} x2={42.5} y2={26} stroke={color} strokeWidth={0.5} className="asic-fan" style={{ transformOrigin: "40px 26px" }} />
    </svg>
  );
});
