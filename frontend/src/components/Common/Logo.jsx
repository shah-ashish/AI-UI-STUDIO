import React from 'react';

/**
 * AI UI STUDIO — Official Brand Logo Emblem
 * High-precision vector emblem representing neural synthesis, layered interface canvas, and creative flow.
 */
export default function Logo({ size = 'md', showText = false, className = '' }) {
  const sizeMap = {
    sm: { box: 'h-6 w-6', icon: 24, font: 'text-sm' },
    md: { box: 'h-8 w-8', icon: 32, font: 'text-lg' },
    lg: { box: 'h-12 w-12', icon: 48, font: 'text-2xl' },
    xl: { box: 'h-16 w-16', icon: 64, font: 'text-3xl' },
  };

  const { box, font } = sizeMap[size] || sizeMap.md;

  return (
    <div className={`inline-flex items-center gap-2.5 ${className}`}>
      {/* SVG Emblem */}
      <div className={`${box} relative flex items-center justify-center shrink-0`}>
        <svg
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          {/* Gradient Definitions */}
          <defs>
            <linearGradient id="studioGrad1" x1="4" y1="4" x2="44" y2="44" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#4f46e5" />
              <stop offset="50%" stopColor="#7c3aed" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
            <linearGradient id="studioGrad2" x1="12" y1="8" x2="36" y2="40" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.75" />
            </linearGradient>
            <filter id="logoGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#4f46e5" floodOpacity="0.25" />
            </filter>
          </defs>

          {/* Outer Rounded Geometric Container */}
          <rect
            x="4"
            y="4"
            width="40"
            height="40"
            rx="12"
            fill="url(#studioGrad1)"
            filter="url(#logoGlow)"
          />

          {/* Background Grid Pattern Lines */}
          <path
            d="M4 20H44M4 28H44M20 4V44M28 4V44"
            stroke="#ffffff"
            strokeOpacity="0.12"
            strokeWidth="1"
          />

          {/* Neural Synthesis Layer 1 (Back Canvas) */}
          <rect
            x="14"
            y="12"
            width="20"
            height="20"
            rx="5"
            stroke="url(#studioGrad2)"
            strokeWidth="1.75"
            fill="#ffffff"
            fillOpacity="0.1"
          />

          {/* Neural Synthesis Layer 2 (Front Active Canvas with Offset) */}
          <rect
            x="18"
            y="16"
            width="18"
            height="18"
            rx="4.5"
            fill="#ffffff"
            fillOpacity="0.9"
          />

          {/* Modern UI Wireframe Glyphs inside the Canvas */}
          <rect x="21" y="19" width="6" height="2" rx="1" fill="#4f46e5" />
          <rect x="21" y="23" width="12" height="1.5" rx="0.75" fill="#94a3b8" />
          <rect x="21" y="26.5" width="9" height="1.5" rx="0.75" fill="#cbd5e1" />

          {/* Interactive Action Accent Pill */}
          <rect x="21" y="30" width="7" height="2.2" rx="1.1" fill="#7c3aed" />

          {/* Precision Corner Crosshair Accent */}
          <circle cx="37" cy="11" r="2" fill="#22d3ee" />
        </svg>
      </div>

      {/* Optional Brand Text */}
      {showText && (
        <span className={`font-extrabold tracking-tight text-slate-900 ${font}`}>
          AI UI STUDIO
        </span>
      )}
    </div>
  );
}
