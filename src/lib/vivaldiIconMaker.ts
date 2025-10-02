import { createInactiveBackgroundColor, createInactiveColor, clampRatio } from "./colorTransforms.js";
import { recolorVivaldiSvg } from "./svgColorizer.js";

export interface GenerateVariantsOptions {
  svgContent: string;
  fill?: string;
  stroke?: string;
  preserveFillNone?: boolean;
  preserveStrokeNone?: boolean;
  generateInactive?: boolean;
  inactiveMix?: number;
  inactiveCornerRadius?: number;
  inactiveBackgroundInsetRatio?: number;
}

export interface IconVariant {
  name: string;
  svg: string;
  fill?: string;
  stroke?: string;
  backgroundColor?: string;
}

export const DEFAULT_INACTIVE_MIX = 0.5;
export const DEFAULT_INACTIVE_CORNER_RADIUS = 6;
export const DEFAULT_INACTIVE_INSET_RATIO = 0.1;
const INACTIVE_BACKGROUND_MARKER = "data-vivaldi-inactive-bg=\"true\"";

export function generateIconVariants(options: GenerateVariantsOptions): IconVariant[] {
  const {
    svgContent,
    fill,
    stroke,
    preserveFillNone = true,
    preserveStrokeNone = true,
    generateInactive = true,
    inactiveMix = DEFAULT_INACTIVE_MIX,
    inactiveCornerRadius = DEFAULT_INACTIVE_CORNER_RADIUS,
    inactiveBackgroundInsetRatio = DEFAULT_INACTIVE_INSET_RATIO,
  } = options;

  ensureValidSvg(svgContent);

  const variants: IconVariant[] = [];
  const primaryColor = pickPrimaryColor(fill, stroke);
  const normalizedInactiveMix = clampUnitRange(inactiveMix);
  const safeCornerRadius = Math.max(0, inactiveCornerRadius);

  const activeSvg = recolorVivaldiSvg(svgContent, {
    fill,
    stroke,
    preserveFillNone,
    preserveStrokeNone,
  });

  variants.push({
    name: "active",
    svg: activeSvg,
    fill,
    stroke,
  });

  if (generateInactive) {
    const inactiveFill = transformInactiveColor(fill, normalizedInactiveMix);
    const inactiveStroke = transformInactiveColor(stroke, normalizedInactiveMix);
    const backgroundColor = primaryColor
      ? createInactiveBackgroundColor(primaryColor, normalizedInactiveMix)
      : undefined;

    let inactiveSvg = recolorVivaldiSvg(svgContent, {
      fill: inactiveFill,
      stroke: inactiveStroke,
      preserveFillNone,
      preserveStrokeNone,
    });

    if (backgroundColor) {
      inactiveSvg = addOrUpdateBackgroundRect(
        inactiveSvg,
        backgroundColor,
        safeCornerRadius,
        inactiveBackgroundInsetRatio,
      );
    }

    variants.push({
      name: "inactive",
      svg: inactiveSvg,
      fill: inactiveFill,
      stroke: inactiveStroke,
      backgroundColor,
    });
  }

  return variants;
}

export function addOrUpdateBackgroundRect(
  svgContent: string,
  color: string,
  cornerRadius: number,
  insetRatio: number,
): string {
  const clampedInset = clampRatio(insetRatio);
  const viewBox = extractViewBox(svgContent);
  const rectElement = viewBox
    ? buildInsetRectFromViewBox(viewBox, color, cornerRadius, clampedInset)
    : buildInsetRectWithPercent(color, cornerRadius, clampedInset);
  const rectPattern = new RegExp(`<rect[^>]*${INACTIVE_BACKGROUND_MARKER}[^>]*/>`, "i");

  if (rectPattern.test(svgContent)) {
    return svgContent.replace(rectPattern, rectElement);
  }

  const svgOpenTagMatch = svgContent.match(/<svg[^>]*>/i);
  if (!svgOpenTagMatch) {
    throw new Error("Input file is not a valid SVG document.");
  }

  const [svgOpenTag] = svgOpenTagMatch;
  const replacement = `${svgOpenTag}\n  ${rectElement}`;
  return svgContent.replace(svgOpenTag, replacement);
}

function ensureValidSvg(content: string): void {
  if (!content || !content.includes("<svg")) {
    throw new Error("有効な SVG コンテンツを指定してください。");
  }
}

function transformInactiveColor(color: string | undefined, mix: number): string | undefined {
  if (!color || color.trim().toLowerCase() === "none") {
    return color;
  }
  return createInactiveColor(color, mix);
}

function clampUnitRange(value: number): number {
  if (Number.isNaN(value)) {
    return DEFAULT_INACTIVE_MIX;
  }
  return Math.min(Math.max(value, 0), 1);
}

function pickPrimaryColor(fill?: string, stroke?: string): string | undefined {
  const normalizedFill = normalizeColor(fill);
  if (normalizedFill) {
    return normalizedFill;
  }

  const normalizedStroke = normalizeColor(stroke);
  if (normalizedStroke) {
    return normalizedStroke;
  }

  return undefined;
}

function normalizeColor(color: string | undefined): string | undefined {
  if (!color) {
    return undefined;
  }

  if (color.trim().toLowerCase() === "none") {
    return undefined;
  }

  return color;
}

interface ViewBoxValues {
  minX: number;
  minY: number;
  width: number;
  height: number;
}

function extractViewBox(svgContent: string): ViewBoxValues | undefined {
  const match = svgContent.match(/viewBox="([^"]+)"/i);
  if (!match) {
    return undefined;
  }

  const parts = match[1].trim().split(/\s+/);
  if (parts.length !== 4) {
    return undefined;
  }

  const [minXRaw, minYRaw, widthRaw, heightRaw] = parts.map(Number);
  if ([minXRaw, minYRaw, widthRaw, heightRaw].some((value) => Number.isNaN(value))) {
    return undefined;
  }

  return { minX: minXRaw, minY: minYRaw, width: widthRaw, height: heightRaw };
}

function buildInsetRectFromViewBox(
  viewBox: ViewBoxValues,
  color: string,
  cornerRadius: number,
  insetRatio: number,
): string {
  const clampedInset = clampRatio(insetRatio);
  const newWidth = viewBox.width * (1 - clampedInset);
  const newHeight = viewBox.height * (1 - clampedInset);
  const offsetX = viewBox.minX + (viewBox.width - newWidth) / 2;
  const offsetY = viewBox.minY + (viewBox.height - newHeight) / 2;

  return `<rect ${INACTIVE_BACKGROUND_MARKER} x="${formatNumber(offsetX)}" y="${formatNumber(offsetY)}" width="${formatNumber(newWidth)}" height="${formatNumber(newHeight)}" rx="${cornerRadius}" ry="${cornerRadius}" fill="${color}"/>`;
}

function buildInsetRectWithPercent(
  color: string,
  cornerRadius: number,
  insetRatio: number,
): string {
  const insetPercent = ((insetRatio * 100) / 2).toFixed(2);
  const sizePercent = (100 - insetRatio * 100).toFixed(2);

  return `<rect ${INACTIVE_BACKGROUND_MARKER} x="${insetPercent}%" y="${insetPercent}%" width="${sizePercent}%" height="${sizePercent}%" rx="${cornerRadius}" ry="${cornerRadius}" fill="${color}"/>`;
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(4).replace(/0+$/g, "").replace(/\.$/, "");
}
