/**
 * Design token hex values exposed as JS constants.
 *
 * Keep in sync with the `@theme` block in `src/index.css`. These mirrors exist
 * because third-party libraries (Recharts, SVG charts, inline styles) do not
 * read CSS custom properties. Import from here when you need a literal color
 * value — use the Tailwind utility classes (`bg-navy-950`, `text-gold-500`,
 * etc.) everywhere else.
 */

export const navy = {
  950: '#0b1628',
  900: '#0f1d32',
  800: '#12233d',
  700: '#1a3152',
  600: '#243d5e',
} as const;

export const gold = {
  300: '#e0c994',
  400: '#d4b87a',
  500: '#c9a961',
  600: '#a88b3d',
} as const;

export const cream = {
  50:  '#faf8f3',
  100: '#f5f1e8',
  200: '#ede7d9',
} as const;

export const text = {
  primary: '#f0ece3',
  muted:   '#95a7c0',
  dark:    '#1a1a2e',
} as const;

export const status = {
  success: '#4ade80',
  error:   '#f87171',
  warning: '#fbbf24',
} as const;

/** Convenience grouped palette for consumers that want everything at once. */
export const colors = {
  navy,
  gold,
  cream,
  text,
  status,
} as const;
