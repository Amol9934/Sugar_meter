// Inline SVGs: no icon library, no extra requests.
const stroke = {
  fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round',
};
const Svg = ({ children, size = 22, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...stroke} {...rest}>
    {children}
  </svg>
);

export const DropMark = ({ size = 28 }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
    <rect width="64" height="64" rx="16" fill="#1D1A33" />
    <path d="M32 10C32 10 17 28 17 39a15 15 0 0 0 30 0C47 28 32 10 32 10z" fill="#F0457F" />
    <path d="M24.5 39.5a7.5 7.5 0 0 0 5.5 7.2" fill="none" stroke="#fff" strokeOpacity=".85" strokeWidth="3.2" strokeLinecap="round" />
  </svg>
);

const Sunrise = () => (
  <Svg><path d="M3 18h18M6.5 18a5.5 5.5 0 0 1 11 0M12 5v3M4.9 9.9l1.8 1.8M19.1 9.9l-1.8 1.8" /></Svg>
);
const Cup = () => (
  <Svg><path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5V9zM16 10h2a2.5 2.5 0 0 1 0 5h-2M8 3v2M12 3v2" /></Svg>
);
const Sun = () => (
  <Svg><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" /></Svg>
);
const Moon = () => (
  <Svg><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" /></Svg>
);

export const SLOT_ICONS = {
  morning_fasting: Sunrise,
  after_breakfast: Cup,
  after_lunch: Sun,
  after_dinner: Moon,
};

export const ChevronLeft = () => <Svg size={20}><path d="M15 5l-7 7 7 7" /></Svg>;
export const ChevronRight = () => <Svg size={20}><path d="M9 5l7 7-7 7" /></Svg>;
