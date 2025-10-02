interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export function createInactiveColor(color: string, mixRatio: number): string {
  if (color.trim().toLowerCase() === "none") {
    return "none";
  }

  const ratio = clamp(mixRatio, 0, 1);
  const parsed = parseHexColor(color);
  const { h, s, l } = rgbToHsl(parsed);

  const desaturation = 0.3 + 0.3 * ratio;
  const lightBoost = 0.2 + 0.2 * ratio;

  const inactiveS = clamp01(s * (1 - desaturation));
  const inactiveL = clamp01(l + lightBoost);
  const inactiveAlpha = clamp(parsed.a * (1 - 0.1 * ratio), 0, 1);

  const inactiveRgb = hslToRgb({ h, s: inactiveS, l: inactiveL, a: inactiveAlpha });

  return formatHexColor(inactiveRgb, hasExplicitAlpha(color));
}

export function createInactiveBackgroundColor(color: string, mixRatio: number): string {
  const ratio = clamp(mixRatio, 0, 1);
  const parsed = parseHexColor(color);
  const { l } = rgbToHsl(parsed);

  const targetLightness = clamp01(l * (1 - ratio) + 0.85 * ratio);
  const bgRgb = hslToRgb({ h: 0, s: 0, l: targetLightness, a: 1 });

  return formatHexColor(bgRgb, false);
}

function parseHexColor(hex: string): Rgba {
  const normalized = hex.trim().replace(/^#/, "");

  if (![3, 4, 6, 8].includes(normalized.length)) {
    throw new Error(`Unsupported color value: ${hex}`);
  }

  if (normalized.length === 3 || normalized.length === 4) {
    return parseShortHex(normalized);
  }

  return parseLongHex(normalized);
}

function parseShortHex(value: string): Rgba {
  const r = parseInt(value[0] + value[0], 16);
  const g = parseInt(value[1] + value[1], 16);
  const b = parseInt(value[2] + value[2], 16);
  const a = value.length === 4 ? parseInt(value[3] + value[3], 16) / 255 : 1;

  return { r, g, b, a };
}

function parseLongHex(value: string): Rgba {
  const r = parseInt(value.slice(0, 2), 16);
  const g = parseInt(value.slice(2, 4), 16);
  const b = parseInt(value.slice(4, 6), 16);
  const a = value.length === 8 ? parseInt(value.slice(6, 8), 16) / 255 : 1;

  return { r, g, b, a };
}

function formatHexColor(color: Rgba, includeAlpha: boolean): string {
  const r = color.r.toString(16).padStart(2, "0");
  const g = color.g.toString(16).padStart(2, "0");
  const b = color.b.toString(16).padStart(2, "0");

  if (includeAlpha) {
    const alphaByte = Math.round(color.a * 255);
    const a = alphaByte.toString(16).padStart(2, "0");
    return `#${r}${g}${b}${a}`;
  }

  return `#${r}${g}${b}`;
}

function hasExplicitAlpha(input: string): boolean {
  const length = input.trim().replace(/^#/, "").length;
  return length === 4 || length === 8;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function clampChannel(value: number): number {
  return Math.min(Math.max(value, 0), 255);
}

interface Hsla {
  h: number;
  s: number;
  l: number;
  a: number;
}

function rgbToHsl(color: Rgba): Hsla {
  const r = color.r / 255;
  const g = color.g / 255;
  const b = color.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === r) {
      h = ((g - b) / delta) % 6;
    } else if (max === g) {
      h = (b - r) / delta + 2;
    } else {
      h = (r - g) / delta + 4;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }

  const l = (max + min) / 2;
  const s = delta === 0 ? 0 : delta / (1 - Math.abs(2 * l - 1));

  return { h, s, l, a: color.a };
}

function hslToRgb(color: Hsla): Rgba {
  const h = color.h / 360;
  const s = clamp01(color.s);
  const l = clamp01(color.l);

  if (s === 0) {
    const gray = clampChannel(Math.round(l * 255));
    return { r: gray, g: gray, b: gray, a: color.a };
  }

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  const r = clampChannel(Math.round(hueToRgb(p, q, h + 1 / 3) * 255));
  const g = clampChannel(Math.round(hueToRgb(p, q, h) * 255));
  const b = clampChannel(Math.round(hueToRgb(p, q, h - 1 / 3) * 255));

  return { r, g, b, a: color.a };
}

function hueToRgb(p: number, q: number, t: number): number {
  let temp = t;
  if (temp < 0) {
    temp += 1;
  }
  if (temp > 1) {
    temp -= 1;
  }
  if (temp < 1 / 6) {
    return p + (q - p) * 6 * temp;
  }
  if (temp < 1 / 2) {
    return q;
  }
  if (temp < 2 / 3) {
    return p + (q - p) * (2 / 3 - temp) * 6;
  }
  return p;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}
