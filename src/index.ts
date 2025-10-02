import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createInactiveBackgroundColor, createInactiveColor } from "./colorTransforms.js";
import { recolorVivaldiSvg, validateColorInput } from "./svgColorizer.js";

interface RawCliOptions {
  input?: string;
  iconPreset?: keyof typeof ICON_PRESETS;
  output?: string;
  fill?: string;
  stroke?: string;
  overwrite: boolean;
  preserveFillNone: boolean;
  preserveStrokeNone: boolean;
  generateInactive: boolean;
  inactiveMix: number;
}

interface CliOptions {
  inputPath: string;
  outputDir: string;
  outputBaseName: string;
  outputExtension: string;
  fill?: string;
  stroke?: string;
  overwrite: boolean;
  preserveFillNone: boolean;
  preserveStrokeNone: boolean;
  generateInactive: boolean;
  inactiveMix: number;
}

interface ColorVariant {
  name: string;
  fill?: string;
  stroke?: string;
  backgroundColor?: string;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const INACTIVE_BACKGROUND_MARKER = "data-vivaldi-inactive-bg=\"true\"";
const INACTIVE_CORNER_RADIUS = 6;
const INACTIVE_BACKGROUND_INSET_RATIO = 0.1;

const ICON_PRESETS = {
  black: path.join(PROJECT_ROOT, "vivaldi-black.svg"),
  line: path.join(PROJECT_ROOT, "vivaldi-line.svg"),
} as const;

async function main(): Promise<void> {
  try {
    const rawOptions = parseArgs(process.argv.slice(2));
    const options = await resolveOptions(rawOptions);
    const svgContent = await fs.readFile(options.inputPath, "utf8");
    const variants = buildVariants(options);

    await fs.mkdir(options.outputDir, { recursive: true });

    for (const variant of variants) {
      let recolored = recolorVivaldiSvg(svgContent, {
        fill: variant.fill,
        stroke: variant.stroke,
        preserveFillNone: options.preserveFillNone,
        preserveStrokeNone: options.preserveStrokeNone,
      });

      if (variant.backgroundColor) {
        recolored = addOrUpdateBackgroundRect(
          recolored,
          variant.backgroundColor,
          INACTIVE_CORNER_RADIUS,
        );
      }

      const outputPath = buildOutputPath(options, variant.name);
      await ensureWritablePath(outputPath, options.overwrite);
      await fs.writeFile(outputPath, recolored, "utf8");

      console.log(`Created ${path.relative(process.cwd(), outputPath)}`);
    }
  } catch (error) {
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
    } else {
      console.error("Unexpected error", error);
    }
    process.exitCode = 1;
  }
}

function parseArgs(argv: string[]): RawCliOptions {
  if (argv.length === 0) {
    printHelp();
    process.exit(0);
  }

  const rawOptions: RawCliOptions = {
    overwrite: false,
    preserveFillNone: true,
    preserveStrokeNone: true,
    generateInactive: true,
    inactiveMix: 0.5,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    switch (arg) {
      case "-h":
      case "--help":
        printHelp();
        process.exit(0);
        break;
      case "-i":
      case "--input":
        rawOptions.input = requireValue(argv[++index], arg);
        break;
      case "--icon":
        rawOptions.iconPreset = parsePreset(requireValue(argv[++index], arg));
        break;
      case "-o":
      case "--output":
        rawOptions.output = requireValue(argv[++index], arg);
        break;
      case "-f":
      case "--fill":
        rawOptions.fill = validateColorInput(requireValue(argv[++index], arg));
        break;
      case "-s":
      case "--stroke":
        rawOptions.stroke = validateColorInput(requireValue(argv[++index], arg));
        break;
      case "--overwrite":
        rawOptions.overwrite = true;
        break;
      case "--no-preserve-fill-none":
        rawOptions.preserveFillNone = false;
        break;
      case "--no-preserve-stroke-none":
        rawOptions.preserveStrokeNone = false;
        break;
      case "--no-inactive":
        rawOptions.generateInactive = false;
        break;
      case "--inactive-mix":
        rawOptions.inactiveMix = parseInactiveMix(requireValue(argv[++index], arg));
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  if (!rawOptions.fill && !rawOptions.stroke) {
    throw new Error("Provide at least one of --fill or --stroke");
  }

  return rawOptions;
}

async function resolveOptions(raw: RawCliOptions): Promise<CliOptions> {
  const inputPath = await resolveInputPath(raw);
  const outputSpec = raw.output ? path.resolve(process.cwd(), raw.output) : undefined;
  const extension = path.extname(outputSpec ?? inputPath) || ".svg";

  const outputDir = outputSpec
    ? path.dirname(outputSpec)
    : path.resolve(process.cwd(), "output");

  const baseSource = outputSpec
    ? path.basename(outputSpec, extension)
    : path.basename(inputPath, path.extname(inputPath) || ".svg");

  const suffix = outputSpec ? "" : createSuffix(raw);
  const outputBaseName = suffix ? `${baseSource}-${suffix}` : baseSource;

  return {
    inputPath,
    outputDir,
    outputBaseName,
    outputExtension: extension,
    fill: raw.fill,
    stroke: raw.stroke,
    overwrite: raw.overwrite,
    preserveFillNone: raw.preserveFillNone,
    preserveStrokeNone: raw.preserveStrokeNone,
    generateInactive: raw.generateInactive,
    inactiveMix: raw.inactiveMix,
  };
}

async function resolveInputPath(raw: RawCliOptions): Promise<string> {
  if (raw.iconPreset) {
    return ICON_PRESETS[raw.iconPreset];
  }

  if (!raw.input) {
    throw new Error("Missing --input or --icon");
  }

  const resolved = path.resolve(process.cwd(), raw.input);
  await assertFileExists(resolved);
  return resolved;
}

function buildVariants(options: CliOptions): ColorVariant[] {
  const baseColor = pickPrimaryColor(options);
  const variants: ColorVariant[] = [
    {
      name: "active",
      fill: options.fill,
      stroke: options.stroke,
    },
  ];

  if (options.generateInactive) {
    variants.push({
      name: "inactive",
      fill: transformInactiveColor(options.fill, options.inactiveMix),
      stroke: transformInactiveColor(options.stroke, options.inactiveMix),
      backgroundColor: baseColor
        ? createInactiveBackgroundColor(baseColor, options.inactiveMix)
        : undefined,
    });
  }

  return variants;
}

function transformInactiveColor(color: string | undefined, mix: number): string | undefined {
  if (!color || color.trim().toLowerCase() === "none") {
    return color;
  }
  return createInactiveColor(color, mix);
}

function pickPrimaryColor(options: CliOptions): string | undefined {
  const normalizedFill = normalizeColor(options.fill);
  if (normalizedFill) {
    return normalizedFill;
  }

  const normalizedStroke = normalizeColor(options.stroke);
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

function buildOutputPath(options: CliOptions, variantName: string): string {
  return path.join(
    options.outputDir,
    `${options.outputBaseName}-${variantName}${options.outputExtension}`,
  );
}

function createSuffix(raw: RawCliOptions): string {
  const parts: string[] = [];

  if (raw.fill) {
    parts.push(`fill-${sanitizeForSuffix(raw.fill)}`);
  }

  if (raw.stroke) {
    parts.push(`stroke-${sanitizeForSuffix(raw.stroke)}`);
  }

  return parts.join("-");
}

function sanitizeForSuffix(value: string): string {
  return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
}

function requireValue(value: string | undefined, flag: string): string {
  if (!value) {
    throw new Error(`Flag ${flag} expects a value`);
  }
  return value;
}

function parsePreset(preset: string): keyof typeof ICON_PRESETS {
  const normalized = preset.toLowerCase();
  if (normalized === "black" || normalized === "line") {
    return normalized;
  }
  throw new Error(`Unknown preset: ${preset}. Use black or line.`);
}

function parseInactiveMix(value: string): number {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1) {
    throw new Error("--inactive-mix expects a number between 0 and 1");
  }
  return numeric;
}

async function ensureWritablePath(outputPath: string, overwrite: boolean): Promise<void> {
  try {
    await fs.stat(outputPath);
    if (!overwrite) {
      throw new Error(`Output file already exists: ${outputPath}. Use --overwrite to replace it.`);
    }
  } catch (error) {
    if (isNotFoundError(error)) {
      return;
    }
    throw error;
  }
}

async function assertFileExists(filePath: string): Promise<void> {
  try {
    const stats = await fs.stat(filePath);
    if (!stats.isFile()) {
      throw new Error(`${filePath} is not a file.`);
    }
  } catch (error) {
    if (isNotFoundError(error)) {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  }
}

function isNotFoundError(error: unknown): boolean {
  return Boolean((error as NodeJS.ErrnoException)?.code === "ENOENT");
}

function printHelp(): void {
  const presetList = Object.keys(ICON_PRESETS).join(", ");
  console.log(`vivaldi-icon-maker\n\n` +
    `Usage:\n` +
    `  vivaldi-icon-maker --icon black --fill #ff0000\n` +
    `  vivaldi-icon-maker --input path/to/icon.svg --stroke #00ffcc --output recolored.svg\n\n` +
    `Behavior:\n` +
    `  Generates an active icon and an inactive icon (desaturated pastel that keeps the base hue). Use --no-inactive to skip the inactive version.\n\n` +
    `Options:\n` +
    `  -h, --help                     Show this help message\n` +
    `  --icon <${presetList}>          Use a bundled Vivaldi icon preset\n` +
    `  -i, --input <path>             Path to an SVG file\n` +
    `  -o, --output <path>            Output file base path (variant suffixes added automatically)\n` +
    `  -f, --fill <color>             Fill color hex or 'none'\n` +
    `  -s, --stroke <color>           Stroke color hex or 'none'\n` +
    `  --overwrite                    Replace the output file if it exists\n` +
    `  --no-preserve-fill-none        Allow replacing fill declarations set to 'none'\n` +
    `  --no-preserve-stroke-none      Allow replacing stroke declarations set to 'none'\n` +
    `  --no-inactive                  Skip generating the inactive icon variant\n` +
    `  --inactive-mix <0-1>           Strength of desaturation/lightening toward pastel (0 = subtle, 1 = very pale, default 0.5)`);
}

function addOrUpdateBackgroundRect(svgContent: string, color: string, cornerRadius: number): string {
  const viewBox = extractViewBox(svgContent);
  const rectElement = viewBox
    ? buildInsetRectFromViewBox(viewBox, color, cornerRadius)
    : buildInsetRectWithPercent(color, cornerRadius);
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

function buildInsetRectFromViewBox(viewBox: ViewBoxValues, color: string, cornerRadius: number): string {
  const insetRatio = clampRatio(INACTIVE_BACKGROUND_INSET_RATIO);
  const newWidth = viewBox.width * (1 - insetRatio);
  const newHeight = viewBox.height * (1 - insetRatio);
  const offsetX = viewBox.minX + (viewBox.width - newWidth) / 2;
  const offsetY = viewBox.minY + (viewBox.height - newHeight) / 2;

  return `<rect ${INACTIVE_BACKGROUND_MARKER} x="${formatNumber(offsetX)}" y="${formatNumber(offsetY)}" width="${formatNumber(newWidth)}" height="${formatNumber(newHeight)}" rx="${cornerRadius}" ry="${cornerRadius}" fill="${color}"/>`;
}

function buildInsetRectWithPercent(color: string, cornerRadius: number): string {
  const insetRatio = clampRatio(INACTIVE_BACKGROUND_INSET_RATIO);
  const insetPercent = ((insetRatio * 100) / 2).toFixed(2);
  const sizePercent = (100 - insetRatio * 100).toFixed(2);

  return `<rect ${INACTIVE_BACKGROUND_MARKER} x="${insetPercent}%" y="${insetPercent}%" width="${sizePercent}%" height="${sizePercent}%" rx="${cornerRadius}" ry="${cornerRadius}" fill="${color}"/>`;
}

function clampRatio(value: number): number {
  if (value <= 0) {
    return 0;
  }
  if (value >= 0.9) {
    return 0.9;
  }
  return value;
}

function formatNumber(value: number): string {
  if (Number.isInteger(value)) {
    return value.toString();
  }
  return value.toFixed(4).replace(/0+$/g, "").replace(/\.$/, "");
}

void main();
