import type { SVGProps } from "react";

/**
 * YAP CLI-style ASCII art icon as SVG React component
 * Uses currentColor for CSS color inheritance
 */
export const YapIcon = (props: SVGProps<SVGSVGElement>) => (
  <svg
    aria-labelledby="yap-icon-title"
    fill="currentColor"
    viewBox="0 0 100 100"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <title id="yap-icon-title">YAP</title>
    <style>
      {`text {
        font-family: "JetBrains Mono", "Fira Code", "SF Mono", "Consolas", "Monaco", monospace;
        font-size: 7px;
        white-space: pre;
        dominant-baseline: middle;
      }`}
    </style>
    {/* <g transform="translate(0, -8)"> */}
    {/* biome-ignore format: preserve ASCII art spacing */}
    <text textAnchor="middle" x="48" y="17">{"██╗   ██╗ █████╗ █████╗"}</text>
    <text textAnchor="middle" x="48" y="23">
      {"  ██╗ ██╔╝██╔══██╗██╔═██╗"}
    </text>
    <text textAnchor="middle" x="48" y="29">
      {"   ████╔╝ ███████║█████╔╝"}
    </text>
    <text textAnchor="middle" x="48" y="35">
      {"   ██╔╝  ██╔══██║██╔══╝"}
    </text>
    <text textAnchor="middle" x="48" y="41">
      {"██║   ██║  ██║██║"}
    </text>
    <text textAnchor="middle" x="48" y="47">
      {"╚═╝   ╚═╝  ╚═╝╚═╝"}
    </text>
    <text textAnchor="middle" x="48" y="63">
      {" ▀▀▀▀         ▀▀▀▀"}
    </text>
    <text textAnchor="middle" x="48" y="67">
      {" ████         ████"}
    </text>
    {/* <text textAnchor="middle" x="48" y="88">
        {" ▄▄▄▄▄▄▄▄▄▄▄▄█"}
      </text> */}
    <text textAnchor="middle" x="48" y="79">
      {"             █"}
    </text>
    <text textAnchor="middle" x="48" y="83">
      {" █████████████"}
    </text>
    {/* </g> */}
  </svg>
);

// import type { SVGProps } from "react";

// /**
//  * YAP CLI-style ASCII art icon as SVG React component
//  * Uses currentColor for CSS color inheritance
//  */
// export const YapIcon = (props: SVGProps<SVGSVGElement>) => (
//   <svg
//     aria-labelledby="yap-icon-title"
//     fill="currentColor"
//     viewBox="0 0 100 100"
//     xmlns="http://www.w3.org/2000/svg"
//     {...props}
//   >
//     <title id="yap-icon-title">YAP</title>
//     <style>
//       {`text {
//         font-family: "JetBrains Mono", "Fira Code", "SF Mono", "Consolas", "Monaco", monospace;
//         font-size: 6px;
//         white-space: pre;
//       }`}
//     </style>
//     {/* biome-ignore format: preserve ASCII art spacing */}
//     <text textAnchor="middle" x="50" y="28">{"██╗   ██╗ █████╗ █████╗"}</text>
//     <text textAnchor="middle" x="50" y="34">
//       {" ╚██╗ ██╔╝██╔══██╗██╔═██╗"}
//     </text>
//     <text textAnchor="middle" x="50" y="40">
//       {"  ╚████╔╝ ███████║█████╔╝"}
//     </text>
//     <text textAnchor="middle" x="50" y="46">
//       {"  ╚██╔╝  ██╔══██║██╔══╝"}
//     </text>
//     <text textAnchor="middle" x="50" y="52">
//       {"██║   ██║  ██║██║"}
//     </text>
//     <text textAnchor="middle" x="50" y="58">
//       {"╚═╝   ╚═╝  ╚═╝╚═╝"}
//     </text>
//     <text textAnchor="middle" x="50" y="70">
//       {" ▀▀▀▀         ▀▀▀▀"}
//     </text>
//     <text textAnchor="middle" x="50" y="76">
//       {" ████         ████"}
//     </text>
//     <text textAnchor="middle" x="50" y="88">
//       {" ▄▄▄▄▄▄▄▄▄▄▄▄█"}
//     </text>
//   </svg>
// );
