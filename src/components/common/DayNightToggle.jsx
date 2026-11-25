import React from 'react';

/**
 * DayNightToggle
 * Animated Day/Night pill switch matching the exact user visual design:
 * - Day: Sky-blue background, soft white clouds on the right, large glowing golden-amber sun on the left.
 * - Night: Midnight purple/indigo sky, twinkling stars, dark pine tree/mountain silhouettes, pale cratered moon on the right.
 */
export default function DayNightToggle({ isDark, onToggle }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isDark}
      aria-label="Basculer Mode Jour / Nuit"
      onClick={onToggle}
      className="relative inline-flex items-center cursor-pointer select-none rounded-full transition-transform active:scale-95 focus:outline-none focus:ring-2 focus:ring-teal-300 shadow-md overflow-hidden shrink-0"
      style={{ width: '80px', height: '35px' }}
      title={isDark ? 'Passer en Mode Jour' : 'Passer en Mode Nuit'}
    >
      <svg
        viewBox="0 0 80 35"
        width="80"
        height="35"
        className="w-full h-full block"
      >
        <defs>
          {/* Day Sky Gradient */}
          <linearGradient id="sahaDaySky" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2CB5E8" />
            <stop offset="50%" stopColor="#4BC0ED" />
            <stop offset="100%" stopColor="#8AD4F5" />
          </linearGradient>

          {/* Night Sky Gradient */}
          <linearGradient id="sahaNightSky" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1B1745" />
            <stop offset="55%" stopColor="#27215E" />
            <stop offset="100%" stopColor="#3C3284" />
          </linearGradient>

          {/* Sun Radial Gradient */}
          <radialGradient id="sahaSunGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFE066" />
            <stop offset="65%" stopColor="#FDB813" />
            <stop offset="100%" stopColor="#F59E0B" />
          </radialGradient>

          {/* Moon Radial Gradient */}
          <radialGradient id="sahaMoonGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="70%" stopColor="#F3F4F6" />
            <stop offset="100%" stopColor="#E2E8F0" />
          </radialGradient>

          {/* Pill Clip Path */}
          <clipPath id="sahaPillClip">
            <rect x="0" y="0" width="80" height="35" rx="17.5" ry="17.5" />
          </clipPath>
        </defs>

        {/* Clipped content inside the capsule */}
        <g clipPath="url(#sahaPillClip)">
          {/* ════════ DAY STATE (Sky + Clouds) ════════ */}
          <g className={`transition-opacity duration-500 ease-in-out ${isDark ? 'opacity-0' : 'opacity-100'}`}>
            <rect width="80" height="35" fill="url(#sahaDaySky)" />

            {/* Back Cloud Layer */}
            <path
              d="M32 35 C35 27, 44 26, 48 29 C52 23, 62 23, 66 28 C69 24, 76 25, 80 29 L80 35 Z"
              fill="#D0F0FD"
              opacity="0.65"
            />

            {/* Front Cloud Puffs (Exact shapes matching screenshot) */}
            <path
              d="M36 35 C38 29, 46 27, 50 30 C53 25, 62 24, 66 28 C69 25, 75 26, 80 30 L80 35 Z"
              fill="#FFFFFF"
              opacity="0.95"
            />
            {/* Soft fluffy circular cloud bulges */}
            <circle cx="50" cy="29" r="6" fill="#FFFFFF" opacity="0.95" />
            <circle cx="61" cy="27" r="7.5" fill="#FFFFFF" opacity="0.95" />
            <circle cx="72" cy="28" r="6.5" fill="#FFFFFF" opacity="0.95" />
            <circle cx="42" cy="32" r="5" fill="#FFFFFF" opacity="0.95" />
          </g>

          {/* ════════ NIGHT STATE (Twilight + Stars + Trees) ════════ */}
          <g className={`transition-opacity duration-500 ease-in-out ${isDark ? 'opacity-100' : 'opacity-0'}`}>
            <rect width="80" height="35" fill="url(#sahaNightSky)" />

            {/* Scattered Stars (dots and sparkles) */}
            <circle cx="16" cy="9" r="1.1" fill="#FFFFFF" opacity="0.9" />
            <circle cx="25" cy="14" r="0.8" fill="#FFFFFF" opacity="0.8" />
            <circle cx="34" cy="8" r="1.2" fill="#FFFFFF" opacity="0.95" />
            <circle cx="43" cy="13" r="0.9" fill="#FFFFFF" opacity="0.85" />
            <circle cx="49" cy="7" r="1.3" fill="#FFFFFF" opacity="0.95" />
            <circle cx="21" cy="6" r="0.8" fill="#FFFFFF" opacity="0.75" />
            <circle cx="38" cy="18" r="0.7" fill="#FFFFFF" opacity="0.7" />

            {/* Back Mountain / Pine Tree Layer (dark purple) */}
            <polygon points="5,35 11,21 17,35" fill="#201A4F" />
            <polygon points="14,35 20,18 26,35" fill="#201A4F" />
            <polygon points="23,35 30,15 37,35" fill="#201A4F" />
            <polygon points="34,35 40,19 46,35" fill="#201A4F" />
            <polygon points="43,35 49,21 55,35" fill="#201A4F" />
            <polygon points="52,35 58,17 64,35" fill="#201A4F" />
            <polygon points="61,35 68,20 75,35" fill="#201A4F" />

            {/* Front Pine Trees Silhouettes (deep midnight navy #140F38) */}
            <polygon points="0,35 6,22 12,35" fill="#140F38" />
            <polygon points="9,35 15,17 21,35" fill="#140F38" />
            <polygon points="18,35 24,20 30,35" fill="#140F38" />
            <polygon points="28,35 34,16 40,35" fill="#140F38" />
            <polygon points="37,35 43,21 49,35" fill="#140F38" />
            <polygon points="46,35 52,18 58,35" fill="#140F38" />
            <polygon points="55,35 62,21 69,35" fill="#140F38" />
            <polygon points="65,35 71,23 77,35" fill="#140F38" />
          </g>

          {/* ════════ MOVING THUMB (SUN & MOON) ════════ */}
          <g
            className="transition-transform duration-500 ease-in-out"
            transform={isDark ? "translate(43, 0)" : "translate(0, 0)"}
            style={{
              transform: isDark ? 'translateX(43px)' : 'translateX(0px)',
            }}
          >
            {/* SUN (Day Mode) */}
            <g className={`transition-opacity duration-300 ${isDark ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
              {/* Warm Outer Glow */}
              <circle cx="18.5" cy="17.5" r="14.5" fill="#FDE047" opacity="0.35" />
              {/* Sun Body */}
              <circle cx="18.5" cy="17.5" r="13" fill="url(#sahaSunGrad)" />
            </g>

            {/* MOON (Night Mode) */}
            <g className={`transition-opacity duration-300 ${isDark ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              {/* Moon Glow */}
              <circle cx="18.5" cy="17.5" r="14" fill="#FFFFFF" opacity="0.2" />
              {/* Moon Body */}
              <circle cx="18.5" cy="17.5" r="12.5" fill="url(#sahaMoonGrad)" />
              {/* Moon Craters */}
              <circle cx="15" cy="14" r="2.3" fill="#CBD5E1" opacity="0.5" />
              <circle cx="22" cy="19" r="1.7" fill="#CBD5E1" opacity="0.45" />
              <circle cx="17.5" cy="22" r="1.9" fill="#CBD5E1" opacity="0.4" />
            </g>
          </g>

          {/* Trees in front of Moon (Overlap effect matching screenshot!) */}
          <g className={`transition-opacity duration-500 pointer-events-none ${isDark ? 'opacity-100' : 'opacity-0'}`}>
            <polygon points="56,35 62,20 68,35" fill="#140F38" />
            <polygon points="65,35 71,23 77,35" fill="#140F38" />
            <polygon points="49,35 55,23 61,35" fill="#140F38" opacity="0.8" />
          </g>
        </g>

        {/* Subtle Outer Ring / Border */}
        <rect
          x="0.5"
          y="0.5"
          width="79"
          height="34"
          rx="17"
          ry="17"
          fill="none"
          stroke={isDark ? 'rgba(165, 180, 252, 0.35)' : 'rgba(255, 255, 255, 0.6)'}
          strokeWidth="1"
        />
      </svg>
    </button>
  );
}
