import type { SVGProps } from "react";

/**
 * Animated YAP CLI-style ASCII art icon with multiple animations:
 * - Glow pulse effect (native SVG filter with SMIL animation)
 * - Blinking eyes with sleepy squint state
 * - Eye tracking (looks left/right occasionally)
 * - Eyes look down when input is focused
 * All animations are CSS/SMIL and GPU-accelerated.
 */
export const YapIconAnimated = ({
  isInputFocused = false,
  ...props
}: SVGProps<SVGSVGElement> & { isInputFocused?: boolean }) => (
  <svg
    aria-labelledby="yap-icon-animated-title"
    fill="currentColor"
    overflow="visible"
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title id="yap-icon-animated-title">YAP</title>

    {/* Native SVG filter for glow - works on Safari iOS */}
    <defs>
      <filter
        filterUnits="userSpaceOnUse"
        height="200%"
        id="yap-glow-filter"
        width="200%"
        x="-50%"
        y="-50%"
      >
        <feGaussianBlur in="SourceGraphic" result="blur">
          <animate
            attributeName="stdDeviation"
            begin="1.5s"
            calcMode="spline"
            dur="6s"
            keySplines="0.4 0 0.6 1; 0.4 0 0.6 1"
            keyTimes="0; 0.5; 1"
            repeatCount="indefinite"
            values="0;6;0"
          />
        </feGaussianBlur>
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <style>
      {`
        text {
          font-family: "JetBrains Mono", "Fira Code", "SF Mono", "Consolas", "Monaco", monospace;
          font-size: 6px;
          white-space: pre;
          dominant-baseline: middle;
          user-select: none;
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
        
        /* Eyes look down when input is focused */
        .yap-eye-wrapper {
          transition: transform 0.3s ease-out;
        }
        .yap-eye-wrapper.focused {
          transform: translateY(2px);
        }
        
      `}
    </style>

    {/* All content with native SVG glow filter */}
    <g filter="url(#yap-glow-filter)">
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

      {/* Border with glow */}
      <rect
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
      <g
        className={
          isInputFocused ? "yap-eye-wrapper focused" : "yap-eye-wrapper"
        }
      >
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
