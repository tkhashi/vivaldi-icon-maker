export interface RecolorOptions {
  fill?: string;
  stroke?: string;
  preserveFillNone?: boolean;
  preserveStrokeNone?: boolean;
}

const HEX_COLOR_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

export function validateColorInput(color: string): string {
  const trimmed = color.trim();
  if (trimmed.toLowerCase() === "none") {
    return "none";
  }

  if (HEX_COLOR_PATTERN.test(trimmed)) {
    return trimmed;
  }

  throw new Error(`Unsupported color value: ${color}. Use CSS hex values like #ff3300 or the keyword none.`);
}

export function recolorVivaldiSvg(svgContent: string, options: RecolorOptions): string {
  const preserveFillNone = options.preserveFillNone ?? true;
  const preserveStrokeNone = options.preserveStrokeNone ?? true;

  let output = svgContent;

  if (options.fill) {
    output = applyColor(output, "fill", options.fill, preserveFillNone);
  }

  if (options.stroke) {
    output = applyColor(output, "stroke", options.stroke, preserveStrokeNone);
  }

  return output;
}

function applyColor(svgContent: string, property: "fill" | "stroke", color: string, preserveNone: boolean): string {
  let result = svgContent;

  result = replaceSvgAttributes(result, property, color, preserveNone);
  result = replaceInlineStyleAttributes(result, property, color, preserveNone);
  result = replaceStyleBlocks(result, property, color, preserveNone);

  return result;
}

function replaceSvgAttributes(svgContent: string, property: "fill" | "stroke", color: string, preserveNone: boolean): string {
  const attributePattern = new RegExp(`(${property}\\s*=\\s*\")(.*?)\"`, "gi");

  return svgContent.replace(attributePattern, (match, prefix: string, value: string) => {
    const normalizedValue = value.trim().toLowerCase();
    const normalizedTarget = color.trim().toLowerCase();

    if (preserveNone && normalizedValue === "none" && normalizedTarget !== "none") {
      return match;
    }

    return `${prefix}${color}"`;
  });
}

function replaceInlineStyleAttributes(svgContent: string, property: "fill" | "stroke", color: string, preserveNone: boolean): string {
  const styleAttributePattern = /style="([^"]*)"/gi;

  return svgContent.replace(styleAttributePattern, (match, styleBody: string) => {
    const declarations = styleBody.split(";").map((block) => block.trim()).filter(Boolean);
    if (declarations.length === 0) {
      return match;
    }

    let changed = false;
    const normalizedTarget = color.trim().toLowerCase();

    const updated = declarations.map((declaration) => {
      const [name, value] = declaration.split(":").map((part) => part.trim());
      if (!name || value === undefined) {
        return declaration;
      }

      if (name.toLowerCase() !== property) {
        return declaration;
      }

      const normalizedValue = value.toLowerCase();
      if (preserveNone && normalizedValue === "none" && normalizedTarget !== "none") {
        return declaration;
      }

      changed = true;
      return `${name}:${color}`;
    });

    if (!changed) {
      return match;
    }

    return `style="${updated.join("; ")}"`;
  });
}

function replaceStyleBlocks(svgContent: string, property: "fill" | "stroke", color: string, preserveNone: boolean): string {
  const styleBlockPattern = /<style[^>]*>([\s\S]*?)<\/style>/gi;

  return svgContent.replace(styleBlockPattern, (match, blockContent: string) => {
    const normalizedTarget = color.trim().toLowerCase();
    const propertyPattern = new RegExp(`(${property})(?!-)\\s*:\\s*([^;\\}]+)`, "gi");

    let updated = blockContent.replace(propertyPattern, (declaration, propName: string, value: string) => {
      const normalizedValue = value.trim().toLowerCase();
      if (preserveNone && normalizedValue === "none" && normalizedTarget !== "none") {
        return declaration;
      }

      return `${propName}:${color}`;
    });

    if (updated === blockContent) {
      return match;
    }

    return match.replace(blockContent, updated);
  });
}
