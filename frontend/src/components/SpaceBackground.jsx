// Space backdrop drawn in code: a starfield and a faint lunar horizon.
// No image files (the hackathon bans AI-generated images; this is plain SVG).

// Small seeded random generator, so the stars are in the same place on every load.
function seeded(seed) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const rand = seeded(42);
const STARS = Array.from({ length: 220 }, (_, i) => ({
  id: i,
  x: rand() * 100, // percent of the screen width
  y: rand() * 100, // percent of the screen height
  r: rand() < 0.9 ? 0.6 + rand() * 0.6 : 1.3 + rand() * 0.7, // a few bigger stars
  o: 0.35 + rand() * 0.6, // brightness
  twinkle: rand() < 0.12, // about 1 in 8 stars twinkles
  delay: (rand() * 6).toFixed(2),
}));

export default function SpaceBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <svg className="h-full w-full" preserveAspectRatio="none">
        {STARS.map((s) => (
          <circle
            key={s.id}
            cx={`${s.x}%`}
            cy={`${s.y}%`}
            r={s.r}
            fill="#e8ecff"
            opacity={s.o}
            className={s.twinkle ? "twinkle" : undefined}
            style={s.twinkle ? { animationDelay: `${s.delay}s` } : undefined}
          />
        ))}
      </svg>

      {/* Lunar horizon: the edge of a large grey surface along the bottom of the screen */}
      <svg className="absolute bottom-0 left-0 h-[34vh] w-full" viewBox="0 0 1440 300" preserveAspectRatio="none">
        <path d="M0 210 Q 720 120 1440 200 L1440 300 L0 300 Z" fill="#1b2033" />
        <path d="M0 210 Q 720 120 1440 200" fill="none" stroke="#3a4260" strokeWidth="1.5" />
        <ellipse cx="260" cy="232" rx="46" ry="7" fill="#151a2b" />
        <ellipse cx="980" cy="214" rx="70" ry="9" fill="#151a2b" />
        <ellipse cx="1290" cy="246" rx="30" ry="5" fill="#151a2b" />
      </svg>
    </div>
  );
}
