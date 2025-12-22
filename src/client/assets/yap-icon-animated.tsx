import type { SVGProps } from "react";

/**
 * Animated YAP CLI-style ASCII art icon with multiple animations:
 * - Glow pulse effect (filter drop-shadow)
 * - Blinking eyes with sleepy squint state
 * - Eye tracking (looks left/right occasionally)
 * All animations are CSS-only and GPU-accelerated.
 */
export const YapIconAnimated = (props: SVGProps<SVGSVGElement>) => (
  <svg
    aria-labelledby="yap-icon-animated-title"
    fill="currentColor"
    overflow="visible"
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title id="yap-icon-animated-title">YAP</title>
    <style>
      {`
        text {
          font-family: "JetBrains Mono", "Fira Code", "SF Mono", "Consolas", "Monaco", monospace;
          font-size: 6px;
          white-space: pre;
          dominant-baseline: middle;
        }
        
        /* Glow pulse */
        .yap-glow {
          filter: drop-shadow(0 0 1px currentColor);
          animation: glow-pulse 4s ease-in-out 1.5s infinite;
        }
        @keyframes glow-pulse {
          0%, 100% { filter: drop-shadow(0 0 1px currentColor); }
          50% { filter: drop-shadow(0 0 4px currentColor); }
        }
        
        /* Eye blink with sleepy squint before closing */
        .yap-eyes {
          transform-origin: 48px 67px;
          animation: blink 6s ease-in-out 2s infinite;
        }
        @keyframes blink {
          0%, 88% { transform: scaleY(1); opacity: 1; }
          91% { transform: scaleY(0.4); opacity: 1; }
          94%, 97% { transform: scaleY(0); opacity: 0; }
          100% { transform: scaleY(1); opacity: 1; }
        }
        
        /* Eye tracking - occasionally looks left/right */
        .yap-eye-group {
          animation: eye-track 10s ease-in-out 2.5s infinite;
        }
        @keyframes eye-track {
          0%, 35% { transform: translateX(0); }
          40%, 50% { transform: translateX(-2px); }
          55%, 75% { transform: translateX(0); }
          80%, 90% { transform: translateX(2px); }
          95%, 100% { transform: translateX(0); }
        }
        
      `}
    </style>

    {/* All content with glow */}
    <g className="yap-glow">
      {/* YAP Logo text */}
      {/* biome-ignore format: preserve ASCII art spacing */}
      <text textAnchor="middle" x="49" y="17">{"██╗   ██╗ █████╗ █████╗"}</text>
      <text textAnchor="middle" x="49" y="23">
        {"  ██╗ ██╔╝██╔══██╗██╔═██╗"}
      </text>
      <text textAnchor="middle" x="49" y="29">
        {"   ████╔╝ ███████║█████╔╝"}
      </text>
      <text textAnchor="middle" x="49" y="35">
        {"   ██╔╝  ██╔══██║██╔══╝"}
      </text>
      <text textAnchor="middle" x="49" y="41">
        {"██║   ██║  ██║██║"}
      </text>
      <text textAnchor="middle" x="49" y="47">
        {"╚═╝   ╚═╝  ╚═╝╚═╝"}
      </text>

      {/* Face border with glow */}
      <rect
        className="yap-glow"
        fill="none"
        height="100"
        rx="16"
        stroke="currentColor"
        strokeWidth="1.5"
        width="100"
        x="0"
        y="0"
      />

      {/* Eyes with tracking animation */}
      <g className="yap-eye-group">
        {/* Eye frames (static) */}
        <text textAnchor="middle" x="49" y="63">
          {" ▀▀▀▀         ▀▀▀▀"}
        </text>
        {/* Pupils (blink + sleepy) */}
        <text className="yap-eyes" textAnchor="middle" x="49" y="67">
          {" ████         ████"}
        </text>
      </g>

      {/* Body/arm */}
      <text textAnchor="middle" x="49" y="79">
        {"             █"}
      </text>
      <text textAnchor="middle" x="49" y="83">
        {" █████████████"}
      </text>
    </g>
  </svg>
);
