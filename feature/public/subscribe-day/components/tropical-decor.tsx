// Decorative tropical shapes for the Subscribe Day page. All are aria-hidden SVGs drawn here,
// so the page keeps its own look instead of reusing LG's artwork or logo.

type DecorProps = { className?: string };

export function Hibiscus({ className }: DecorProps) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={className}>
      <g fill="#e11d48">
        {[0, 72, 144, 216, 288].map((angle) => (
          <ellipse key={angle} cx="50" cy="26" rx="19" ry="25" transform={`rotate(${angle} 50 50)`} />
        ))}
      </g>
      <g fill="#be123c" opacity="0.55">
        {[36, 108, 180, 252, 324].map((angle) => (
          <ellipse key={angle} cx="50" cy="34" rx="6" ry="15" transform={`rotate(${angle} 50 50)`} />
        ))}
      </g>
      <circle cx="50" cy="50" r="8" fill="#9f1239" />
      <path d="M50 50 L72 22" stroke="#facc15" strokeWidth="3" strokeLinecap="round" />
      <circle cx="73" cy="21" r="4" fill="#fde047" />
    </svg>
  );
}

export function Plumeria({ className }: DecorProps) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" className={className}>
      <g fill="#fffbeb" stroke="#fde68a" strokeWidth="1.5">
        {[0, 72, 144, 216, 288].map((angle) => (
          <path
            key={angle}
            d="M50 50 C38 40 36 14 52 8 C66 12 62 38 50 50 Z"
            transform={`rotate(${angle} 50 50)`}
          />
        ))}
      </g>
      <circle cx="50" cy="50" r="10" fill="#facc15" />
    </svg>
  );
}

export function PalmLeaf({ className }: DecorProps) {
  return (
    <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false" className={className}>
      <path d="M8 112 C40 80 70 50 112 10" stroke="#166534" strokeWidth="4" fill="none" strokeLinecap="round" />
      <g fill="#16a34a">
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const t = 0.15 + i * 0.12;
          const x = 8 + 104 * t;
          const y = 112 - 102 * t;
          return (
            <g key={i}>
              <path d={`M${x} ${y} q-26 -6 -36 -26 q20 4 36 26 z`} />
              <path d={`M${x} ${y} q8 26 28 34 q-6 -20 -28 -34 z`} />
            </g>
          );
        })}
      </g>
    </svg>
  );
}

/** Soft wave edge between the sky and the sand sections. */
export function Wave({ className }: DecorProps) {
  return (
    <svg viewBox="0 0 1440 80" preserveAspectRatio="none" aria-hidden="true" focusable="false" className={className}>
      <path d="M0 40 C240 80 480 0 720 36 C960 72 1200 10 1440 40 L1440 80 L0 80 Z" fill="currentColor" />
    </svg>
  );
}
