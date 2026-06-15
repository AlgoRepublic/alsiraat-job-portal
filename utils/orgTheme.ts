/** Validate 6-digit hex including leading # */
export function isValidThemeColorHex(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  return /^#[0-9A-Fa-f]{6}$/.test(value.trim());
}

function parseHex(hex: string): { r: number; g: number; b: number } {
  const h = hex.trim().slice(1);
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function clamp255(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((c) => clamp255(c).toString(16).padStart(2, "0"))
    .join("")}`;
}

function mixRgb(
  a: { r: number; g: number; b: number },
  b: { r: number; g: number; b: number },
  t: number,
): { r: number; g: number; b: number } {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t,
  };
}

const WHITE = { r: 255, g: 255, b: 255 };
const BLACK = { r: 0, g: 0, b: 0 };

/**
 * Build a Tailwind-style accent scale (50–950) anchored at 800 = baseHex.
 * Matches how `tailwind.config.js` maps primary → accent-800.
 */
export function buildAccentPaletteFromPrimary(baseHex: string): Record<string, string> {
  const base = parseHex(baseHex);
  const q = (t: number) => {
    const m = mixRgb(base, WHITE, t);
    return rgbToHex(m.r, m.g, m.b);
  };
  const d = (t: number) => {
    const m = mixRgb(base, BLACK, t);
    return rgbToHex(m.r, m.g, m.b);
  };

  return {
    50: q(0.94),
    100: q(0.88),
    200: q(0.78),
    300: q(0.62),
    400: q(0.42),
    500: q(0.22),
    600: d(0.08),
    700: d(0.12),
    800: rgbToHex(base.r, base.g, base.b),
    900: d(0.22),
    950: d(0.38),
  };
}

export function hexToRgbCssTriplet(hex: string): string {
  const { r, g, b } = parseHex(hex);
  return `${clamp255(r)}, ${clamp255(g)}, ${clamp255(b)}`;
}

/** Apply palette to document root (same contract as Layout colour picker). */
export function applyAccentPaletteToDocument(
  palette: Record<string, string>,
): void {
  const root = document.documentElement;
  Object.entries(palette).forEach(([key, value]) => {
    root.style.setProperty(`--accent-${key}`, value);
    if (["100", "200", "300", "400", "800", "900", "950"].includes(key)) {
      root.style.setProperty(`--accent-${key}-rgb`, hexToRgbCssTriplet(value));
    }
  });
}
