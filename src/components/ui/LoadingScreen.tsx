import React, { useEffect, useState } from "react";

export default function LoadingScreen() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const duration = 2500; // 2.5 seconds
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min((elapsed / duration) * 100, 100);
      setProgress(newProgress);

      if (newProgress < 100) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }, []);

  // The main logo path (filled, traced accurately from your logo)
  const logoPath =
    "M3573 3165 c-204 -37 -403 -141 -495 -260 -157 -201 -190 -473 -83 -685 50 -101 79 -136 170 -203 121 -89 293 -162 488 -208 120 -29 204 -57 277 -95 140 -73 185 -137 178 -259 -3 -55 -10 -79 -31 -112 -38 -60 -108 -108 -196 -134 -63 -18 -90 -21 -170 -16 -113 7 -177 24 -285 79 -147 73 -227 137 -410 328 -352 367 -465 465 -609 534 -253 120 -604 128 -817 19 -14 -7 -28 -13 -32 -13 -12 0 -9 273 3 332 24 114 76 179 186 234 l78 38 319 3 c360 3 384 6 484 73 62 42 118 107 145 170 26 59 39 114 35 145 l-3 30 -350 2 c-413 3 -652 -8 -745 -35 -260 -76 -431 -218 -531 -438 -63 -139 -63 -141 -65 -694 -5 -1104 -4 -1194 9 -1202 21 -14 130 3 182 29 76 38 111 68 156 135 66 96 79 154 89 373 9 222 19 262 87 352 94 124 360 150 553 54 118 -59 181 -116 519 -470 302 -316 455 -413 771 -488 102 -24 323 -24 440 1 228 48 399 157 517 331 18 28 48 95 66 150 29 91 32 112 31 225 0 201 -47 325 -168 446 -117 117 -265 191 -499 249 -381 95 -497 171 -497 325 1 112 70 202 186 240 88 30 282 32 384 6 87 -23 221 -81 298 -129 35 -23 67 -36 71 -31 4 5 18 38 30 74 13 36 41 112 63 169 l40 103 -23 23 c-75 73 -309 171 -478 200 -101 18 -270 18 -368 0z";

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
      <div className="relative">
        {/* SVG Logo with stroke drawing animation */}
        <svg
          width="542"
          height="399"
          viewBox="0 0 542 399"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-2xl"
          style={{ transform: "scale(0.8)" }}
        >
          <defs>
            {/* Gradient matching your logo colors */}
            <linearGradient
              id="logoGradient"
              x1="0%"
              y1="0%"
              x2="100%"
              y2="100%"
            >
              <stop offset="0%" stopColor="#0D47A1" />
              <stop offset="40%" stopColor="#00ACC1" />
              <stop offset="100%" stopColor="#4DD0E1" />
            </linearGradient>

            {/* Glow filter */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="3" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Mask for progressive reveal */}
            <mask id="progressMask">
              <rect
                x="0"
                y="0"
                width="542"
                height="399"
                fill="white"
                style={{
                  transform: `scaleX(${progress / 100})`,
                  transformOrigin: "left center",
                  transition: "transform 0.05s linear",
                }}
              />
            </mask>
          </defs>

          {/* Stroke outline being drawn */}
          <g transform="translate(0, 399) scale(0.1, -0.1)">
            <path
              d={logoPath}
              fill="none"
              stroke="url(#logoGradient)"
              strokeWidth="10"
              strokeDasharray="10000"
              strokeDashoffset={10000 - progress * 100}
              filter="url(#glow)"
              style={{
                transition: "stroke-dashoffset 0.05s linear",
                strokeLinecap: "round",
                strokeLinejoin: "round",
              }}
            />
          </g>

          {/* Filled logo that fades in after stroke */}
          <g
            transform="translate(0, 399) scale(0.1, -0.1)"
            style={{
              opacity: Math.max(0, (progress - 60) / 40),
              transition: "opacity 0.3s ease-out",
            }}
          >
            <path d={logoPath} fill="url(#logoGradient)" filter="url(#glow)" />
          </g>
        </svg>

        {/* Progress indicator */}
        <div className="absolute -bottom-20 left-1/2 transform -translate-x-1/2 w-80">
          <div className="h-1.5 bg-slate-700/50 rounded-full overflow-hidden backdrop-blur-sm">
            <div
              className="h-full bg-gradient-to-r from-blue-600 via-cyan-400 to-teal-300 transition-all duration-100 ease-linear rounded-full shadow-lg shadow-cyan-500/50"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-4 text-center">
            <span className="text-cyan-400 font-semibold text-lg tracking-wider">
              {Math.round(progress)}%
            </span>
          </div>
        </div>

        {/* Ambient glow effect */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/20 rounded-full blur-3xl animate-pulse"
            style={{
              animation: "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            }}
          />
        </div>
      </div>
    </div>
  );
}
