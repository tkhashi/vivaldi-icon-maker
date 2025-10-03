# Vivaldi Icon Maker Core Library

`src/lib` 以下には Vivaldi SVG を再着色するための再利用可能なユーティリティがまとまっています。CLI や React UI から同じ API を呼び出せる形で設計されています。

## 主なエクスポート

```ts
import { generateIconVariants } from "./lib/vivaldiIconMaker.js";
```

### `generateIconVariants(options)`

| 引数 | 型 | 必須 | 説明 |
| --- | --- | --- | --- |
| `svgContent` | `string` | ✓ | 入力となる SVG の文字列 |
| `fill` | `string` |  | 塗りつぶし色 (`#rrggbb`/`#rgba`/`none`) |
| `stroke` | `string` |  | ストローク色 (`#rrggbb`/`#rgba`/`none`) |
| `preserveFillNone` | `boolean` |  | `fill="none"` を維持するか（既定 `true`） |
| `preserveStrokeNone` | `boolean` |  | `stroke="none"` を維持するか（既定 `true`） |
| `generateInactive` | `boolean` |  | 非活性版を生成するか（既定 `true`） |
| `inactiveMix` | `number` |  | 非活性時のパステル変換強度 0–1（既定 `0.5`） |
| `inactiveCornerRadius` | `number` |  | 角丸背景の半径（既定 `6`） |
| `inactiveBackgroundInsetRatio` | `number` |  | 背景矩形のインセット割合 0–0.9（既定 `0.1`） |

戻り値は `IconVariant[]`。各要素は以下のフィールドを持ちます。

```ts
interface IconVariant {
  name: "active" | "inactive" | string;
  svg: string;              // 生成済み SVG
  fill?: string;            // 適用された塗りつぶし色
  stroke?: string;          // 適用されたストローク色
  backgroundColor?: string; // 非活性背景に使われた色
}
```

### 使用例

```ts
import { readFileSync, writeFileSync } from "fs";
import { generateIconVariants } from "./lib/vivaldiIconMaker.js";

const source = readFileSync("./vivaldi-black.svg", "utf8");
const variants = generateIconVariants({
  svgContent: source,
  fill: "#ff3300",
  inactiveMix: 0.4,
});

for (const variant of variants) {
  writeFileSync(`./output/vivaldi-${variant.name}.svg`, variant.svg, "utf8");
}
```

## 関連 UI

GitHub Pages 上で React UI を動かしています。ライブラリの挙動をブラウザから確認したい場合に利用できます。

- https://tkhashi.github.io/vivaldi-icon-maker/

## サポートユーティリティ

- `svgColorizer.ts` – `recolorVivaldiSvg` と `validateColorInput`
- `colorTransforms.ts` – 非活性色や背景色の生成ロジック、比率の clamp

これらも必要に応じて直接インポートできます。

## ビルド

ライブラリ単体で利用したい場合は、プロジェクトルートで `npm run build` を実行すると `dist/lib/*.js` が生成されます。ESM としてインポートできます。

```bash
npm run build
# → dist/lib/vivaldiIconMaker.js などが生成される
```

## ライセンス

MIT
