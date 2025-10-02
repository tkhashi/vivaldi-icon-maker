import { promises as fs } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { recolorVivaldiSvg, validateColorInput } from "./svgColorizer.js";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const ICON_PRESETS = {
    black: path.join(PROJECT_ROOT, "vivaldi-black.svg"),
    line: path.join(PROJECT_ROOT, "vivaldi-line.svg"),
};
async function main() {
    try {
        const rawOptions = parseArgs(process.argv.slice(2));
        const options = await resolveOptions(rawOptions);
        const svgContent = await fs.readFile(options.inputPath, "utf8");
        const recolored = recolorVivaldiSvg(svgContent, {
            fill: options.fill,
            stroke: options.stroke,
            preserveFillNone: options.preserveFillNone,
            preserveStrokeNone: options.preserveStrokeNone,
        });
        await ensureWritablePath(options.outputPath, options.overwrite);
        await fs.mkdir(path.dirname(options.outputPath), { recursive: true });
        await fs.writeFile(options.outputPath, recolored, "utf8");
        console.log(`Created ${path.relative(process.cwd(), options.outputPath)}`);
    }
    catch (error) {
        if (error instanceof Error) {
            console.error(`Error: ${error.message}`);
        }
        else {
            console.error("Unexpected error", error);
        }
        process.exitCode = 1;
    }
}
function parseArgs(argv) {
    if (argv.length === 0) {
        printHelp();
        process.exit(0);
    }
    const rawOptions = {
        overwrite: false,
        preserveFillNone: true,
        preserveStrokeNone: true,
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
            default:
                throw new Error(`Unknown argument: ${arg}`);
        }
    }
    if (!rawOptions.fill && !rawOptions.stroke) {
        throw new Error("Provide at least one of --fill or --stroke");
    }
    return rawOptions;
}
async function resolveOptions(raw) {
    const inputPath = await resolveInputPath(raw);
    const outputPath = resolveOutputPath(raw, inputPath);
    return {
        inputPath,
        outputPath,
        fill: raw.fill,
        stroke: raw.stroke,
        overwrite: raw.overwrite,
        preserveFillNone: raw.preserveFillNone,
        preserveStrokeNone: raw.preserveStrokeNone,
    };
}
async function resolveInputPath(raw) {
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
function resolveOutputPath(raw, inputPath) {
    if (raw.output) {
        return path.resolve(process.cwd(), raw.output);
    }
    const extension = path.extname(inputPath) || ".svg";
    const baseName = path.basename(inputPath, extension);
    const suffix = createSuffix(raw);
    const outputDir = path.resolve(process.cwd(), "output");
    return path.join(outputDir, `${baseName}-${suffix}${extension}`);
}
function createSuffix(raw) {
    const parts = [];
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
function sanitizeForSuffix(value) {
    return value.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "");
}
function requireValue(value, flag) {
    if (!value) {
        throw new Error(`Flag ${flag} expects a value`);
    }
    return value;
}
function parsePreset(preset) {
    const normalized = preset.toLowerCase();
    if (normalized === "black" || normalized === "line") {
        return normalized;
    }
    throw new Error(`Unknown preset: ${preset}. Use black or line.`);
}
async function ensureWritablePath(outputPath, overwrite) {
    try {
        await fs.stat(outputPath);
        if (!overwrite) {
            throw new Error(`Output file already exists: ${outputPath}. Use --overwrite to replace it.`);
        }
    }
    catch (error) {
        if (isNotFoundError(error)) {
            return;
        }
        throw error;
    }
}
async function assertFileExists(filePath) {
    try {
        const stats = await fs.stat(filePath);
        if (!stats.isFile()) {
            throw new Error(`${filePath} is not a file.`);
        }
    }
    catch (error) {
        if (isNotFoundError(error)) {
            throw new Error(`File not found: ${filePath}`);
        }
        throw error;
    }
}
function isNotFoundError(error) {
    return Boolean(error?.code === "ENOENT");
}
function printHelp() {
    const presetList = Object.keys(ICON_PRESETS).join(", ");
    console.log(`vivaldi-icon-maker\n\n` +
        `Usage:\n` +
        `  vivaldi-icon-maker --icon black --fill #ff0000\n` +
        `  vivaldi-icon-maker --input path/to/icon.svg --stroke #00ffcc --output recolored.svg\n\n` +
        `Options:\n` +
        `  -h, --help                     Show this help message\n` +
        `  --icon <${presetList}>          Use a bundled Vivaldi icon preset\n` +
        `  -i, --input <path>             Path to an SVG file\n` +
        `  -o, --output <path>            Output path (defaults to ./output/*)\n` +
        `  -f, --fill <color>             Fill color hex or 'none'\n` +
        `  -s, --stroke <color>           Stroke color hex or 'none'\n` +
        `  --overwrite                    Replace the output file if it exists\n` +
        `  --no-preserve-fill-none        Allow replacing fill declarations set to 'none'\n` +
        `  --no-preserve-stroke-none      Allow replacing stroke declarations set to 'none'\n`);
}
void main();
