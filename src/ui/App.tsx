import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { generateIconVariants, IconVariant } from "../lib/vivaldiIconMaker.js";
import { validateColorInput } from "../lib/svgColorizer.js";
import blackPreset from "../../vivaldi-black.svg?raw";
import linePreset from "../../vivaldi-line.svg?raw";
import "./App.css";

type Preset = "black" | "line" | "custom";

interface DownloadMap {
  [name: string]: string;
}

const DEFAULT_FILL = "#ff0000";
const DEFAULT_INACTIVE_MIX = 0.5;

function App(): JSX.Element {
  const [preset, setPreset] = useState<Preset>("black");
  const [customSvg, setCustomSvg] = useState<string | null>(null);
  const [fill, setFill] = useState<string>(DEFAULT_FILL);
  const [stroke, setStroke] = useState<string>("");
  const [inactiveMix, setInactiveMix] = useState<number>(DEFAULT_INACTIVE_MIX);
  const [variants, setVariants] = useState<IconVariant[]>([]);
  const [error, setError] = useState<string | null>(null);

  const svgContent = useMemo(() => {
    if (preset === "black") {
      return blackPreset;
    }
    if (preset === "line") {
      return linePreset;
    }
    return customSvg;
  }, [preset, customSvg]);

  useEffect(() => {
    if (!svgContent) {
      setVariants([]);
      setError(preset === "custom" ? "カスタム SVG を読み込んでください" : null);
      return;
    }

    try {
      const normalizedFill = validateColorInput(fill);
      const normalizedStroke = stroke.trim()
        ? validateColorInput(stroke.trim())
        : undefined;

      const created = generateIconVariants({
        svgContent,
        fill: normalizedFill,
        stroke: normalizedStroke,
        inactiveMix,
      });

      setVariants(created);
      setError(null);
    } catch (e) {
      setVariants([]);
      setError(e instanceof Error ? e.message : "未知のエラーが発生しました");
    }
  }, [fill, stroke, inactiveMix, svgContent, preset]);

  const downloadUrls = useMemo<DownloadMap>(() => {
    const map: DownloadMap = {};
    for (const variant of variants) {
      const blob = new Blob([variant.svg], { type: "image/svg+xml" });
      map[variant.name] = URL.createObjectURL(blob);
    }
    return map;
  }, [variants]);

  useEffect(() => {
    return () => {
      Object.values(downloadUrls).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [downloadUrls]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      setCustomSvg(null);
      return;
    }

    try {
      const text = await file.text();
      setCustomSvg(text);
      setPreset("custom");
    } catch (e) {
      setError("SVG ファイルの読み込みに失敗しました");
    }
  };

  return (
    <div className="app-root">
      <header className="app-header">
        <h1>Vivaldi Icon Maker UI</h1>
        <p>コアライブラリの `generateIconVariants` を使ってプレビュー付きでアイコンを生成します。</p>
      </header>

      <section className="panel">
        <h2>入力設定</h2>
        <div className="field-group">
          <label htmlFor="preset">ソース</label>
          <select
            id="preset"
            value={preset}
            onChange={(event) => setPreset(event.target.value as Preset)}
          >
            <option value="black">プリセット: black</option>
            <option value="line">プリセット: line</option>
            <option value="custom">カスタム SVG</option>
          </select>
        </div>

        <div className="field-group">
          <label htmlFor="upload">SVG アップロード</label>
          <input id="upload" type="file" accept=".svg" onChange={handleFileChange} />
          {preset === "custom" && !svgContent && (
            <p className="helper">SVG ファイルを選択してください。</p>
          )}
        </div>

        <div className="field-group color-field">
          <label htmlFor="fill">ベースカラー</label>
          <input
            id="fill"
            type="color"
            value={fill}
            onChange={(event) => setFill(event.target.value)}
          />
          <input
            type="text"
            value={fill}
            onChange={(event) => setFill(event.target.value)}
            className="hex-input"
          />
        </div>

        <div className="field-group">
          <label htmlFor="stroke">ストローク</label>
          <input
            id="stroke"
            type="text"
            placeholder="#000000 または none"
            value={stroke}
            onChange={(event) => setStroke(event.target.value)}
          />
          <p className="helper">空欄でストローク無し。</p>
        </div>

        <div className="field-group">
          <label htmlFor="inactiveMix">非活性強度: {inactiveMix.toFixed(2)}</label>
          <input
            id="inactiveMix"
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={inactiveMix}
            onChange={(event) => setInactiveMix(Number(event.target.value))}
          />
        </div>

        {error && <p className="error">{error}</p>}
      </section>

      <section className="panel">
        <h2>プレビュー</h2>
        {variants.length === 0 ? (
          <p>表示するアイコンがありません。</p>
        ) : (
          <div className="preview-grid">
            {variants.map((variant) => (
              <div key={variant.name} className="preview-card">
                <h3>{variant.name}</h3>
                <div
                  className="preview-svg"
                  dangerouslySetInnerHTML={{ __html: variant.svg }}
                />
                <a
                  className="download-button"
                  href={downloadUrls[variant.name]}
                  download={`vivaldi-${variant.name}.svg`}
                >
                  ダウンロード
                </a>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default App;
