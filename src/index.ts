import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { generateIconVariants } from "./lib/vivaldiIconMaker.js";
import { validateColorInput } from "./lib/svgColorizer.js";

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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");

const ICON_PRESETS = {
  black: path.join(PROJECT_ROOT, "vivaldi-black.svg"),
  line: path.join(PROJECT_ROOT, "vivaldi-line.svg"),
} as const;

async function main(): Promise<void> {
  try {
    const rawOptions = parseArgs(process.argv.slice(2));
    const options = await resolveOptions(rawOptions);
    const svgContent = await fs.readFile(options.inputPath, "utf8");

    const variants = generateIconVariants({
      svgContent,
      fill: options.fill,
      stroke: options.stroke,
      preserveFillNone: options.preserveFillNone,
      preserveStrokeNone: options.preserveStrokeNone,
      generateInactive: options.generateInactive,
      inactiveMix: options.inactiveMix,
    });

    await fs.mkdir(options.outputDir, { recursive: true });

    for (const variant of variants) {
      const outputPath = buildOutputPath(options, variant.name);
      await ensureWritablePath(outputPath, options.overwrite);
      await fs.writeFile(outputPath, variant.svg, "utf8");
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

  if (parts.length === 0) {
    return "recolored";
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

void main();
