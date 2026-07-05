interface AccentPalette {
  accent: string;
  accentDark: string;
  accentHover: string;
  accentTint: string;
  accentTint2: string;
}

function hexToHsl(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16) / 255;
  const g = parseInt(clean.substring(2, 4), 16) / 255;
  const b = parseInt(clean.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;
  const delta = max - min;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = ((g - b) / delta) % 6;
        break;
      case g:
        h = (b - r) / delta + 2;
        break;
      default:
        h = (r - g) / delta + 4;
    }
    h *= 60;
    if (h < 0) h += 360;
  }
  return [h, s, l];
}

function hslToHex(h: number, s: number, l: number): string {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let [r, g, b] = [0, 0, 0];
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (v: number) =>
    Math.round((v + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/**
 * Derives the full accent palette (dark/hover/tints) from a single brand color, matching
 * the relationships already baked into tokens.css's default palette (dark ≈ -12% lightness,
 * tint ≈ 87% lightness, tint-2 ≈ 93% lightness) so a variant only needs to supply one hex
 * color and still gets a cohesive, readable theme everywhere the design system references it.
 */
export function deriveAccentPalette(hex: string): AccentPalette {
  const [h, s, l] = hexToHsl(hex);
  const accentDark = hslToHex(h, s, clamp01(l - 0.12));
  const accentTint = hslToHex(h, Math.min(s, 0.55), clamp01(0.87));
  const accentTint2 = hslToHex(h, Math.min(s, 0.45), clamp01(0.93));
  return { accent: hex, accentDark, accentHover: accentDark, accentTint, accentTint2 };
}

/**
 * CSS custom-property overrides for a variant's accent color, spread onto the page root's
 * inline style — every component already consumes these tokens via var(--color-*), so this
 * single object re-themes the whole page with no other code changes.
 */
export function accentPaletteToCssVars(palette: AccentPalette): Record<string, string> {
  return {
    "--color-accent": palette.accent,
    "--color-accent-dark": palette.accentDark,
    "--color-accent-hover": palette.accentHover,
    "--color-accent-tint": palette.accentTint,
    "--color-accent-tint-2": palette.accentTint2,
  };
}
